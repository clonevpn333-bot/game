/* ============================================================
   AMONG US 3D — GAME CORE
   First-person controller, round flow, kills, tasks, vents,
   sabotages, meetings, win conditions and P2P synchronisation.
   ============================================================ */
(function (AU) {
'use strict';

var T = window.THREE;
function $(id) { return document.getElementById(id); }
function rnd(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a[rnd(a.length)]; }
function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
  return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

var G = {
  running: false,
  phase: 'none',        // 'play' | 'meeting' | 'end'
  time: 0,
  players: [],
  bodies: [],
  doorLog: [],
  posLog: [],           // sparse history for the Detective
  settings: null,
  roleSettings: null,
  isHost: true,
  online: false,
  selfId: 'me',
  sabotage: null,
  sabotageCd: 0,
  camsActive: false,
  yaw: 0, pitch: 0,
  keys: {},
  ventOpen: {}
};

/* ============================================================
   SETUP
   ============================================================ */
function initRenderer() {
  if (G.renderer) return;
  var vp = $('viewport');
  G.renderer = new T.WebGLRenderer({ antialias: AU.Save.p.client.quality !== 'low', powerPreference: 'high-performance' });
  G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, AU.Save.p.client.quality === 'high' ? 2 : 1.35));
  G.renderer.setSize(window.innerWidth, window.innerHeight);
  vp.appendChild(G.renderer.domElement);
  G.scene = new T.Scene();
  G.camera = new T.PerspectiveCamera(AU.Save.p.client.fov, window.innerWidth / window.innerHeight, 0.05, 400);
  window.addEventListener('resize', function () {
    if (!G.renderer) return;
    G.renderer.setSize(window.innerWidth, window.innerHeight);
    G.camera.aspect = window.innerWidth / window.innerHeight;
    G.camera.updateProjectionMatrix();
  });
}

G.applyClientSettings = function () {
  var c = AU.Save.p.client;
  if (G.camera) { G.camera.fov = c.fov; G.camera.updateProjectionMatrix(); }
  if (G.renderer) G.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, c.quality === 'high' ? 2 : 1.35));
  AU.Audio.applyVolumes();
};

/* ============================================================
   TASK POOL
   ============================================================ */
function roomSlot(world, roomId) {
  world._slots = world._slots || {};
  world._slots[roomId] = (world._slots[roomId] || 0) + 1;
  return world._slots[roomId] - 1;
}

function makeTask(def, map, world) {
  var steps = [];
  function addStep(roomId, mini, extra) {
    var key = def.id + '@' + roomId + '#' + steps.length;
    var cons = world.consoles[key] || world.addConsole(key, roomId, def.name, roomSlot(world, roomId));
    var s = { room: roomId, key: key, mini: mini || def.mini };
    if (extra) for (var k in extra) s[k] = extra[k];
    steps.push(s);
  }
  if (def.pick) {
    var rooms = shuffle(def.rooms.slice()).slice(0, def.pick);
    rooms.forEach(function (r) { addStep(r); });
  } else {
    def.steps.forEach(function (st, i) {
      var roomId = st.room || pick(st.pick1);
      var extra = {};
      if (def.id === 'divert' || def.id === 'divertM') {
        if (i === 0) {
          var target = pick(def.accept || ['reactor']);
          var R = AU.roomOf(map, target);
          extra.divertRoom = R ? R.name : 'Reactor';
          extra.divertList = shuffle((def.accept || []).map(function (rr) {
            var RR = AU.roomOf(map, rr); return RR ? RR.name : rr;
          }).slice(0, 6).concat([extra.divertRoom])).filter(function (v, ix, arr) { return arr.indexOf(v) === ix; });
          extra.acceptRoom = target;
        }
      }
      addStep(roomId, st.mini, extra);
    });
    /* Divert Power's second half happens in the room that receives it */
    if ((def.id === 'divert' || def.id === 'divertM') && steps.length === 1) {
      var acc = steps[0].acceptRoom;
      if (acc) {
        var key2 = def.id + '@' + acc + '#1';
        world.consoles[key2] || world.addConsole(key2, acc, def.name, roomSlot(world, acc));
        steps.push({ room: acc, key: key2, mini: def.mini, acceptStep: true });
      }
    }
  }
  return { id: def.id, name: def.name, kind: def.kind, mini: def.mini,
           visual: !!def.visual, steps: steps, progress: 0 };
}

function assignTasks(players, map, world, settings) {
  var common = map.tasks.filter(function (t) { return t.kind === 'common'; });
  var long   = map.tasks.filter(function (t) { return t.kind === 'long'; });
  var short  = map.tasks.filter(function (t) { return t.kind === 'short'; });

  /* Common tasks are the same for everybody, as in the real game. */
  var commonPicks = shuffle(common.slice()).slice(0, Math.min(settings.commonTasks, common.length));
  var commonInstances = commonPicks.map(function (d) { return makeTask(d, map, world); });

  players.forEach(function (p) {
    p.tasks = [];
    commonInstances.forEach(function (ci) {
      p.tasks.push({ id: ci.id, name: ci.name, kind: ci.kind, mini: ci.mini,
                     visual: ci.visual, steps: ci.steps, progress: 0 });
    });
    shuffle(long.slice()).slice(0, Math.min(settings.longTasks, long.length))
      .forEach(function (d) { p.tasks.push(makeTask(d, map, world)); });
    shuffle(short.slice()).slice(0, Math.min(settings.shortTasks, short.length))
      .forEach(function (d) { p.tasks.push(makeTask(d, map, world)); });
    p.totalSteps = p.tasks.reduce(function (a, t) { return a + t.steps.length; }, 0);
  });
}

/* ============================================================
   START
   ============================================================ */
G.start = function (lobby) {
  G.online = !!lobby.online;
  G.isHost = lobby.isHost;
  G.selfId = lobby.selfId;
  G.settings = JSON.parse(JSON.stringify(AU.Save.p.settings));
  G.roleSettings = JSON.parse(JSON.stringify(AU.Save.p.roleSettings));

  buildRound(lobby.players.map(function (p) {
    return { id: p.id, name: p.name, look: p.look, isBot: !!p.isBot, netId: p.netId || null };
  }));

  if (G.isHost) {
    AU.Roles.assign(G.players, G.settings, G.roleSettings);
    assignTasks(G.players, G.map, G.world, G.settings);
    if (G.online) broadcastStart();
  }
  enterPlay();
};

/* client receives the host's round */
G.startFromNet = function (payload) {
  G.online = true; G.isHost = false;
  G.selfId = payload.selfId;
  G.settings = payload.settings;
  G.roleSettings = payload.roleSettings;
  buildRound(payload.players);
  G.players.forEach(function (p) {
    var s = payload.state[p.id];
    if (!s) return;
    p.team = s.team; p.role = s.role; p.roleOpts = s.roleOpts || {};
    p.tasks = s.tasks || [];
    p.totalSteps = p.tasks.reduce(function (a, t) { return a + t.steps.length; }, 0);
  });
  /* rebuild consoles the host referenced */
  G.players.forEach(function (p) {
    p.tasks.forEach(function (t) {
      t.steps.forEach(function (st) {
        if (!G.world.consoles[st.key])
          G.world.addConsole(st.key, st.room, t.name, roomSlot(G.world, st.room));
      });
    });
  });
  enterPlay();
};

function buildRound(playerDefs) {
  initRenderer();
  if (G.world) { G.world.dispose(); G.world = null; }
  while (G.scene.children.length) G.scene.remove(G.scene.children[0]);

  G.map = AU.getMap(G.settings.map);
  G.layout = AU.Nav.build(G.map);
  G.world = new AU.World(G.scene, G.layout, AU.Save.p.client.quality);
  G.scene.background = new T.Color(0x05070f);
  G.scene.fog = new T.Fog(0x05070f, 4, AU.VISION_BASE);

  G.players = [];
  G.bodies = [];
  G.doorLog = [];
  G.posLog = [];
  G.sabotage = null;
  G.sabotageCd = 12;
  G.time = 0;
  G.meetingsUsed = {};
  G.emergencyCd = G.settings.emergencyCd;
  G.avatarGroup = new T.Group();
  G.scene.add(G.avatarGroup);
  /* a soft lamp carried by the player, so nearby surfaces read clearly and
     everything past your vision radius falls into the dark */
  G.playerLight = new T.PointLight(0xfff2dd, 0.55, AU.VISION_BASE, 1.35);
  G.scene.add(G.playerLight);

  var spawnRooms = G.map.spawnRooms || [G.map.features.spawn];
  playerDefs.forEach(function (d, i) {
    var room = G.map.features.spawn === 'multi'
      ? spawnRooms[i % spawnRooms.length]
      : G.map.features.spawn;
    var R = AU.roomOf(G.map, room) || G.map.rooms[0];
    var sameRoom = playerDefs.filter(function (o, k) {
      return (G.map.features.spawn === 'multi' ? spawnRooms[k % spawnRooms.length] : G.map.features.spawn) === room;
    }).length;
    /* keep at least ~1.8 units between neighbours so nobody starts inside someone */
    var ringR = Math.max(2.2, Math.min(Math.min(R.w, R.d) / 2 - 1.6,
                                       (1.8 * Math.max(1, sameRoom)) / (2 * Math.PI)));
    var ang = (i / playerDefs.length) * Math.PI * 2;
    var p = {
      id: d.id, name: d.name, look: d.look, isBot: d.isBot, netId: d.netId,
      x: R.x + Math.cos(ang) * ringR,
      z: R.z + Math.sin(ang) * ringR,
      facing: ang + Math.PI, alive: true, team: 'crew', role: 'crewmate', roleOpts: {},
      tasks: [], totalSteps: 0, killCd: G.settings.killCooldown, abilityCd: 0,
      venting: false, ventId: null, invisible: false, shifted: null, moving: false,
      doingTask: false, protectedUntil: 0, trackTargetId: null, trackTimer: 0,
      scientistBattery: 0, disconnected: false, spawnRoom: room
    };
    if (!G.layout.free(p.x, p.z)) {
      var alt = G.layout.randomPointIn(room, 2.2);
      p.x = alt.x; p.z = alt.z;
    }
    G.players.push(p);
  });
  G.players.forEach(function (p) { if (p.isBot) AU.AI.init(p); });
  buildAvatars();
}

function broadcastStart() {
  var base = G.players.map(function (p) {
    return { id: p.id, name: p.name, look: p.look, isBot: p.isBot, netId: p.netId };
  });
  AU.Net.peerIds().forEach(function (peerId) {
    var mine = G.players.filter(function (p) { return p.netId === peerId; })[0];
    var state = {};
    G.players.forEach(function (p) {
      var isSelf = mine && p.id === mine.id;
      var sameTeamImp = mine && mine.team === 'impostor' && p.team === 'impostor';
      state[p.id] = isSelf
        ? { team: p.team, role: p.role, roleOpts: p.roleOpts, tasks: p.tasks }
        : { team: sameTeamImp ? 'impostor' : 'crew',
            role: sameTeamImp ? p.role : 'crewmate', roleOpts: {}, tasks: [] };
    });
    AU.Net.send(peerId, { t: 'start', selfId: mine ? mine.id : base[0].id,
      settings: G.settings, roleSettings: G.roleSettings, players: base, state: state });
  });
}

function enterPlay() {
  G.running = true;
  G.phase = 'play';
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  AU.HUD.init(G);
  AU.Audio.stopMusic();
  var me = G.me();
  G.yaw = me ? me.facing : 0;
  G.pitch = 0;
  AU.HUD.showRole(me);
  bindInput();
  G.last = performance.now();
  if (!G.rafBound) { G.rafBound = true; requestAnimationFrame(loop); }
  if (G.online) AU.Net.callPeers();
};

/* ============================================================
   AVATARS
   ============================================================ */
function buildAvatars() {
  G.players.forEach(function (p) {
    if (p.mesh) G.avatarGroup.remove(p.mesh);
    p.mesh = AU.Models.buildCrewmate(p.look, {});
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.rotation.y = p.facing;
    var pet = AU.Models.buildPet(p.look);
    if (pet) pet.position.set(p.x, 0, p.z);
    if (pet) { p.petMesh = pet; G.avatarGroup.add(pet); }
    G.avatarGroup.add(p.mesh);
    p.tag = AU.textSprite(p.name, '#ffffff', 1.65);
    p.tag.position.y = AU.Models.HEIGHT + 0.42;
    p.mesh.add(p.tag);
    p.ghostMesh = null;
  });
}
function refreshAvatar(p) {
  if (p.mesh) G.avatarGroup.remove(p.mesh);
  var look = p.shifted || p.look;
  p.mesh = AU.Models.buildCrewmate(look, {});
  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.facing;
  G.avatarGroup.add(p.mesh);
  p.tag = AU.textSprite(p.shifted ? p.shiftedName : p.name, '#ffffff', 1.65);
  p.tag.position.y = AU.Models.HEIGHT + 0.42;
  p.mesh.add(p.tag);
}
function makeGhost(p) {
  if (p.mesh) { G.avatarGroup.remove(p.mesh); p.mesh = null; }
  if (p.petMesh) { G.avatarGroup.remove(p.petMesh); p.petMesh = null; }
  p.ghostMesh = AU.Models.buildGhost(p.look);
  p.ghostMesh.position.set(p.x, 0.7, p.z);
  p.ghostMesh.rotation.y = p.facing;
  G.avatarGroup.add(p.ghostMesh);
  animOf(p).spawn = 0;
}

/* ============================================================
   INPUT
   ============================================================ */
function bindInput() {
  if (G.inputBound) return;
  G.inputBound = true;
  var canvas = G.renderer.domElement;

  canvas.addEventListener('click', function () {
    if (G.phase === 'play' && !AU.Tasks.isOpen() && !AU.HUD.mapOpen && !G.paused) {
      canvas.requestPointerLock && canvas.requestPointerLock();
    }
    AU.Audio.resume();
  });
  document.addEventListener('mousemove', function (e) {
    if (document.pointerLockElement !== canvas) return;
    var s = AU.Save.p.client.sensitivity * 0.0022;
    G.yaw   -= e.movementX * s;
    G.pitch -= e.movementY * s;
    G.pitch = Math.max(-1.2, Math.min(1.2, G.pitch));
  });
  document.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    G.keys[e.code] = true;
    handleKey(e);
  });
  document.addEventListener('keyup', function (e) {
    G.keys[e.code] = false;
    if (e.code === 'KeyV' && AU.Save.p.client.pushToTalk) AU.Net.setMicEnabled(false);
  });
  setupTouch(canvas);
}

/* ---- touch: left stick to move, right half to look ---- */
function setupTouch(canvas) {
  if (!window.matchMedia || !window.matchMedia('(pointer:coarse)').matches) return;
  G.touch = { x: 0, y: 0 };
  var stick = document.createElement('div');
  stick.id = 'touch-stick';
  stick.className = 'mobile-only';
  var knob = document.createElement('div');
  knob.id = 'touch-knob';
  stick.appendChild(knob);
  document.getElementById('hud').appendChild(stick);
  var stickId = null, lookId = null, lastLook = null, origin = null;

  function onStart(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.clientX < window.innerWidth * 0.45 && stickId === null) {
        stickId = t.identifier;
        var r = stick.getBoundingClientRect();
        origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        move(t);
      } else if (lookId === null) {
        lookId = t.identifier;
        lastLook = { x: t.clientX, y: t.clientY };
      }
    }
  }
  function move(t) {
    var dx = t.clientX - origin.x, dy = t.clientY - origin.y;
    var d = Math.min(55, Math.hypot(dx, dy)) || 0;
    var a = Math.atan2(dy, dx);
    knob.style.left = (40 + Math.cos(a) * d) + 'px';
    knob.style.top = (40 + Math.sin(a) * d) + 'px';
    G.touch.x = Math.cos(a) * (d / 55);
    G.touch.y = Math.sin(a) * (d / 55);
  }
  function onMove(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === stickId) { move(t); e.preventDefault(); }
      else if (t.identifier === lookId) {
        var s = AU.Save.p.client.sensitivity * 0.006;
        G.yaw -= (t.clientX - lastLook.x) * s;
        G.pitch -= (t.clientY - lastLook.y) * s;
        G.pitch = Math.max(-1.2, Math.min(1.2, G.pitch));
        lastLook = { x: t.clientX, y: t.clientY };
        e.preventDefault();
      }
    }
  }
  function onEnd(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var t = e.changedTouches[i];
      if (t.identifier === stickId) {
        stickId = null; G.touch.x = 0; G.touch.y = 0;
        knob.style.left = '40px'; knob.style.top = '40px';
      } else if (t.identifier === lookId) lookId = null;
    }
  }
  document.addEventListener('touchstart', onStart, { passive: false });
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onEnd);
  document.addEventListener('touchcancel', onEnd);
}

function handleKey(e) {
  if (G.phase !== 'play' && e.code !== 'Escape' && e.code !== 'KeyT') return;
  switch (e.code) {
    case 'KeyE': G.tryUse(); break;
    case 'KeyQ': G.tryKill(); break;
    case 'KeyR': G.tryReport(); break;
    case 'KeyF': G.tryVent(); break;
    case 'KeyC': G.tryAbility(); break;
    case 'Tab':  e.preventDefault(); AU.HUD.toggleMap('normal'); break;
    case 'KeyM': if (AU.Roles.canSabotage(G.me())) AU.HUD.toggleMap('sabotage'); break;
    case 'KeyV':
      if (AU.Save.p.client.pushToTalk) AU.Net.setMicEnabled(true);
      else G.toggleMic();
      break;
    case 'KeyT':
      var gi = $('ghost-chat-input');
      if (gi && $('ghost-chat').classList.contains('on')) gi.focus();
      break;
    case 'Escape': G.togglePause(); break;
  }
}

G.toggleMic = function () {
  if (!AU.Net.micStream) {
    AU.Net.requestMic(function (okv) {
      AU.HUD.toast(okv ? 'Microphone on' : 'Microphone unavailable', 2);
    });
    return;
  }
  AU.Net.setMicEnabled(!AU.Net.micEnabled);
  AU.HUD.toast(AU.Net.micEnabled ? 'Mic on' : 'Mic muted', 1.4);
};

/* ============================================================
   HELPERS
   ============================================================ */
G.me = function () {
  for (var i = 0; i < G.players.length; i++) if (G.players[i].id === G.selfId) return G.players[i];
  return G.players[0];
};
G.byId = function (id) {
  for (var i = 0; i < G.players.length; i++) if (G.players[i].id === id) return G.players[i];
  return null;
};
G.playerSpeed = function () { return AU.BASE_SPEED * (G.settings.playerSpeed || 1); };
G.commsDown = function () { return !!(G.sabotage && G.sabotage.def.id === 'comms'); };
G.taskBarValue = function () {
  var mode = G.settings.taskBar;
  if (mode === 'never') return 0;
  if (mode === 'meetings') return G.taskBarSnapshot || 0;
  return computeTaskProgress();
};
function computeTaskProgress() {
  var done = 0, total = 0;
  G.players.forEach(function (p) {
    if (p.team === 'impostor') return;
    total += p.totalSteps;
    p.tasks.forEach(function (t) { done += Math.min(t.progress, t.steps.length); });
  });
  return total ? done / total : 0;
}
G.nearStation = function (kind) {
  var st = G.world.stations[kind];
  if (!st) return false;
  var me = G.me();
  return Math.hypot(me.x - st.x, me.z - st.z) < 3.2;
};
G.locationAt = function (playerId, time) {
  var best = null;
  for (var i = G.posLog.length - 1; i >= 0; i--) {
    var e = G.posLog[i];
    if (e.id !== playerId) continue;
    if (e.t <= time) { best = e; break; }
    best = e;
  }
  return best ? best.room : null;
};

/* ============================================================
   MAIN LOOP
   ============================================================ */
function loop(now) {
  requestAnimationFrame(loop);
  var dt = Math.min(0.06, (now - G.last) / 1000);
  G.last = now;
  if (!G.running) return;

  if (G.phase === 'play' && !G.paused) {
    stepPlay(dt);
  } else if (G.phase === 'meeting') {
    AU.Meeting.tick(dt);
    tickBotVotes(dt);
  }
  updateAvatars(dt);
  G.world.updateDoors(dt);
  G.world.updateVents(dt, G.ventOpen);
  G.world.updateEffects(dt);
  updateCamera(dt);
  updateVoiceVolumes();
  if (G.phase !== 'end') AU.HUD.update(dt);
  if (G.online) netTick(dt);
  G.renderer.render(G.scene, G.camera);
}

function stepPlay(dt) {
  G.time += dt;
  var me = G.me();

  /* local movement */
  if (me && !AU.Tasks.isOpen() && !AU.HUD.mapOpen) movePlayer(me, dt);
  if (me) {
    me.killCd = Math.max(0, me.killCd - dt);
    me.abilityCd = Math.max(0, me.abilityCd - dt);
    if (me.trackTimer > 0) me.trackTimer -= dt;
    if (me.role === 'scientist' && me.scientistBattery > 0) me.scientistBattery -= dt;
  }
  G.emergencyCd = Math.max(0, G.emergencyCd - dt);
  G.sabotageCd = Math.max(0, G.sabotageCd - dt);

  /* host simulates bots and the world */
  if (G.isHost) {
    G.players.forEach(function (p) {
      if (!p.isBot) {
        p.killCd = Math.max(0, p.killCd - dt);
        p.abilityCd = Math.max(0, p.abilityCd - dt);
        return;
      }
      p.killCd = Math.max(0, p.killCd - dt);
      p.abilityCd = Math.max(0, p.abilityCd - dt);
      AU.AI.update(p, dt, G);
    });
    updateSabotage(dt);
    updateBodies(dt);
    checkWin();
  }

  /* position log for the Detective + MIRA door log */
  G.logTimer = (G.logTimer || 0) - dt;
  if (G.logTimer <= 0) {
    G.logTimer = 1.0;
    G.players.forEach(function (p) {
      if (!p.alive) return;
      var r = G.layout.roomAt(p.x, p.z);
      var name = r ? r.name : 'Hallway';
      G.posLog.push({ id: p.id, t: G.time, room: name });
      if (p.lastRoomName !== name && r) {
        p.lastRoomName = name;
        G.doorLog.push({ t: G.time, name: p.name, color: p.look.color, room: name });
        if (G.doorLog.length > 200) G.doorLog.shift();
      }
    });
    if (G.posLog.length > 4000) G.posLog.splice(0, 1000);
  }

  computeTargets();
  updateShiftAndVanish(dt);
  applyVision();
}

/* ---------------- movement ---------------- */
function movePlayer(p, dt) {
  if (p.venting) { p.moving = false; return; }
  var f = 0, s = 0;
  if (G.keys.KeyW || G.keys.ArrowUp) f += 1;
  if (G.keys.KeyS || G.keys.ArrowDown) f -= 1;
  if (G.keys.KeyA || G.keys.ArrowLeft) s -= 1;
  if (G.keys.KeyD || G.keys.ArrowRight) s += 1;
  if (G.touch && (G.touch.x || G.touch.y)) { f = -G.touch.y; s = G.touch.x; }
  var len = Math.hypot(f, s);
  p.moving = len > 0.05;
  if (!p.moving) return;
  f /= len; s /= len;
  var speed = G.playerSpeed() * (p.alive ? 1 : 1.25);
  var sin = Math.sin(G.yaw), cos = Math.cos(G.yaw);
  var vx = (f * sin + s * cos) * speed;
  var vz = (f * cos - s * sin) * speed;
  var nx = p.x + vx * dt, nz = p.z + vz * dt;
  if (!p.alive) { p.x = nx; p.z = nz; p.facing = Math.atan2(vx, vz); return; }  /* ghosts pass through walls */
  if (G.layout.free(nx, nz) && !G.world.doorBlocks(nx, nz, AU.PLAYER_RADIUS)) { p.x = nx; p.z = nz; }
  else {
    if (G.layout.free(nx, p.z) && !G.world.doorBlocks(nx, p.z, AU.PLAYER_RADIUS)) p.x = nx;
    if (G.layout.free(p.x, nz) && !G.world.doorBlocks(p.x, nz, AU.PLAYER_RADIUS)) p.z = nz;
  }
  p.facing = Math.atan2(vx, vz);
  G.stepTimer = (G.stepTimer || 0) - dt;
  if (G.stepTimer <= 0) { G.stepTimer = 0.36; AU.Audio.play('step'); }
}

/* ---------------- camera ---------------- */
function updateCamera(dt) {
  var me = G.me();
  if (!me) return;
  G.shake = Math.max(0, (G.shake || 0) - dt * 2.6);
  var third = AU.Save.p.client.thirdPerson;
  var bob = 0;
  if (AU.Save.p.client.headBob && me.moving && me.alive) {
    G.bobT = (G.bobT || 0) + dt * 9;
    bob = Math.sin(G.bobT) * 0.045;
  }
  var eye = AU.EYE_HEIGHT + bob + (me.alive ? 0 : 0.35);
  if (me.venting) eye = 0.35;
  var sh = G.shake || 0;
  var shx = (Math.random() - 0.5) * sh * 0.5;
  var shy = (Math.random() - 0.5) * sh * 0.5;
  if (third) {
    var back = 4.2, up = 2.4;
    var cx = me.x - Math.sin(G.yaw) * back;
    var cz = me.z - Math.cos(G.yaw) * back;
    G.camera.position.set(cx + shx, eye + up + shy, cz);
    G.camera.lookAt(me.x, eye + 0.4, me.z);
  } else {
    G.camera.position.set(me.x + shx, eye + shy, me.z);
    var dir = new T.Vector3(Math.sin(G.yaw) * Math.cos(G.pitch), Math.sin(G.pitch), Math.cos(G.yaw) * Math.cos(G.pitch));
    G.camera.lookAt(G.camera.position.x + dir.x, G.camera.position.y + dir.y, G.camera.position.z + dir.z);
    /* roll must be composed onto the look-at orientation — assigning
       rotation.z directly flips the camera when the Euler is degenerate */
    var roll = Math.sin(G.time * 13) * sh * 0.02 +
      (AU.Save.p.client.headBob && me.moving && me.alive ? Math.sin((G.bobT || 0) * 0.5) * 0.012 : 0);
    if (roll) G.camera.rotateZ(roll);
  }
}

/* ---------------- avatars & animation ---------------- */
function animOf(p) {
  if (!p.anim) p.anim = { phase: 0, speed: 0, bob: 0, lean: 0, vent: 0, kill: 0,
                          shift: 0, task: 0, lastX: p.x, lastZ: p.z, spawn: 0 };
  return p.anim;
}

function updateAvatars(dt) {
  var me = G.me();
  var third = AU.Save.p.client.thirdPerson;

  G.players.forEach(function (p) {
    var a = animOf(p);

    /* measured speed drives the whole walk cycle */
    var moved = Math.hypot(p.x - a.lastX, p.z - a.lastZ);
    a.lastX = p.x; a.lastZ = p.z;
    var inst = dt > 0 ? moved / dt : 0;
    a.speed += (Math.min(inst, 12) - a.speed) * Math.min(1, dt * 10);
    var walk = Math.min(1, a.speed / (AU.BASE_SPEED * (G.settings.playerSpeed || 1)));

    /* transitions */
    a.vent += ((p.venting ? 1 : 0) - a.vent) * Math.min(1, dt * 11);
    a.task += ((p.doingTask && p.alive ? 1 : 0) - a.task) * Math.min(1, dt * 7);
    a.kill = Math.max(0, a.kill - dt * 3.2);
    a.shift = Math.max(0, a.shift - dt * 2.2);
    a.spawn = Math.min(1, a.spawn + dt * 2.5);
    a.phase += dt * (4.2 + walk * 7.4);

    var mesh = p.alive ? p.mesh : p.ghostMesh;
    if (!mesh) return;

    /* position: snap for big jumps (vents, meetings), otherwise ease */
    var far = Math.hypot(p.x - mesh.position.x, p.z - mesh.position.z) > 6;
    var k = far ? 1 : Math.min(1, dt * 14);
    mesh.position.x += (p.x - mesh.position.x) * k;
    mesh.position.z += (p.z - mesh.position.z) * k;

    /* facing, shortest way round */
    var diff = ((p.facing - mesh.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    mesh.rotation.y += diff * Math.min(1, dt * (p.alive ? 11 : 5));

    if (p.alive) {
      var bob = Math.sin(a.phase * 2) * 0.055 * walk;
      var breathe = Math.sin(a.phase * 0.45) * 0.012 * (1 - walk);
      var lunge = Math.sin(a.kill * Math.PI) * 0.35;
      var sink = a.vent * 1.05;

      mesh.position.y = bob + (1 - a.spawn) * 1.4 - sink;
      mesh.rotation.z = Math.sin(a.phase) * 0.055 * walk;
      mesh.rotation.x = walk * 0.05 + a.task * 0.22 + lunge * 0.5;

      /* squash and stretch: on each footfall, and hard while venting */
      var squash = 1 + Math.sin(a.phase * 2 + Math.PI / 2) * 0.035 * walk + breathe;
      var ventScale = 1 - a.vent;
      var shiftPulse = 1 + Math.sin(a.shift * Math.PI * 3) * 0.18 * a.shift;
      mesh.scale.set(ventScale * (2 - squash) * shiftPulse * a.spawn,
                     ventScale * squash * shiftPulse * a.spawn,
                     ventScale * (2 - squash) * shiftPulse * a.spawn);

      /* stub legs swing, and plant when standing still */
      if (mesh.userData.legs) {
        var swing = Math.sin(a.phase) * (0.14 + walk * 0.42);
        mesh.userData.legs.children.forEach(function (l) {
          var side = l.userData.side || 1;
          l.rotation.x = swing * side;
          l.position.y = Math.max(0, Math.sin(a.phase + (side > 0 ? 0 : Math.PI))) * 0.07 * walk;
        });
      }
      /* arms swing opposite the legs, and swing wider the faster you go */
      if (mesh.userData.arms) {
        var aswing = Math.sin(a.phase + Math.PI) * (0.10 + walk * 0.55);
        mesh.userData.arms.children.forEach(function (arm) {
          var side = arm.userData.side || 1;
          arm.rotation.x = aswing * side + a.task * -1.05 + lunge * 1.5;
          arm.rotation.z = (arm.userData.restZ || 0) + side * (walk * 0.14 - a.task * 0.30);
        });
      }
      /* the hat lags a beat behind the body — reads as weight */
      if (mesh.userData.hat) {
        mesh.userData.hat.rotation.z = -Math.sin(a.phase) * 0.09 * walk;
        mesh.userData.hat.rotation.x = -walk * 0.06 - lunge * 0.3;
      }
    } else {
      /* ghosts drift, sway and bob */
      mesh.position.y = 0.72 + Math.sin(G.time * 1.7 + p.x * 0.4) * 0.16;
      mesh.rotation.z = Math.sin(G.time * 1.1 + p.z * 0.3) * 0.09;
      mesh.rotation.x = Math.sin(G.time * 0.9) * 0.05;
      var gs = 1 + Math.sin(G.time * 1.4 + p.x) * 0.02;
      mesh.scale.set(gs, 1 / gs, gs);
    }

    /* visibility */
    var visible = true;
    if (p === me && !third) visible = false;
    if (p.venting && a.vent > 0.92) visible = false;
    if (p.invisible && !(me.team === 'impostor' || !me.alive)) visible = false;
    if (!p.alive && me.alive) visible = false;              /* the living can't see ghosts */
    mesh.visible = visible;

    /* nametags only within vision and line of sight */
    if (p.tag) {
      var d = Math.hypot(p.x - me.x, p.z - me.z);
      p.tag.visible = visible && p !== me && d < visionRange() * 0.85 &&
        G.layout.lineClear(me.x, me.z, p.x, p.z);
      p.tag.position.y = AU.Models.HEIGHT + 0.42 + Math.sin(G.time * 2 + p.x) * 0.03;
    }

    /* pets trot along behind, hopping in time */
    if (p.petMesh) {
      var bx = p.x - Math.sin(p.facing) * 1.15, bz = p.z - Math.cos(p.facing) * 1.15;
      var pd = Math.hypot(bx - p.petMesh.position.x, bz - p.petMesh.position.z);
      p.petMesh.position.x += (bx - p.petMesh.position.x) * Math.min(1, dt * 5.5);
      p.petMesh.position.z += (bz - p.petMesh.position.z) * Math.min(1, dt * 5.5);
      var hop = p.petMesh.userData.float
        ? 0.5 + Math.sin(G.time * 3) * 0.09
        : Math.abs(Math.sin(a.phase * 1.6)) * 0.13 * Math.min(1, pd);
      p.petMesh.position.y = hop;
      var pdiff = ((p.facing - p.petMesh.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      p.petMesh.rotation.y += pdiff * Math.min(1, dt * 6);
      p.petMesh.rotation.z = Math.sin(a.phase * 1.6) * 0.07;
      p.petMesh.visible = visible && p.alive && a.vent < 0.5;
    }

    /* guardian shield */
    if (p.protectedUntil > G.time) {
      if (!p.shieldMesh) {
        p.shieldMesh = new T.Mesh(new T.SphereGeometry(1.1, 18, 14),
          new T.MeshBasicMaterial({ color: 0x7FE8FF, transparent: true, opacity: 0.22, side: T.DoubleSide }));
        G.avatarGroup.add(p.shieldMesh);
      }
      p.shieldMesh.position.set(p.x, 0.95, p.z);
      var pulse = 1 + Math.sin(G.time * 3.4) * 0.05;
      p.shieldMesh.scale.setScalar(pulse);
      p.shieldMesh.material.opacity = 0.16 + Math.sin(G.time * 3.4) * 0.07;
      p.shieldMesh.visible = true;
    } else if (p.shieldMesh) p.shieldMesh.visible = false;
  });

  /* bodies settle onto the floor, and Viper kills melt away */
  G.bodies.forEach(function (b) {
    if (!b.mesh) {
      b.mesh = AU.Models.buildDeadBody(b.look);
      b.mesh.position.set(b.x, 0.9, b.z);
      b.mesh.rotation.y = b.facing || 0;
      b.settle = 0;
      G.scene.add(b.mesh);
    }
    if (b.settle < 1) {
      b.settle = Math.min(1, b.settle + dt * 4);
      var e = 1 - Math.pow(1 - b.settle, 3);
      b.mesh.position.y = 0.9 * (1 - e);
      b.mesh.scale.set(1 + (1 - e) * 0.2, 1 - (1 - e) * 0.35, 1 + (1 - e) * 0.2);
    }
    b.mesh.visible = !b.reported && !b.dissolved;
    if (b.dissolving) {
      b.mesh.scale.setScalar(Math.max(0.02, b.dissolveT));
      b.mesh.position.y = -(1 - b.dissolveT) * 0.4;
      b.mesh.rotation.y += dt * 0.4;
    }
  });
}

function visionRange() {
  var me = G.me();
  if (!me) return AU.VISION_BASE;
  if (!me.alive) return AU.VISION_BASE * 3;
  var mult = me.team === 'impostor' ? G.settings.impVision : G.settings.crewVision;
  if (G.sabotage && G.sabotage.def.id === 'lights' && me.team !== 'impostor') mult *= 0.32;
  return AU.VISION_BASE * mult;
}
function applyVision() {
  var r = visionRange();
  G.scene.fog.far = r;
  G.scene.fog.near = Math.max(1, r * 0.25);
  var me = G.me();
  if (G.playerLight && me) {
    G.playerLight.position.set(me.x, 1.45, me.z);
    G.playerLight.distance = r * 0.95;
    G.playerLight.intensity = (G.sabotage && G.sabotage.def.id === 'lights' &&
      me.team !== 'impostor') ? 0.30 : 0.55;
  }
}

/* ============================================================
   INTERACTION TARGETS
   ============================================================ */
function computeTargets() {
  var me = G.me();
  G.useTarget = null; G.killTarget = null; G.reportTarget = null;
  G.ventTarget = null; G.nearConsole = null; G.shiftTarget = null;

  if (!me) return;
  var bestD = Infinity;

  /* task console */
  if (me.alive || me.team === 'crew') {
    me.tasks.forEach(function (t) {
      if (t.progress >= t.steps.length) return;
      var step = t.steps[t.progress];
      var c = G.world.consoles[step.key];
      if (!c) return;
      var d = Math.hypot(c.x - me.x, c.z - me.z);
      if (d < AU.USE_RANGE + 0.6 && d < bestD) {
        bestD = d;
        G.nearConsole = c;
        G.useTarget = { kind: 'task', task: t, step: step, console: c };
      }
    });
  }

  /* special stations */
  for (var k in G.world.stations) {
    var st = G.world.stations[k];
    var d2 = Math.hypot(st.x - me.x, st.z - me.z);
    if (d2 < 3.0 && d2 < bestD) {
      if (k === 'emergency') {
        if (me.alive) { bestD = d2; G.useTarget = { kind: 'emergency', station: st }; }
      } else {
        bestD = d2; G.useTarget = { kind: k, station: st };
      }
    }
  }

  /* sabotage fix point */
  if (G.sabotage && me.alive) {
    (G.sabotage.def.rooms || []).forEach(function (rid) {
      if (G.sabotage.fixedRooms && G.sabotage.fixedRooms[rid]) return;
      var R = AU.roomOf(G.map, rid);
      if (!R) return;
      var d3 = Math.hypot(R.x - me.x, R.z - me.z);
      if (d3 < 4.5 && d3 < bestD + 1) { bestD = d3; G.useTarget = { kind: 'fix', room: rid }; }
    });
  }

  /* vents */
  if (AU.Roles.canVent(me) && me.alive && !me.venting) {
    G.world.vents.forEach(function (v) {
      var d4 = Math.hypot(v.x - me.x, v.z - me.z);
      if (d4 < 1.8) G.ventTarget = v;
    });
  }

  /* bodies */
  if (me.alive) {
    G.bodies.forEach(function (b) {
      if (b.reported || b.dissolved) return;
      if (Math.hypot(b.x - me.x, b.z - me.z) < AU.REPORT_RANGE) G.reportTarget = b;
    });
  }

  /* kill target */
  if (AU.Roles.canKill(me) && !me.venting) {
    var range = AU.KILL_RANGES[G.settings.killDistance] || 1.6;
    var best = null, bd = Infinity;
    G.players.forEach(function (p) {
      if (p === me || !p.alive || p.team === 'impostor') return;
      var d5 = Math.hypot(p.x - me.x, p.z - me.z);
      if (d5 < range + 0.4 && d5 < bd && G.layout.lineClear(me.x, me.z, p.x, p.z)) { bd = d5; best = p; }
    });
    G.killTarget = best;
  }

  /* shapeshift target */
  if (me.role === 'shapeshifter' && me.alive && !me.shifted) {
    var bt = null, btd = Infinity;
    G.players.forEach(function (p) {
      if (p === me || !p.alive) return;
      var d6 = Math.hypot(p.x - me.x, p.z - me.z);
      if (d6 < 3.0 && d6 < btd) { btd = d6; bt = p; }
    });
    G.shiftTarget = bt;
  }

  /* guardian angel target */
  if (!me.alive && me.ghostRole === 'guardian') {
    var gt = null, gd = Infinity;
    G.players.forEach(function (p) {
      if (!p.alive) return;
      var d7 = Math.hypot(p.x - me.x, p.z - me.z);
      if (d7 < 4 && d7 < gd) { gd = d7; gt = p; }
    });
    if (gt) G.useTarget = { kind: 'protect', player: gt };
  }

  /* highlight the console we're standing at */
  for (var key in G.world.consoles) {
    var c2 = G.world.consoles[key];
    var mine = G.useTarget && G.useTarget.kind === 'task' && G.useTarget.console === c2;
    var isMyTask = me.tasks.some(function (t) {
      return t.progress < t.steps.length && t.steps[t.progress].key === key;
    });
    G.world.setConsoleActive(key, isMyTask, false);
    if (mine) c2.glow.material.opacity = 0.45;
  }
}

/* ============================================================
   ACTIONS
   ============================================================ */
G.tryUse = function () {
  var me = G.me(), u = G.useTarget;
  if (!u) return;
  AU.Audio.play('click');
  switch (u.kind) {
    case 'task': openTask(u.task, u.step); break;
    case 'emergency': callEmergency(); break;
    case 'admin': AU.HUD.openMap('admin'); break;
    case 'cams': AU.HUD.openMap('cams'); break;
    case 'vitals': AU.HUD.openMap('vitals'); break;
    case 'doorlog': AU.HUD.openMap('doorlog'); break;
    case 'fix': openSabotageFix(u.room); break;
    case 'protect': doProtect(me, u.player); break;
  }
};

function openTask(task, step) {
  var me = G.me();
  if (me.team === 'impostor') {
    /* impostors can open the widget but it never counts */
    AU.Tasks.open({ mini: step.mini || task.mini, name: task.name, step: task.progress,
      steps: task.steps.length, look: me.look, divertRoom: step.divertRoom,
      divertList: step.divertList, acceptStep: step.acceptStep }, function () {
      AU.HUD.toast('Nothing happened. You are the Impostor.', 2);
      task.progress++;
    });
    return;
  }
  if (document.pointerLockElement) document.exitPointerLock();
  AU.Tasks.open({
    mini: step.mini || task.mini, name: task.name, step: task.progress,
    steps: task.steps.length, look: me.look, divertRoom: step.divertRoom,
    divertList: step.divertList, acceptStep: step.acceptStep
  }, function () {
    completeStep(me, task);
  });
}

function completeStep(p, task) {
  task.progress++;
  if (p.role === 'scientist') p.scientistBattery = p.roleOpts.battery || 5;
  AU.Audio.play(task.progress >= task.steps.length ? 'taskDone' : 'taskStep');
  if (G.online && !G.isHost) AU.Net.toHost({ t: 'taskstep', task: task.id });
  if (G.isHost) { G.taskBarSnapshot = computeTaskProgress(); checkWin(); }
  if (task.visual && task.progress >= task.steps.length && G.settings.visualTasks) {
    playVisual(p, task);
    AU.HUD.toast('Visual task complete — anyone watching saw that.', 2.5);
  }
};
G.completeBotStep = function (p, task) {
  task.progress++;
  if (task.visual && task.progress >= task.steps.length && G.settings.visualTasks) playVisual(p, task);
  if (G.isHost) checkWin();
};

/* Visual tasks show a beam every nearby player can see — proof of innocence. */
function playVisual(p, task) {
  var step = task.steps[task.steps.length - 1];
  var c = G.world.consoles[step.key];
  var x = c ? c.x : p.x, z = c ? c.z : p.z;
  G.world.visualEffect(x, z, task.id === 'scan' ? 0x7FE8FF :
    task.id === 'asteroids' ? 0xEF7D0D : task.id === 'shieldsT' ? 0x38FEDC : 0x50EF39, 4.5);
  AU.Audio.play(task.id === 'scan' ? 'scan' : 'fixed');
  if (G.isHost && G.online) broadcastEvent({ t: 'visual', x: x, z: z, task: task.id });
}

G.tryKill = function () {
  var me = G.me();
  if (!AU.Roles.canKill(me) || me.killCd > 0 || !G.killTarget) return;
  doKill(me, G.killTarget);
  if (G.online && !G.isHost) AU.Net.toHost({ t: 'kill', target: G.killTarget.id });
};

function doKill(killer, victim) {
  if (!victim.alive) return;
  if (victim.protectedUntil > G.time) {
    AU.HUD.toast('Blocked by a Guardian Angel shield!', 2);
    AU.Audio.play('deny');
    killer.killCd = G.settings.killCooldown;
    if (G.isHost) broadcastEvent({ t: 'shielded', id: victim.id });
    return;
  }
  victim.alive = false;
  victim.killedBy = killer.id;
  killer.killCd = G.settings.killCooldown;
  killer.x = victim.x; killer.z = victim.z;
  animOf(killer).kill = 1;
  if (killer.id === G.selfId || victim.id === G.selfId) G.shake = 1.4;
  AU.Audio.play(killer.role === 'viper' ? 'acid' : 'kill');

  var body = {
    id: 'body' + G.bodies.length, playerId: victim.id, look: victim.look,
    x: victim.x, z: victim.z, facing: victim.facing,
    room: (G.layout.roomAt(victim.x, victim.z) || {}).id || null,
    reported: false, dissolved: false, dissolving: killer.role === 'viper',
    dissolveT: 1, dissolveRate: killer.role === 'viper'
      ? 1 / (killer.roleOpts.dissolveTime || 20) : 0,
    killer: killer.id, time: G.time
  };
  G.bodies.push(body);
  makeGhost(victim);

  /* Noisemaker alert */
  if (victim.role === 'noisemaker') {
    var dur = victim.roleOpts.alertDuration || 3;
    G.noiseAlert = { x: victim.x, z: victim.z, until: G.time + dur,
      room: (G.layout.roomAt(victim.x, victim.z) || {}).name || 'somewhere' };
    AU.Audio.play('noise');
    AU.HUD.alert('NOISEMAKER ALERT — ' + G.noiseAlert.room.toUpperCase());
    setTimeout(function () { AU.HUD.alert(null); }, dur * 1000);
  }
  /* Guardian Angel promotion */
  AU.Roles.onCrewDeath(victim, G.roleSettings);

  /* witnesses raise suspicion */
  G.players.forEach(function (o) {
    if (!o.isBot || !o.alive || o === killer) return;
    if (Math.hypot(o.x - victim.x, o.z - victim.z) < 12 &&
        G.layout.lineClear(o.x, o.z, victim.x, victim.z)) {
      AU.AI.noteSighting(o, killer, 'kill');
    }
  });

  if (victim.id === G.selfId) {
    AU.HUD.toast('You were ' + (killer.role === 'viper' ? 'dissolved' : 'killed') +
      '. You are a ghost — finish your tasks!', 4);
    if (victim.ghostRole === 'guardian')
      setTimeout(function () { AU.HUD.showRole({ role: 'guardian', team: 'crew' }); }, 800);
  }
  if (G.isHost) {
    broadcastEvent({ t: 'kill', killer: killer.id, victim: victim.id, body: serialiseBody(body) });
    checkWin();
  }
}
G.doKill = doKill;

G.tryReport = function () {
  var b = G.reportTarget;
  if (!b) return;
  G.reportBody(G.me(), b);
};
G.reportBody = function (reporter, body) {
  if (body.reported) return;
  body.reported = true;
  AU.Audio.play('report');
  G.shake = 0.9;
  if (G.online && !G.isHost) { AU.Net.toHost({ t: 'report', body: body.id }); return; }
  startMeeting({ reporterId: reporter.id, bodyId: body.id, isEmergency: false,
    killTime: body.time, selfReport: body.killer === reporter.id });
};

function callEmergency() {
  var me = G.me();
  if (G.emergencyCd > 0) { AU.HUD.toast('Emergency cooldown: ' + Math.ceil(G.emergencyCd) + 's', 2); return; }
  var used = G.meetingsUsed[me.id] || 0;
  if (used >= G.settings.emergencies) { AU.HUD.toast('You have no meetings left.', 2); return; }
  if (G.sabotage && G.sabotage.critical) { AU.HUD.toast('Cannot call a meeting during a critical sabotage.', 2); return; }
  G.meetingsUsed[me.id] = used + 1;
  if (G.online && !G.isHost) { AU.Net.toHost({ t: 'emergency' }); return; }
  startMeeting({ reporterId: me.id, isEmergency: true });
}

/* ---------------- vents ---------------- */
G.tryVent = function () {
  var me = G.me();
  if (me.venting) { G.exitVent(me); return; }
  if (!G.ventTarget || !AU.Roles.canVent(me)) return;
  if (me.role === 'engineer' && me.abilityCd > 0) { AU.HUD.toast('Vent on cooldown', 1.5); return; }
  G.enterVent(me, G.ventTarget);
};
G.enterVent = function (p, vent) {
  p.venting = true;
  p.ventId = vent.id;
  p.x = vent.x; p.z = vent.z;
  G.ventOpen[vent.id] = true;
  setTimeout(function () { delete G.ventOpen[vent.id]; }, 600);
  AU.Audio.play('vent');
  if (p.role === 'engineer') p.ventTimer = p.roleOpts.maxTime || 15;
  /* anyone watching learns something */
  G.players.forEach(function (o) {
    if (!o.isBot || !o.alive || o === p) return;
    if (Math.hypot(o.x - p.x, o.z - p.z) < 12 && G.layout.lineClear(o.x, o.z, p.x, p.z))
      AU.AI.noteSighting(o, p, 'vent');
  });
  if (p.id === G.selfId && p.role === 'engineer')
    AU.HUD.toast('You can stay in the vents for ' + (p.roleOpts.maxTime || 15) + 's', 2.5);
};
G.moveThroughVent = function (p, ventId) {
  var v = G.world.ventById(ventId);
  if (!v) return;
  p.ventId = ventId;
  p.x = v.x; p.z = v.z;
  AU.Audio.play('vent');
};
G.exitVent = function (p) {
  var v = G.world.ventById(p.ventId);
  p.venting = false;
  G.ventOpen[p.ventId] = true;
  setTimeout(function () { if (v) delete G.ventOpen[v.id]; }, 600);
  if (p.role === 'engineer') p.abilityCd = p.roleOpts.cooldown || 30;
  AU.Audio.play('vent');
};

/* ---------------- role abilities ---------------- */
G.tryAbility = function () {
  var me = G.me();
  if (me.abilityCd > 0) return;
  if (!me.alive && me.ghostRole === 'guardian') {
    if (G.useTarget && G.useTarget.kind === 'protect') doProtect(me, G.useTarget.player);
    else AU.HUD.toast('Move next to a living crewmate to shield them.', 2);
    return;
  }
  if (!me.alive) return;
  switch (me.role) {
    case 'scientist':
      if (me.scientistBattery <= 0) { AU.HUD.toast('Battery empty — complete a task to recharge.', 2); return; }
      AU.HUD.openMap('vitals');
      me.abilityCd = me.roleOpts.cooldown || 15;
      break;
    case 'tracker':
      var t = nearestOther(me, 6);
      if (!t) { AU.HUD.toast('Get closer to someone to place a tracker.', 2); return; }
      me.trackTargetId = t.id;
      me.trackTimer = me.roleOpts.duration || 30;
      me.abilityCd = me.roleOpts.cooldown || 25;
      AU.HUD.toast('Tracking ' + t.name + ' for ' + Math.round(me.trackTimer) + 's — open the map.', 3);
      break;
    case 'detective':
      var b = G.reportTarget || nearestBody(me, 6);
      if (!b) { AU.HUD.toast('Stand near a body to take notes.', 2); return; }
      var killer = G.byId(b.killer);
      var kind = killer ? AU.Roles.def(killer.role).name : 'an Impostor';
      me.notes = me.notes || [];
      me.notes.push({ room: (AU.roomOf(G.map, b.room) || {}).name, kind: kind, t: b.time });
      AU.HUD.toast('Notes: killed in ' + ((AU.roomOf(G.map, b.room) || {}).name || '?') +
        ' by ' + kind + '.', 4);
      me.abilityCd = 10;
      break;
    case 'shapeshifter':
      if (me.shifted) { unshift(me); return; }
      if (!G.shiftTarget) { AU.HUD.toast('Stand near someone to copy their look.', 2); return; }
      G.shapeshift(me, G.shiftTarget);
      break;
    case 'phantom':
      G.vanish(me);
      break;
  }
};
function nearestOther(me, range) {
  var best = null, bd = range;
  G.players.forEach(function (p) {
    if (p === me || !p.alive) return;
    var d = Math.hypot(p.x - me.x, p.z - me.z);
    if (d < bd) { bd = d; best = p; }
  });
  return best;
}
function nearestBody(me, range) {
  var best = null, bd = range;
  G.bodies.forEach(function (b) {
    if (b.reported || b.dissolved) return;
    var d = Math.hypot(b.x - me.x, b.z - me.z);
    if (d < bd) { bd = d; best = b; }
  });
  return best;
}
function doProtect(ghost, target) {
  if (ghost.abilityCd > 0) return;
  target.protectedUntil = G.time + (ghost.roleOpts.duration || 10);
  ghost.abilityCd = ghost.roleOpts.cooldown || 30;
  AU.Audio.play('fixed');
  AU.HUD.toast('You shielded ' + target.name, 2);
  if (G.isHost) broadcastEvent({ t: 'protect', id: target.id, until: target.protectedUntil });
}
G.shapeshift = function (p, target) {
  animOf(p).shift = 1;
  p.shifted = target.look;
  p.shiftedName = target.name;
  p.shiftUntil = G.time + (p.roleOpts.duration || 30);
  p.abilityCd = p.roleOpts.cooldown || 15;
  refreshAvatar(p);
  AU.Audio.play('shift');
  if (p.id === G.selfId) AU.HUD.toast('You look like ' + target.name + ' for ' +
    Math.round(p.roleOpts.duration || 30) + 's', 3);
  if (G.isHost) broadcastEvent({ t: 'shift', id: p.id, target: target.id });
};
function unshift(p) {
  if (p.roleOpts.leaveSkin && p.shifted) {
    G.bodies.push({ id: 'skin' + G.bodies.length, playerId: null, look: p.shifted,
      x: p.x, z: p.z, facing: p.facing, skinOnly: true,
      room: (G.layout.roomAt(p.x, p.z) || {}).id, reported: true, dissolved: false, time: G.time });
  }
  p.shifted = null;
  p.shiftedName = null;
  refreshAvatar(p);
  AU.Audio.play('shift');
}
G.vanish = function (p) {
  p.invisible = true;
  p.vanishUntil = G.time + (p.roleOpts.duration || 15);
  p.abilityCd = p.roleOpts.cooldown || 30;
  AU.Audio.play('vanish');
  if (p.id === G.selfId) AU.HUD.toast('Invisible for ' + Math.round(p.roleOpts.duration || 15) + 's', 2.5);
  if (G.isHost) broadcastEvent({ t: 'vanish', id: p.id });
};
function updateShiftAndVanish(dt) {
  G.players.forEach(function (p) {
    if (p.shifted && G.time > p.shiftUntil) unshift(p);
    if (p.invisible && G.time > p.vanishUntil) {
      p.invisible = false;
      if (p.id === G.selfId) AU.HUD.toast('You are visible again.', 2);
    }
    if (p.venting && p.role === 'engineer') {
      p.ventTimer -= dt;
      if (p.ventTimer <= 0) {
        G.exitVent(p);
        if (p.id === G.selfId) AU.HUD.toast('Vent time up!', 2);
      }
    }
    if (p.trackTargetId && p.trackTimer > 0) {
      var tp = G.byId(p.trackTargetId);
      if (tp) { tp.lastKnownX = tp.x; tp.lastKnownZ = tp.z; }
    }
  });
}

/* ============================================================
   SABOTAGE
   ============================================================ */
G.startSabotage = function (id) {
  if (G.sabotage || G.sabotageCd > 0) return;
  if (G.online && !G.isHost) { AU.Net.toHost({ t: 'sabotage', id: id }); return; }
  applySabotage(id);
};
function applySabotage(id) {
  var def = null;
  (G.map.sabotages || []).forEach(function (s) { if (s.id === id) def = s; });
  if (!def) return;
  G.sabotage = { def: def, timer: def.time || 0, critical: !!def.time, fixedRooms: {},
                 codeA: false, codeB: false };
  G.sabotageCd = 25;
  AU.Audio.play('sabotage');
  G.shake = 0.8;
  if (def.doors) {
    /* close every door of a random room */
    var room = pick(G.map.doorRooms);
    G.world.doors.forEach(function (d) {
      if (d.room === room) { G.world.setDoorClosed(d, true); }
    });
    AU.Audio.play('doorClose');
    setTimeout(function () {
      G.world.doors.forEach(function (d) { if (d.room === room) G.world.setDoorClosed(d, false); });
    }, 10000);
    G.sabotage = null;
    if (G.isHost) broadcastEvent({ t: 'doors', room: room });
    AU.HUD.toast('Doors sealed in ' + (AU.roomOf(G.map, room) || {}).name, 2.5);
    return;
  }
  if (def.id === 'lights') G.world.setLightsSabotaged(true);
  if (def.special === 'mixup') startMushroomMixup();
  AU.HUD.alert(def.name.toUpperCase() + (def.time ? '' : ' — FIX IT'));
  AU.Audio.play('alarm');
  if (G.isHost) broadcastEvent({ t: 'sabotage', id: id });
}
G.botSabotage = function (bot) {
  var list = (G.map.sabotages || []).filter(function (s) { return !s.doors; });
  if (!list.length) return;
  applySabotage(pick(list).id);
};
function updateSabotage(dt) {
  if (!G.sabotage) return;
  if (G.sabotage.critical) {
    G.sabotage.timer -= dt;
    AU.HUD.alert(G.sabotage.def.name.toUpperCase() + ' — ' + Math.ceil(G.sabotage.timer) + 's');
    if (G.sabotage.timer <= 0) endGame('impostor', 'sabotage');
  }
}
function openSabotageFix(roomId) {
  var sab = G.sabotage;
  if (!sab) return;
  if (document.pointerLockElement) document.exitPointerLock();
  var mini = sab.def.code ? 'keypad' : sab.def.id === 'lights' ? 'breakers'
           : sab.def.id === 'comms' ? 'wifi' : sab.def.id === 'mushroom' ? 'leaves' : 'keypad';
  AU.Tasks.open({ mini: mini, name: sab.def.name, step: 0, steps: 1 }, function () {
    fixSabotageRoom(roomId);
  });
}
function fixSabotageRoom(roomId) {
  if (!G.sabotage) return;
  if (G.online && !G.isHost) { AU.Net.toHost({ t: 'fix', room: roomId }); return; }
  G.sabotage.fixedRooms[roomId] = true;
  var rooms = G.sabotage.def.rooms || [];
  var needed = G.sabotage.def.dual ? rooms.length : 1;
  var got = Object.keys(G.sabotage.fixedRooms).length;
  AU.Audio.play('fixed');
  if (got >= needed) clearSabotage();
  else AU.HUD.toast('One more station needed on the other side!', 3);
}
G.botFixSabotage = function (bot) {
  if (!G.sabotage) return;
  var room = null;
  (G.sabotage.def.rooms || []).forEach(function (rid) {
    if (G.sabotage.fixedRooms[rid]) return;
    var R = AU.roomOf(G.map, rid);
    if (R && Math.hypot(bot.x - R.x, bot.z - R.z) < 5) room = rid;
  });
  if (room) fixSabotageRoom(room);
};
function clearSabotage() {
  if (!G.sabotage) return;
  if (G.sabotage.def.id === 'lights') G.world.setLightsSabotaged(false);
  if (G.sabotage.special === 'mixup' || G.sabotage.def.special === 'mixup') endMushroomMixup();
  G.sabotage = null;
  AU.HUD.alert(null);
  AU.Audio.play('fixed');
  AU.HUD.toast('Systems restored.', 2);
  if (G.isHost) broadcastEvent({ t: 'sabfixed' });
}
/* Fungle's Mushroom Mixup: everyone looks like a random crewmate */
function startMushroomMixup() {
  G.players.forEach(function (p) {
    if (!p.alive) return;
    p.mixupLook = AU.Menu.randomLook(pick(AU.COLORS).id);
    p.preMixName = p.name;
    p.shifted = p.mixupLook;
    p.shiftedName = '?????';
    refreshAvatar(p);
  });
  setTimeout(endMushroomMixup, 20000);
}
function endMushroomMixup() {
  G.players.forEach(function (p) {
    if (!p.mixupLook) return;
    p.mixupLook = null;
    p.shifted = null;
    p.shiftedName = null;
    refreshAvatar(p);
  });
}

/* ---------------- bodies ---------------- */
function updateBodies(dt) {
  G.bodies.forEach(function (b) {
    if (b.dissolving && !b.dissolved) {
      b.dissolveT -= b.dissolveRate * dt;
      if (b.dissolveT <= 0.02) { b.dissolved = true; }
    }
  });
}
function serialiseBody(b) {
  return { id: b.id, playerId: b.playerId, look: b.look, x: b.x, z: b.z, facing: b.facing,
           room: b.room, dissolving: b.dissolving, dissolveRate: b.dissolveRate,
           killer: b.killer, time: b.time };
}

/* ============================================================
   MEETINGS
   ============================================================ */
function startMeeting(info) {
  if (G.phase === 'meeting') return;
  G.phase = 'meeting';
  G.taskBarSnapshot = computeTaskProgress();
  if (document.pointerLockElement) document.exitPointerLock();
  AU.Tasks.closeCurrent();
  AU.HUD.closeMap();
  AU.HUD.alert(null);

  /* teleport everyone to the meeting table, like the real game */
  var em = G.world.stations.emergency ||
    { x: G.map.rooms[0].x, z: G.map.rooms[0].z };
  G.players.forEach(function (p, i) {
    var a = i / G.players.length * Math.PI * 2;
    p.x = em.x + Math.cos(a) * 4.2;
    p.z = em.z + Math.sin(a) * 4.2;
    p.facing = a + Math.PI;
    p.venting = false;
    p.invisible = false;
    if (p.shifted) unshift(p);
    if (p.ai) { p.ai.path = null; p.ai.dest = null; }
  });
  G.bodies.forEach(function (b) { b.reported = true; });
  G.botVoteTimers = {};
  G.botChatTimers = {};
  G.players.forEach(function (p) {
    if (!p.isBot || !p.alive) return;
    G.botVoteTimers[p.id] = 4 + Math.random() * Math.max(4, G.settings.discussionTime);
    G.botChatTimers[p.id] = 1 + Math.random() * 8;
  });

  AU.Meeting.start(G, info);
  AU.Meeting.onVote = function (voterId, targetId) {
    if (G.online && !G.isHost) AU.Net.toHost({ t: 'vote', target: targetId });
    else registerVote(voterId, targetId);
  };
  AU.Meeting.onChat = function (payload) {
    if (G.online) {
      if (G.isHost) AU.Net.broadcast({ t: 'chat', payload: payload });
      else AU.Net.toHost({ t: 'chat', payload: payload });
    }
  };
  AU.Meeting.onOverrule = function (judgeId, targetId) {
    if (G.online && !G.isHost) { AU.Net.toHost({ t: 'overrule', target: targetId }); return; }
    resolveOverrule(judgeId, targetId);
  };
  AU.Meeting.onComplete = function (votes) { if (G.isHost) tallyVotes(votes); };

  if (info.isEmergency) G.emergencyCd = G.settings.emergencyCd;
  if (G.isHost && G.online) broadcastEvent({ t: 'meeting', info: info });
}

function registerVote(voterId, targetId) {
  AU.Meeting.noteVote(voterId, targetId);
  if (G.isHost && G.online) AU.Net.broadcast({ t: 'votecast', voter: voterId, target: targetId });
  var aliveCount = G.players.filter(function (p) { return p.alive; }).length;
  if (Object.keys(AU.Meeting.votes).length >= aliveCount) {
    setTimeout(function () { if (G.phase === 'meeting') AU.Meeting.finish(); }, 900);
  }
}

function tickBotVotes(dt) {
  if (!G.isHost || !AU.Meeting.open) return;
  for (var id in G.botChatTimers) {
    G.botChatTimers[id] -= dt;
    if (G.botChatTimers[id] <= 0) {
      G.botChatTimers[id] = 6 + Math.random() * 14;
      var p = G.byId(id);
      if (p && p.alive && Math.random() < (p.ai ? p.ai.personality.chatty : 0.5)) {
        var line = AU.AI.meetingChat(p, G, AU.Meeting.info);
        if (line) {
          var payload = { name: p.name, text: line,
            color: AU.colorById(p.look.color).hex, ghost: false };
          AU.Meeting.addChat(payload.name, payload.text,
            '#' + payload.color.toString(16).padStart(6, '0'));
          if (G.online) AU.Net.broadcast({ t: 'chat', payload: payload });
          /* bots accuse each other; the accusation sways later votes */
          var m = line.match(/([A-Z0-9]{2,10}) is sus|saw ([A-Z0-9]{2,10}) vent/i);
          if (m) {
            var nm = (m[1] || m[2] || '').toUpperCase();
            var tp = G.players.filter(function (q) { return q.name.toUpperCase() === nm; })[0];
            if (tp) AU.Meeting.info.accusedId = tp.id;
          }
        }
      }
    }
  }
  if (AU.Meeting.phase !== 'voting') return;
  for (var bid in G.botVoteTimers) {
    if (G.botVoteTimers[bid] === null) continue;
    G.botVoteTimers[bid] -= dt;
    if (G.botVoteTimers[bid] <= 0) {
      G.botVoteTimers[bid] = null;
      var bp = G.byId(bid);
      if (!bp || !bp.alive) continue;
      var target = AU.AI.meetingVote(bp, G, AU.Meeting.info);
      registerVote(bid, target || 'skip');
    }
  }
}

function tallyVotes(votes) {
  var counts = {};
  for (var voter in votes) {
    var t = votes[voter] || 'skip';
    counts[t] = (counts[t] || 0) + 1;
  }
  var best = null, bestN = 0, tie = false;
  for (var k in counts) {
    if (counts[k] > bestN) { bestN = counts[k]; best = k; tie = false; }
    else if (counts[k] === bestN) tie = true;
  }
  var ejectedId = (best && best !== 'skip' && !tie) ? best : null;
  finishMeeting(ejectedId, tie && !ejectedId ? 'tie' : (best === 'skip' ? 'skip' : 'eject'));
}

function resolveOverrule(judgeId, targetId) {
  var judge = G.byId(judgeId), target = G.byId(targetId);
  if (!judge || !target) return;
  var wrong = target.team !== 'impostor';
  AU.Meeting.addChat('JUDGE', judge.name + ' overruled the vote on ' + target.name + '!', '#F5C842', true);
  finishMeeting(wrong ? judgeId : targetId, 'overrule');
}

function finishMeeting(ejectedId, reason) {
  if (G.isHost && G.online) AU.Net.broadcast({ t: 'ejected', id: ejectedId, reason: reason,
    votes: AU.Meeting.votes });
  doEjection(ejectedId, reason);
}

function doEjection(ejectedId, reason) {
  AU.Meeting.stop();
  var ejected = ejectedId ? G.byId(ejectedId) : null;
  var text;
  if (!ejected) {
    text = { main: reason === 'tie' ? 'No one was ejected. (Tie)' : 'No one was ejected. (Skipped)',
             sub: remainingText() };
  } else {
    ejected.alive = false;
    ejected.ejected = true;
    makeGhost(ejected);
    AU.Roles.onCrewDeath(ejected, G.roleSettings);
    if (G.settings.confirmEjects) {
      var article = G.settings.impostors > 1 ? 'An Impostor' : 'The Impostor';
      text = { main: ejected.name + ' was ' + (ejected.team === 'impostor' ? '' : 'not ') + article + '.',
               sub: remainingText() };
    } else {
      text = { main: ejected.name + ' was ejected.', sub: '' };
    }
    if (ejectedId === G.selfId) {
      setTimeout(function () { AU.HUD.toast('You were ejected. You are a ghost now.', 4); }, 5400);
    }
  }
  AU.Meeting.ejectScene(G, ejectedId, text, function () {
    G.bodies.forEach(function (b) { b.reported = true; if (b.mesh) b.mesh.visible = false; });
    G.phase = 'play';
    G.players.forEach(function (p) {
      p.killCd = G.settings.killCooldown;
      if (p.ai) { p.ai.path = null; p.ai.dest = null; p.ai.wait = 0; }
    });
    if (G.isHost) checkWin();
  });
}

function remainingText() {
  var imps = G.players.filter(function (p) { return p.alive && p.team === 'impostor'; }).length;
  return imps + ' Impostor' + (imps === 1 ? '' : 's') + ' remain' + (imps === 1 ? 's' : '') + '.';
}

/* ============================================================
   WIN CONDITIONS
   ============================================================ */
function checkWin() {
  if (G.phase === 'end') return;
  var aliveImp = G.players.filter(function (p) { return p.alive && p.team === 'impostor'; }).length;
  var aliveCrew = G.players.filter(function (p) { return p.alive && p.team === 'crew'; }).length;
  if (aliveImp === 0) { endGame('crew', 'ejected'); return; }
  if (aliveImp >= aliveCrew) { endGame('impostor', 'outnumber'); return; }
  if (computeTaskProgress() >= 1) { endGame('crew', 'tasks'); return; }
}

function endGame(team, reason) {
  if (G.phase === 'end') return;
  G.phase = 'end';
  G.running = true;
  if (G.isHost && G.online) AU.Net.broadcast({ t: 'end', team: team, reason: reason });
  AU.Meeting.stop();
  AU.HUD.hide();
  AU.HUD.alert(null);
  if (document.pointerLockElement) document.exitPointerLock();

  var me = G.me();
  var win = me && me.team === team;
  AU.Audio.play(win ? 'win' : 'lose');

  var myTasks = me ? me.tasks.reduce(function (a, t) { return a + t.progress; }, 0) : 0;
  var kills = G.bodies.filter(function (b) { return b.killer === (me && me.id); }).length;
  var reward = AU.Save.awardMatch({
    win: win, team: me ? me.team : 'crew', tasks: myTasks, kills: kills,
    correctEjects: 0, survived: me && me.alive
  });

  var ov = $('overlay-end');
  var winners = G.players.filter(function (p) { return p.team === team; });
  ov.innerHTML =
    '<div class="ov-panel end-panel">' +
      '<div class="end-title" style="color:' + (team === 'impostor' ? '#FF4D4D' : '#7FE8FF') + '">' +
        (team === 'impostor' ? 'DEFEAT' : 'VICTORY') + '</div>' +
      '<div class="end-sub">' +
        (team === 'impostor'
          ? 'The Impostors win — ' + (reason === 'sabotage' ? 'sabotage was not fixed in time.'
              : 'they outnumbered the crew.')
          : 'The Crewmates win — ' + (reason === 'tasks' ? 'all tasks were completed.'
              : 'every Impostor was ejected.')) +
      '</div>' +
      '<div class="end-crew">' + winners.map(function (p) {
        return '<div>' + AU.Models.avatarImg(p.look, 76, 86) +
          '<div style="font-size:11px">' + esc(p.name) + '</div>' +
          '<div style="font-size:10px;color:#7f92b8">' + AU.Roles.def(p.role).name + '</div></div>';
      }).join('') + '</div>' +
      '<div class="end-rewards">' +
        '<div class="chip beans">🫘 +' + reward.beans + '</div>' +
        '<div class="chip pods">🧩 +' + reward.pods + '</div>' +
        (reward.stars ? '<div class="chip stars">⭐ +' + reward.stars + '</div>' : '') +
        '<div class="chip">XP +' + reward.xp + '</div>' +
      '</div>' +
      (reward.levels ? '<div class="end-sub" style="color:#F5C842">LEVEL UP! Now level ' +
        AU.Save.p.level + '</div>' : '') +
      '<button class="au-btn green" id="btn-end-lobby">BACK TO LOBBY</button> ' +
      '<button class="au-btn grey" id="btn-end-menu">MAIN MENU</button>' +
    '</div>';
  ov.classList.add('on');
  $('btn-end-lobby').onclick = function () {
    ov.classList.remove('on');
    G.running = false;
    AU.Menu.go('lobby');
    AU.Menu.renderLobby();
  };
  $('btn-end-menu').onclick = function () {
    ov.classList.remove('on');
    G.running = false;
    AU.Net.leave();
    AU.Menu.lobby = null;
    AU.Menu.go('menu');
  };
}

/* ============================================================
   PAUSE
   ============================================================ */
G.togglePause = function () {
  if (G.phase === 'end') return;
  G.paused = !G.paused;
  var ov = $('overlay-pause');
  if (!G.paused) { ov.classList.remove('on'); ov.innerHTML = ''; return; }
  if (document.pointerLockElement) document.exitPointerLock();
  ov.innerHTML =
    '<div class="ov-panel" style="text-align:center;min-width:320px">' +
      '<h2>PAUSED</h2>' +
      '<button class="au-btn green" id="pz-resume">RESUME</button><br><br>' +
      '<button class="au-btn blue" id="pz-settings">MY SETTINGS</button><br><br>' +
      '<button class="au-btn red" id="pz-quit">LEAVE GAME</button>' +
    '</div>';
  ov.classList.add('on');
  $('pz-resume').onclick = function () { G.togglePause(); };
  $('pz-settings').onclick = function () {
    ov.classList.remove('on');
    AU.Menu.renderSettings('client');
    $('settings-title').textContent = 'MY SETTINGS';
    AU.Menu.go('settings');
    G.paused = false;
  };
  $('pz-quit').onclick = function () {
    G.paused = false; G.running = false; G.phase = 'none';
    ov.classList.remove('on');
    AU.HUD.hide();
    AU.Net.leave();
    AU.Menu.lobby = null;
    AU.Menu.go('menu');
  };
};

G.sendGhostChat = function (text) {
  var me = G.me();
  var log = $('ghost-chat-log');
  log.innerHTML += '<div><span class="who" style="color:#bfe">' + esc(me.name) + ':</span> ' + esc(text) + '</div>';
  log.scrollTop = log.scrollHeight;
  if (G.online) {
    var payload = { name: me.name, text: text, color: AU.colorById(me.look.color).hex, ghost: true };
    if (G.isHost) AU.Net.broadcast({ t: 'ghostchat', payload: payload });
    else AU.Net.toHost({ t: 'ghostchat', payload: payload });
  }
};

/* ============================================================
   VOICE VOLUMES
   ============================================================ */
function updateVoiceVolumes() {
  if (!G.online) return;
  var me = G.me();
  if (!me) return;
  var mode = AU.Save.p.client.voiceMode;
  var master = (AU.Save.p.client.voiceVolume || 100) / 100;
  G.players.forEach(function (p) {
    if (!p.netId || p === me) return;
    var vol = 0;
    if (mode === 'off') vol = 0;
    else if (mode === 'always') vol = 1;
    else if (mode === 'meeting') vol = (G.phase === 'meeting') ? 1 : 0;
    else {
      if (G.phase === 'meeting') vol = 1;
      else if (me.alive !== p.alive) vol = 0;      /* the living can't hear ghosts */
      else {
        var d = Math.hypot(p.x - me.x, p.z - me.z);
        var range = 14;
        vol = d > range ? 0 : Math.pow(1 - d / range, 1.6);
        if (!G.layout.lineClear(me.x, me.z, p.x, p.z)) vol *= 0.35;
      }
    }
    AU.Net.setPeerVolume(p.netId, vol * master);
  });
}

/* ============================================================
   NETWORKING
   ============================================================ */
function netTick(dt) {
  G.netTimer = (G.netTimer || 0) - dt;
  if (G.netTimer > 0) return;
  G.netTimer = 1 / 15;
  var me = G.me();
  if (G.isHost) {
    AU.Net.broadcast({ t: 'snap', time: G.time, players: G.players.map(function (p) {
      return { id: p.id, x: +p.x.toFixed(2), z: +p.z.toFixed(2), f: +p.facing.toFixed(2),
               a: p.alive ? 1 : 0, v: p.venting ? 1 : 0, i: p.invisible ? 1 : 0,
               m: p.moving ? 1 : 0, k: +p.killCd.toFixed(1) };
    }), bodies: G.bodies.filter(function (b) { return !b.reported; }).map(serialiseBody),
       sab: G.sabotage ? { id: G.sabotage.def.id, timer: G.sabotage.timer,
                           fixed: Object.keys(G.sabotage.fixedRooms) } : null,
       bar: computeTaskProgress() });
  } else if (me) {
    AU.Net.toHost({ t: 'pos', x: +me.x.toFixed(2), z: +me.z.toFixed(2), f: +me.facing.toFixed(2),
                    m: me.moving ? 1 : 0, v: me.venting ? 1 : 0 });
  }
}

function broadcastEvent(ev) {
  if (G.online && G.isHost) AU.Net.broadcast(ev);
}

function handleNet(from, msg) {
  if (!msg || !msg.t) return;
  var M = AU.Menu;

  /* ---------- lobby-level ---------- */
  if (msg.t === 'joined') {
    if (!M.lobby) return;
    AU.Net.callPeers();
    return;
  }
  if (msg.t === 'peers') { AU.Net.callIds(msg.ids); return; }
  if (msg.t === 'mesh-dial') { AU.Net.meshDial(msg.to); return; }
  if (msg.t === 'mesh-sig') {
    if (AU.Net.mode === 'host') AU.Net.meshRelay(from, msg);   /* relay between guests */
    else AU.Net.meshSignal(msg);
    return;
  }
  if (msg.t === 'hello' && AU.Net.mode === 'host') {
    if (!M.lobby) return;
    var taken = M.lobby.players.map(function (p) { return p.look.color; });
    var look = msg.look;
    if (taken.indexOf(look.color) >= 0) {
      var free = AU.COLORS.filter(function (c) { return taken.indexOf(c.id) < 0; });
      if (free.length) look = JSON.parse(JSON.stringify(look)), look.color = free[0].id;
    }
    M.lobby.players.push({ id: 'p_' + from, name: msg.name, look: look, isBot: false,
      isHost: false, netId: from });
    AU.Net.conns[from].name = msg.name;
    AU.Net.meshAnnounce(from);
    M.broadcastLobby();
    M.renderLobby();
    return;
  }
  if (msg.t === 'look' && AU.Net.mode === 'host') {
    if (!M.lobby) return;
    M.lobby.players.forEach(function (p) {
      if (p.netId === from) { p.look = msg.look; p.name = msg.name; }
    });
    M.broadcastLobby(); M.renderLobby();
    return;
  }
  if (msg.t === 'lobby') {
    M.lobby = M.lobby || {};
    M.lobby.players = msg.players;
    M.lobby.code = msg.code;
    M.lobby.isHost = false;
    var mine = msg.players.filter(function (p) { return p.netId === AU.Net.selfId; })[0];
    if (mine) M.lobby.selfId = mine.id;
    AU.Save.p.settings = msg.settings;
    AU.Save.p.roleSettings = msg.roleSettings;
    M.renderLobby();
    return;
  }
  if (msg.t === 'lobbychat') {
    M.addChatLine(msg.name, msg.text, msg.color);
    if (AU.Net.mode === 'host') AU.Net.broadcast(msg);
    return;
  }
  if (msg.t === 'left') {
    if (M.lobby) {
      M.lobby.players = M.lobby.players.filter(function (p) { return p.netId !== from; });
      M.broadcastLobby(); M.renderLobby();
    }
    var gp = G.players.filter(function (p) { return p.netId === from; })[0];
    if (gp) { gp.disconnected = true; gp.isBot = true; AU.AI.init(gp); }
    return;
  }
  if (msg.t === 'hostleft') {
    AU.Menu.flash('The host left the game.');
    AU.Net.leave();
    G.running = false;
    AU.HUD.hide();
    AU.Menu.lobby = null;
    AU.Menu.go('menu');
    return;
  }
  if (msg.t === 'full') { AU.Menu.flash('That room is full.'); return; }
  if (msg.t === 'start') { G.startFromNet(msg); return; }

  /* ---------- in-round ---------- */
  if (!G.running) return;
  var p;
  switch (msg.t) {
    case 'snap':
      if (G.isHost) break;
      msg.players.forEach(function (s) {
        var q = G.byId(s.id);
        if (!q) return;
        if (q.id === G.selfId) { q.killCd = s.k; return; }
        q.x = s.x; q.z = s.z; q.facing = s.f;
        var wasAlive = q.alive;
        q.alive = !!s.a; q.venting = !!s.v; q.invisible = !!s.i; q.moving = !!s.m;
        if (wasAlive && !q.alive) makeGhost(q);
      });
      msg.bodies.forEach(function (b) {
        if (!G.bodies.some(function (x) { return x.id === b.id; })) G.bodies.push(b);
      });
      if (msg.sab) {
        if (!G.sabotage) applySabotage(msg.sab.id);
        if (G.sabotage) {
          G.sabotage.timer = msg.sab.timer;
          msg.sab.fixed.forEach(function (r) { G.sabotage.fixedRooms[r] = true; });
        }
      } else if (G.sabotage) clearSabotage();
      break;
    case 'pos':
      p = G.players.filter(function (q) { return q.netId === from; })[0];
      if (p) { p.x = msg.x; p.z = msg.z; p.facing = msg.f; p.moving = !!msg.m; p.venting = !!msg.v; }
      break;
    case 'kill':
      if (G.isHost) {
        p = G.players.filter(function (q) { return q.netId === from; })[0];
        var victim = G.byId(msg.target);
        if (p && victim && p.killCd <= 0) doKill(p, victim);
      } else {
        var kp = G.byId(msg.killer), vp = G.byId(msg.victim);
        if (kp && vp && vp.alive) doKill(kp, vp);
      }
      break;
    case 'report':
      if (G.isHost) {
        p = G.players.filter(function (q) { return q.netId === from; })[0];
        var body = G.bodies.filter(function (b) { return b.id === msg.body; })[0];
        if (p && body && !body.reported) {
          body.reported = true;
          startMeeting({ reporterId: p.id, bodyId: body.id, isEmergency: false,
            killTime: body.time, selfReport: body.killer === p.id });
        }
      }
      break;
    case 'emergency':
      if (G.isHost) {
        p = G.players.filter(function (q) { return q.netId === from; })[0];
        if (p) startMeeting({ reporterId: p.id, isEmergency: true });
      }
      break;
    case 'meeting': if (!G.isHost) startMeeting(msg.info); break;
    case 'vote':
      if (G.isHost) {
        p = G.players.filter(function (q) { return q.netId === from; })[0];
        if (p) registerVote(p.id, msg.target);
      }
      break;
    case 'votecast': if (!G.isHost) AU.Meeting.noteVote(msg.voter, msg.target); break;
    case 'overrule':
      if (G.isHost) {
        p = G.players.filter(function (q) { return q.netId === from; })[0];
        if (p) resolveOverrule(p.id, msg.target);
      }
      break;
    case 'ejected': if (!G.isHost) doEjection(msg.id, msg.reason); break;
    case 'chat':
      AU.Meeting.addChat(msg.payload.name, msg.payload.text,
        '#' + msg.payload.color.toString(16).padStart(6, '0'), false, msg.payload.ghost);
      if (G.isHost) AU.Net.broadcast(msg);
      break;
    case 'ghostchat':
      var me2 = G.me();
      if (me2 && !me2.alive) {
        var log = $('ghost-chat-log');
        log.innerHTML += '<div><span class="who" style="color:#bfe">' + esc(msg.payload.name) +
          ':</span> ' + esc(msg.payload.text) + '</div>';
      }
      if (G.isHost) AU.Net.broadcast(msg);
      break;
    case 'sabotage':
      if (G.isHost) applySabotage(msg.id);
      else if (!G.sabotage) applySabotage(msg.id);
      break;
    case 'fix':
      if (G.isHost) fixSabotageRoom(msg.room);
      break;
    case 'sabfixed': if (!G.isHost) clearSabotage(); break;
    case 'doors':
      G.world.doors.forEach(function (d) { if (d.room === msg.room) G.world.setDoorClosed(d, true); });
      setTimeout(function () {
        G.world.doors.forEach(function (d) { if (d.room === msg.room) G.world.setDoorClosed(d, false); });
      }, 10000);
      break;
    case 'shift':
      var sp = G.byId(msg.id), tp2 = G.byId(msg.target);
      if (sp && tp2 && !G.isHost) G.shapeshift(sp, tp2);
      break;
    case 'vanish':
      var vpp = G.byId(msg.id);
      if (vpp && !G.isHost) G.vanish(vpp);
      break;
    case 'protect':
      var pp = G.byId(msg.id);
      if (pp) pp.protectedUntil = msg.until;
      break;
    case 'taskstep':
      if (G.isHost) {
        p = G.players.filter(function (q) { return q.netId === from; })[0];
        if (p) {
          var tk = p.tasks.filter(function (t) { return t.id === msg.task; })[0];
          if (tk && tk.progress < tk.steps.length) { tk.progress++; checkWin(); }
        }
      }
      break;
    case 'visual':
      G.world.visualEffect(msg.x, msg.z, 0x7FE8FF, 4.5);
      AU.Audio.play('fixed');
      break;
    case 'end': if (!G.isHost) endGame(msg.team, msg.reason); break;
  }
}

/* ============================================================
   BOOT
   ============================================================ */
AU.Game = G;
window.addEventListener('load', function () {
  AU.Save.load();
  AU.Audio.init();
  AU.Net.onMessage(handleNet);
  AU.Menu.boot();
});

})(window.AU);
