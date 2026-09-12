/* =============================================================
 * BREACHPOINT — game shell
 * Input, camera, viewmodel, the main loop, and the netcode glue
 * between the authoritative match and the presentation layer.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C, W = CS.W, P = CS.P, G = CS.G, Geo = CS.Geo;
  var doc = root.document;

  var M_YAW = 0.022 * M.DEG;      // Source-style mouse scale, so sens numbers feel familiar

  function Game() {
    this.settings = C.loadSettings();
    this.audio = new CS.Audio(this.settings);
    this.net = new CS.Net();
    this.voice = new CS.Voice(this.net, this.audio, this.settings);
    this.renderer = null;
    this.ui = null;

    this.world = null; this.map = null; this.match = null;
    this.mapId = 'bazaar';
    this.localPlayer = null;
    this.localId = 'local';
    this.isHost = true;
    this.online = false;
    this.roomCode = null;
    this.lobbyStatus = '';
    this.lobbyPlayers = [];
    this.localReady = false;
    this.pendingMode = 'competitive';
    this.pendingMap = 'bazaar';
    this.rules = C.deepClone(C.DEFAULT_RULES);
    this.mapVotes = {};

    this.keys = {};
    this.mouse = { dx: 0, dy: 0, left: false, right: false, middle: false, wheel: 0 };
    this.pointerLocked = false;
    this.paused = false;
    this.running = false;

    this.view = { yaw: 0, pitch: 0 };
    this.camera = { x: 0, y: 1.6, z: 0, yaw: 0, pitch: 0, roll: 0, zoom: 1 };
    this.vm = {
      x: 0.18, y: -0.16, z: -0.42, yaw: 0, pitch: 0, roll: 0, scale: 1,
      weaponId: 'knife', skin: 'factory', glove: 'default', flash: 0, hidden: false,
      bobT: 0, swayX: 0, swayY: 0, kick: 0, kickYaw: 0, anim: null, animT: 0, lastWeapon: null
    };
    this.spectateIndex = 0;
    this.spectateTarget = null;
    this.freeCam = null;
    this.nearPickup = null;

    this.acc = 0;
    this.lastTime = 0;
    this.fps = 60; this.frameMs = 16;
    this.fpsSamples = [];
    this.cmdSeq = 0;
    this.pendingCommands = {};
    this.snapBuffer = [];
    this.serverTime = 0;
    this.clockOffset = 0;
    this.lastSnapSent = 0;
    this.lastCmdSent = 0;
    this.predictError = { x: 0, y: 0, z: 0 };
    this.remote = {};           // peerId -> playerId
    this.peerOf = {};           // playerId -> peerId
    this.eventQueue = [];
    this.bombBeepT = 0;
    this.lastFootstep = 0;
  }

  /* ---------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------- */
  Game.prototype.boot = function () {
    var self = this;
    this.ui = new CS.UI(this);
    this.ui.setLoading(0.05, 'Starting renderer');

    var canvas = doc.getElementById('gl');
    try {
      this.renderer = new CS.Renderer(canvas, this.settings);
    } catch (e) {
      this.fatal(e.message || 'WebGL could not start.');
      return;
    }

    this.bindInput();
    this.ui.setLoading(0.35, 'Building map geometry');

    setTimeout(function () {
      self.prepareMap(self.mapId, function () {
        self.ui.setLoading(1, 'Ready');
        setTimeout(function () {
          self.ui.hideLoading();
          self.ui.show('mainmenu');
          self.startLoop();
        }, 120);
      });
    }, 30);
  };

  Game.prototype.fatal = function (msg) {
    var l = doc.getElementById('loading');
    if (l) {
      l.classList.remove('hidden');
      l.innerHTML = '<div class="logo">Breachpoint</div>' +
        '<div class="status" style="color:#f05555">' + msg + '</div>' +
        '<div class="tip">This game needs WebGL. Try Chrome or Edge, and make sure hardware ' +
        'acceleration is enabled in your browser settings.</div>';
    }
  };

  Game.prototype.prepareMap = function (id, done) {
    var self = this;
    this.mapId = id;
    this.map = CS.Maps.get(id);
    this.world = new CS.World(this.map);
    var stats = this.renderer.loadMap(this.world, this.map);
    this.mapStats = stats;
    this.ui.prepareRadar(this.map);
    if (done) done();
  };

  /* ---------------------------------------------------------------
   * Input
   * ------------------------------------------------------------- */
  Game.prototype.bindInput = function () {
    var self = this;
    var canvas = doc.getElementById('gl');

    doc.addEventListener('keydown', function (e) {
      if (self.ui.listenKey) return;
      if (self.ui.chatMode) return;
      var code = e.code;
      if (code === 'F5' || (e.ctrlKey && code === 'KeyR')) return;
      self.keys[code] = true;
      self.onKeyDown(code, e);
      if (self.pointerLocked || !self.ui.inMenu()) {
        if (code === 'Tab' || code === 'Space' || code.indexOf('Arrow') === 0 || code === 'Slash') e.preventDefault();
      }
    });
    doc.addEventListener('keyup', function (e) {
      self.keys[e.code] = false;
      self.onKeyUp(e.code);
    });
    root.addEventListener('blur', function () { self.keys = {}; self.mouse.left = self.mouse.right = false; });

    canvas.addEventListener('mousedown', function (e) {
      if (self.ui.inMenu()) return;
      if (!self.pointerLocked) { self.requestLock(); return; }
      if (e.button === 0) self.mouse.left = true;
      if (e.button === 2) self.mouse.right = true;
      if (e.button === 1) { self.mouse.middle = true; e.preventDefault(); }
    });
    doc.addEventListener('mouseup', function (e) {
      if (e.button === 0) self.mouse.left = false;
      if (e.button === 2) self.mouse.right = false;
      if (e.button === 1) self.mouse.middle = false;
    });
    doc.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    doc.addEventListener('wheel', function (e) {
      if (self.ui.inMenu() || !self.pointerLocked) return;
      self.mouse.wheel += e.deltaY > 0 ? 1 : -1;
      e.preventDefault();
    }, { passive: false });

    doc.addEventListener('mousemove', function (e) {
      if (!self.pointerLocked) return;
      var dx = e.movementX || 0, dy = e.movementY || 0;
      // guard against the huge spurious deltas some browsers emit on lock
      if (Math.abs(dx) > 900 || Math.abs(dy) > 900) return;
      self.mouse.dx += dx; self.mouse.dy += dy;
    });

    doc.addEventListener('pointerlockchange', function () {
      self.pointerLocked = (doc.pointerLockElement === canvas);
      if (!self.pointerLocked && self.running && !self.ui.inMenu() && !self.ui.buyOpen && !self.ui.chatMode) {
        self.pause();
      }
    });
    doc.addEventListener('pointerlockerror', function () {
      self.ui.toast('Could not capture the mouse. Click the game window and try again.', 'bad');
    });
    root.addEventListener('resize', function () { if (self.renderer) self.renderer.resize(); });
  };

  Game.prototype.requestLock = function () {
    var canvas = doc.getElementById('gl');
    if (canvas.requestPointerLock) {
      var p = canvas.requestPointerLock({ unadjustedMovement: !!this.settings.rawInput });
      if (p && p.catch) p.catch(function () { canvas.requestPointerLock(); });
    }
    this.audio.resume();
  };

  Game.prototype.onKeyDown = function (code, e) {
    var k = this.settings.keys;
    if (code === 'Escape') {
      if (this.ui.buyOpen) { this.ui.closeBuy(); return; }
      if (this.ui.scoreOpen) { this.ui.toggleScoreboard(false); return; }
      if (this.running && !this.ui.inMenu()) { this.pause(); return; }
      if (this.ui.screen === 'settings' || this.ui.screen === 'cosmetics') {
        this.ui.show(this.running ? 'pause' : 'mainmenu'); return;
      }
      if (this.ui.screen === 'pause') { this.resume(); return; }
      return;
    }
    if (this.ui.inMenu() || !this.running) return;

    if (this.ui.buyOpen) {
      if (code === 'KeyB') { this.ui.closeBuy(); return; }
      var n = parseInt(code.replace('Digit', ''), 10);
      if (code.indexOf('Digit') === 0 && n >= 1 && n <= 9) {
        if (e && e.shiftKey) this.ui.buyCatByNumber(n); else this.ui.buyByNumber(n);
        return;
      }
      return;
    }

    if (code === k.buy) { if (this.canBuyNow()) this.ui.openBuy(); else this.ui.toast('You can only buy in the buy zone during buy time.', 'bad'); return; }
    if (code === k.scoreboard) { this.ui.toggleScoreboard(true); return; }
    if (code === k.chatAll) { this.ui.openChat(false); return; }
    if (code === k.chatTeam) { this.ui.openChat(true); return; }
    if (code === k.slot1) this.wantSlot = 1;
    if (code === k.slot2) this.wantSlot = 2;
    if (code === k.slot3) this.wantSlot = 3;
    if (code === k.slot4) this.wantSlot = 4;
    if (code === k.slot5) this.wantSlot = 5;
  };

  Game.prototype.onKeyUp = function (code) {
    if (code === this.settings.keys.scoreboard) this.ui.toggleScoreboard(false);
  };

  Game.prototype.canBuyNow = function () {
    var p = this.localPlayer;
    if (!p || !p.alive || !this.match) return false;
    return this.match.isBuyTime(p) && this.world.inBuyZone(p.team, p.pos.x, p.pos.y, p.pos.z);
  };

  /* Build this frame's command from raw input. */
  Game.prototype.buildCommand = function (dt) {
    var k = this.settings.keys, ks = this.keys;
    var p = this.localPlayer;
    var blocked = this.ui.inMenu() || this.ui.buyOpen || !!this.ui.chatMode || this.paused;

    // look
    var sens = this.settings.sensitivity;
    if (p && p.scoped) sens *= (this.settings.zoomSensRatio || 1) / Math.max(1, P.zoomFactor(p));
    if (!blocked) {
      this.view.yaw -= this.mouse.dx * sens * M_YAW;
      this.view.pitch -= this.mouse.dy * sens * M_YAW * (this.settings.invertY ? -1 : 1);
    }
    this.mouse.dx = 0; this.mouse.dy = 0;
    this.view.yaw = M.wrapPI(this.view.yaw);
    this.view.pitch = M.clamp(this.view.pitch, -Math.PI / 2 + 0.015, Math.PI / 2 - 0.015);

    var cmd = {
      forward: 0, side: 0, jump: false, duck: false, walk: false,
      yaw: this.view.yaw, pitch: this.view.pitch,
      attack: false, attack2: false, reload: false, use: false, drop: false,
      inspect: false, slot: 0, wheel: 0, lastWeapon: false, seq: ++this.cmdSeq
    };
    if (blocked) { this.mouse.wheel = 0; this.wantSlot = 0; return cmd; }

    if (ks[k.forward]) cmd.forward += 1;
    if (ks[k.back]) cmd.forward -= 1;
    if (ks[k.right]) cmd.side += 1;
    if (ks[k.left]) cmd.side -= 1;
    cmd.jump = !!ks[k.jump];
    cmd.duck = !!ks[k.duck];
    cmd.walk = !!ks[k.walk];
    cmd.reload = !!ks[k.reload];
    cmd.use = !!ks[k.use];
    cmd.drop = !!ks[k.drop];
    cmd.inspect = !!ks[k.inspect];
    cmd.lastWeapon = !!ks[k.lastWeapon];
    cmd.attack = this.mouse.left;
    cmd.attack2 = this.mouse.right;
    cmd.slot = this.wantSlot || 0;
    cmd.wheel = this.mouse.wheel;
    this.wantSlot = 0;
    this.mouse.wheel = 0;
    return cmd;
  };

  /* ---------------------------------------------------------------
   * Match lifecycle
   * ------------------------------------------------------------- */
  Game.prototype.chooseMode = function (mode) {
    this.pendingMode = mode;
    if (mode === 'aim') this.pendingMap = 'arena';
    else if (CS.Maps.competitive.indexOf(this.pendingMap) < 0) this.pendingMap = 'bazaar';
  };
  Game.prototype.setMap = function (id) { this.pendingMap = id; };

  Game.prototype.makeRules = function () {
    var r = C.deepMerge(C.deepClone(C.DEFAULT_RULES), {});
    var preset = C.MODE_PRESETS[this.pendingMode];
    if (preset) r = C.deepMerge(r, C.deepClone(preset.rules));
    r.mode = this.pendingMode;
    return r;
  };

  Game.prototype.startSolo = function () {
    var self = this;
    this.online = false;
    this.isHost = true;
    this.rules = this.makeRules();
    this.ui.setLoading(0.1, 'Loading ' + CS.Maps.get(this.pendingMap).name);
    setTimeout(function () {
      self.prepareMap(self.pendingMap, function () {
        self.beginMatch();
        self.ui.hideLoading();
      });
    }, 30);
  };

  Game.prototype.beginMatch = function () {
    var self = this;
    this.match = new CS.Match({ map: this.map, world: this.world, rules: this.rules });
    this.rules = this.match.rules;

    var me = P.create({ id: this.localId, name: this.settings.name, local: true });
    me.team = this.pendingMode === 'aim' ? C.TEAM.DEF : C.TEAM.ATT;
    me.charId = me.team === C.TEAM.ATT ? this.settings.charATT : this.settings.charDEF;
    me.gloveId = this.settings.glove;
    this.match.addPlayer(me);
    this.localPlayer = me;

    if (this.online) {
      for (var i = 0; i < this.lobbyPlayers.length; i++) {
        var lp = this.lobbyPlayers[i];
        if (lp.id === this.localId || lp.bot) continue;
        var rp = P.create({ id: lp.id, name: lp.name, team: lp.team });
        rp.charId = lp.charId; rp.gloveId = lp.glove;
        this.match.addPlayer(rp);
      }
    }

    if (this.rules.botFill && this.pendingMode !== 'aim') {
      var size = this.rules.teamSize;
      if (this.pendingMode === 'deathmatch') size = Math.min(5, size);
      this.match.fillBots(size, this.rules.botDifficulty);
    }
    // balance the human onto a team that needs one
    this.match.balanceTeams();

    this.match.startWarmup(this.pendingMode === 'aim' || this.pendingMode === 'deathmatch' ? 2 : 5);
    this.view.yaw = me.yaw; this.view.pitch = 0;
    this.renderer.clearTransient();
    this.ui.show(null);
    this.running = true;
    this.paused = false;
    this.audio.init();
    this.audio.resume();
    this.audio.stopAmbience();
    this.requestLock();
    this.ui.toast(CS.Maps.get(this.mapId).name + ' — ' + (C.MODE_PRESETS[this.rules.mode] || {}).label, 'good');
  };

  Game.prototype.pause = function () {
    if (!this.running) return;
    this.paused = true;
    this.ui.show('pause');
    if (doc.exitPointerLock) doc.exitPointerLock();
  };
  Game.prototype.resume = function () {
    if (!this.running) { this.ui.show('mainmenu'); return; }
    this.paused = false;
    this.ui.show(null);
    this.requestLock();
  };
  Game.prototype.quitToMenu = function () {
    this.running = false;
    this.paused = false;
    this.match = null;
    this.localPlayer = null;
    if (this.online) this.leaveMatch();
    if (doc.exitPointerLock) doc.exitPointerLock();
    this.ui.show('mainmenu');
    this.audio.setMuffle(0);
    this.audio.startAmbience();
  };
  Game.prototype.playAgain = function () {
    if (this.online && this.isHost) { this.hostStart(); return; }
    this.startSolo();
  };

  /* ---------------------------------------------------------------
   * Online
   * ------------------------------------------------------------- */
  Game.prototype.createMatch = function () {
    var self = this;
    this.online = true;
    this.isHost = true;
    this.rules = this.makeRules();
    this.roomCode = C.makeRoomCode(5);
    this.localReady = true;
    this.lobbyPlayers = [{
      id: this.localId, name: this.settings.name, team: C.TEAM.ATT, ready: true, host: true,
      charId: this.settings.charATT, glove: this.settings.glove
    }];
    this.lobbyStatus = 'Opening room…';
    this.ui.show('lobby');
    this.setupNetHandlers();
    this.net.host(this.roomCode);
  };

  Game.prototype.joinMatch = function (code) {
    this.online = true;
    this.isHost = false;
    this.roomCode = code;
    this.localReady = false;
    this.lobbyPlayers = [];
    this.lobbyStatus = 'Connecting…';
    this.localId = 'p' + Math.random().toString(36).slice(2, 8);
    this.ui.show('lobby');
    this.setupNetHandlers();
    this.net.join(code);
  };

  Game.prototype.setupNetHandlers = function () {
    var self = this;
    this.net.handlers = {};
    this.net.on('ready', function () {
      self.lobbyStatus = 'Room open — share the code';
      self.ui.renderLobby();
    });
    this.net.on('codeTaken', function () {
      self.roomCode = C.makeRoomCode(5);
      self.net.close();
      self.net.host(self.roomCode);
    });
    this.net.on('connecting', function () { self.lobbyStatus = 'Finding host…'; self.ui.renderLobby(); });
    this.net.on('joinFailed', function (why) {
      self.ui.toast(why, 'bad');
      self.lobbyStatus = why;
      self.ui.renderLobby();
    });
    this.net.on('error', function (why) {
      self.ui.toast(why, 'bad');
      self.lobbyStatus = why + ' — you can still play offline with bots.';
      self.ui.renderLobby();
    });
    this.net.on('signalLost', function () {
      self.ui.toast('Lost the signalling server. Existing connections keep working.', 'bad');
    });
    this.net.on('open', function (peerId) { self.onPeerOpen(peerId); });
    this.net.on('close', function (peerId, why) { self.onPeerClose(peerId, why); });
    this.net.on('message', function (peerId, msg) { self.onNetMessage(peerId, msg); });
    this.net.on('voiceStream', function (peerId, stream) { self.voice.attachStream(peerId, stream); });
  };

  Game.prototype.onPeerOpen = function (peerId) {
    if (this.isHost) {
      this.net.send(peerId, { t: 'welcome', code: this.roomCode, proto: C.PROTOCOL }, true);
    } else {
      this.net.send(peerId, {
        t: 'hello', proto: C.PROTOCOL, id: this.localId, name: this.settings.name,
        charATT: this.settings.charATT, charDEF: this.settings.charDEF, glove: this.settings.glove
      }, true);
      this.lobbyStatus = 'Connected — waiting in the lobby';
      this.ui.renderLobby();
    }
  };

  Game.prototype.onPeerClose = function (peerId, why) {
    var pid = this.remote[peerId];
    if (pid) {
      if (this.isHost && this.match) {
        var pl = this.match.byId[pid];
        if (pl) {
          this.ui.addChat({ sys: true, text: pl.name + ' disconnected' });
          // a disconnected player becomes a bot so the round can finish
          if (this.match.phase !== C.PHASE.WARMUP) {
            pl.bot = true;
            CS.Bots.attach(pl, this.rules.botDifficulty);
            pl.name = pl.name + ' (bot)';
          } else {
            this.match.removePlayer(pid);
          }
        }
      }
      this.lobbyPlayers = this.lobbyPlayers.filter(function (p) { return p.id !== pid; });
      delete this.remote[peerId];
      delete this.peerOf[pid];
      this.voice.detach(peerId);
      if (this.isHost) this.broadcastLobby();
      this.ui.renderLobby();
    }
    if (!this.isHost && peerId === this.net.hostId) {
      this.ui.toast('Lost connection to the host.', 'bad');
      this.lobbyStatus = 'Disconnected from host';
      if (this.running) this.quitToMenu();
    }
  };

  Game.prototype.peerIdOf = function (player) { return this.peerOf[player.id] || null; };

  Game.prototype.onNetMessage = function (peerId, msg) {
    var self = this;
    switch (msg.t) {
      case 'welcome':
        break;
      case 'hello':
        if (!this.isHost) return;
        if (msg.proto !== C.PROTOCOL) {
          this.net.send(peerId, { t: 'kick', why: 'Different game version — both players need to reload.' }, true);
          return;
        }
        this.remote[peerId] = msg.id;
        this.peerOf[msg.id] = peerId;
        var team = this.smallestTeam();
        this.lobbyPlayers.push({
          id: msg.id, name: String(msg.name || 'Player').slice(0, 18), team: team, ready: false,
          charId: team === C.TEAM.ATT ? msg.charATT : msg.charDEF, glove: msg.glove
        });
        this.ui.addChat({ sys: true, text: msg.name + ' joined' });
        this.broadcastLobby();
        this.ui.renderLobby();
        break;
      case 'kick':
        this.ui.toast(msg.why || 'Removed from the match.', 'bad');
        this.leaveMatch();
        break;
      case 'lobby':
        if (this.isHost) return;
        this.lobbyPlayers = msg.players;
        this.rules = msg.rules;
        this.pendingMap = msg.map;
        this.pendingMode = msg.rules.mode;
        this.mapVotes = msg.votes || {};
        var me = this.lobbyPlayers.filter(function (p) { return p.id === self.localId; })[0];
        if (me) this.localReady = me.ready;
        this.lobbyStatus = 'In lobby';
        this.ui.renderLobby();
        this.net.peerList().forEach(function (pid) { self.net.connectPeer(pid); });
        break;
      case 'ready':
        if (!this.isHost) return;
        this.setLobbyField(this.remote[peerId], 'ready', !!msg.v);
        this.broadcastLobby();
        this.ui.renderLobby();
        break;
      case 'team':
        if (!this.isHost) return;
        this.setLobbyField(this.remote[peerId], 'team', msg.v);
        this.broadcastLobby();
        this.ui.renderLobby();
        break;
      case 'start':
        if (this.isHost) return;
        this.rules = msg.rules;
        this.pendingMap = msg.map;
        this.lobbyPlayers = msg.players;
        this.clientStart();
        break;
      case 'cmd': {
        if (!this.isHost || !this.match) return;
        var pid = this.remote[peerId];
        if (!pid) return;
        var pl = this.match.byId[pid];
        if (!pl) return;
        var clean = sanitizeCommand(msg.c);
        if (!clean) return;
        // the host decides where the shot came from — clients only send intent
        clean.lagTime = this.match.time - (this.net.pingOf(peerId) / 1000) - C.INTERP_DELAY;
        pl.ping = this.net.pingOf(peerId);
        pl.afk = 0;
        this.pendingCommands[pid] = clean;
        break;
      }
      case 'buy': {
        if (!this.isHost || !this.match) return;
        var bp = this.match.byId[this.remote[peerId]];
        if (!bp) return;
        if (typeof msg.id !== 'string' || !W.get(msg.id)) return;
        // buy spam would let a client brute-force the economy checks
        var now = this.match.time;
        if (bp._buyWindow === undefined || now - bp._buyWindow > 1) { bp._buyWindow = now; bp._buyCount = 0; }
        if (++bp._buyCount > 12) return;
        this.match.buyFor(bp, msg.id);
        break;
      }
      case 'snap':
        if (this.isHost) return;
        this.applySnapshot(msg);
        break;
      case 'ev':
        if (this.isHost) return;
        for (var i = 0; i < msg.e.length; i++) this.handleEvent(msg.e[i], true);
        break;
      case 'chat':
        this.onChat(msg, peerId);
        break;
      case 'vote':
        if (!this.isHost) return;
        this.mapVotes[this.remote[peerId]] = msg.map;
        this.broadcastLobby();
        break;
    }
  };

  /* Clients are never trusted with positions, health or damage — only with a
   * command struct, and even that is bounds-checked before it is simulated. */
  var CMD_BOOLS = ['jump', 'duck', 'walk', 'attack', 'attack2', 'reload', 'use', 'drop', 'inspect', 'lastWeapon'];
  function sanitizeCommand(c) {
    if (!c || typeof c !== 'object') return null;
    var out = {};
    var f = +c.forward, sd = +c.side, yaw = +c.yaw, pitch = +c.pitch;
    if (!isFinite(yaw) || !isFinite(pitch)) return null;
    out.forward = isFinite(f) ? M.clamp(f, -1, 1) : 0;
    out.side = isFinite(sd) ? M.clamp(sd, -1, 1) : 0;
    out.yaw = M.wrapPI(yaw);
    out.pitch = M.clamp(pitch, -Math.PI / 2, Math.PI / 2);
    for (var i = 0; i < CMD_BOOLS.length; i++) out[CMD_BOOLS[i]] = !!c[CMD_BOOLS[i]];
    var slot = c.slot | 0;
    out.slot = (slot >= 1 && slot <= 5) ? slot : 0;
    var wheel = c.wheel | 0;
    out.wheel = M.clamp(wheel, -1, 1);
    out.seq = c.seq | 0;
    return out;
  }

  Game.prototype.smallestTeam = function () {
    var a = 0, d = 0;
    for (var i = 0; i < this.lobbyPlayers.length; i++) {
      if (this.lobbyPlayers[i].team === C.TEAM.ATT) a++; else d++;
    }
    return a <= d ? C.TEAM.ATT : C.TEAM.DEF;
  };
  Game.prototype.setLobbyField = function (id, field, value) {
    for (var i = 0; i < this.lobbyPlayers.length; i++) {
      if (this.lobbyPlayers[i].id === id) { this.lobbyPlayers[i][field] = value; return; }
    }
  };
  Game.prototype.broadcastLobby = function () {
    if (!this.isHost) return;
    this.net.broadcast({
      t: 'lobby', players: this.lobbyPlayers, rules: this.rules,
      map: this.pendingMap, votes: this.mapVotes
    }, true);
  };

  Game.prototype.toggleReady = function () {
    this.localReady = !this.localReady;
    if (this.isHost) {
      this.setLobbyField(this.localId, 'ready', this.localReady);
      this.broadcastLobby();
    } else {
      this.net.broadcast({ t: 'ready', v: this.localReady }, true);
    }
    this.ui.renderLobby();
  };
  Game.prototype.requestTeam = function (team) {
    if (this.isHost) {
      this.setLobbyField(this.localId, 'team', team);
      this.broadcastLobby();
      if (this.match) {
        var p = this.match.byId[this.localId];
        if (p) this.match.setTeam(p, team);
      }
    } else {
      this.net.broadcast({ t: 'team', v: team }, true);
    }
    this.ui.renderLobby();
  };
  Game.prototype.voteMap = function (id) {
    if (this.isHost) { this.pendingMap = id; this.broadcastLobby(); }
    else this.net.broadcast({ t: 'vote', map: id }, true);
    this.ui.renderLobby();
  };
  Game.prototype.addBot = function (team) {
    if (!this.isHost) return;
    var name = CS.Bots.nextName();
    this.lobbyPlayers.push({ id: 'bot' + Math.random().toString(36).slice(2, 7), name: name,
      team: team, ready: true, bot: true, skill: this.rules.botDifficulty });
    this.broadcastLobby();
    this.ui.renderLobby();
  };
  Game.prototype.removeBot = function () {
    if (!this.isHost) return;
    for (var i = this.lobbyPlayers.length - 1; i >= 0; i--) {
      if (this.lobbyPlayers[i].bot) { this.lobbyPlayers.splice(i, 1); break; }
    }
    this.broadcastLobby();
    this.ui.renderLobby();
  };
  Game.prototype.setRule = function (key, value) {
    if (!this.isHost) return;
    this.rules[key] = value;
    if (key === 'winRounds') {
      this.rules.maxRounds = (value - 1) * 2;
      this.rules.halftimeAt = value - 1;
    }
    this.broadcastLobby();
  };

  Game.prototype.hostStart = function () {
    var self = this;
    if (!this.isHost) return;
    this.rules.mode = this.pendingMode;
    this.net.broadcast({ t: 'start', rules: this.rules, map: this.pendingMap, players: this.lobbyPlayers }, true);
    this.ui.setLoading(0.2, 'Loading map');
    setTimeout(function () {
      self.prepareMap(self.pendingMap, function () {
        self.beginMatchOnline();
        self.ui.hideLoading();
      });
    }, 30);
  };

  Game.prototype.clientStart = function () {
    var self = this;
    this.ui.setLoading(0.2, 'Loading map');
    setTimeout(function () {
      self.prepareMap(self.pendingMap, function () {
        self.beginMatchOnline();
        self.ui.hideLoading();
      });
    }, 30);
  };

  Game.prototype.beginMatchOnline = function () {
    this.match = new CS.Match({ map: this.map, world: this.world, rules: this.rules });
    this.rules = this.match.rules;

    for (var i = 0; i < this.lobbyPlayers.length; i++) {
      var lp = this.lobbyPlayers[i];
      var p = P.create({ id: lp.id, name: lp.name, team: lp.team, local: lp.id === this.localId, bot: !!lp.bot });
      p.charId = lp.team === C.TEAM.ATT ? (lp.charId || 'syn_default') : (lp.charId || 'van_default');
      p.gloveId = lp.glove || 'default';
      if (lp.bot && this.isHost) CS.Bots.attach(p, lp.skill || this.rules.botDifficulty);
      this.match.addPlayer(p);
      if (lp.id === this.localId) this.localPlayer = p;
    }
    if (!this.localPlayer) {
      var me = P.create({ id: this.localId, name: this.settings.name, team: C.TEAM.ATT, local: true });
      this.match.addPlayer(me);
      this.localPlayer = me;
    }
    if (this.isHost && this.rules.botFill) this.match.fillBots(this.rules.teamSize, this.rules.botDifficulty);

    this.match.startWarmup(6);
    this.view.yaw = this.localPlayer.yaw;
    this.renderer.clearTransient();
    this.ui.show(null);
    this.running = true; this.paused = false;
    this.audio.init(); this.audio.resume(); this.audio.stopAmbience();
    this.requestLock();
    if (this.settings.voiceEnabled) this.enableVoice(false);
  };

  Game.prototype.leaveMatch = function () {
    this.net.close();
    this.voice.stop();
    this.online = false;
    this.running = false;
    this.match = null;
    this.lobbyPlayers = [];
    this.ui.show('mainmenu');
  };

  /* ---------------------------------------------------------------
   * Snapshots
   * ------------------------------------------------------------- */
  Game.prototype.sendSnapshot = function () {
    if (!this.isHost || !this.match || !this.online) return;
    var m = this.match;
    var players = [];
    for (var i = 0; i < m.players.length; i++) players.push(P.snapshot(m.players[i]));
    var meta = [];
    for (var k = 0; k < m.players.length; k++) {
      var p = m.players[k];
      meta.push([p.id, p.money, p.kills, p.deaths, p.assists, p.score, p.mvps,
                 Math.round(p.damage), p.headshots, Math.round(p.ping),
                 p.primary ? p.primary.id : 0, p.primary ? p.primary.mag : 0, p.primary ? p.primary.reserve : 0,
                 p.secondary ? p.secondary.id : 0, p.secondary ? p.secondary.mag : 0, p.secondary ? p.secondary.reserve : 0,
                 p.grenades.map(function (g) { return g.id + ':' + g.count; }).join(','),
                 p.kit ? 1 : 0, p.cur]);
    }
    this.net.broadcast({
      t: 'snap', tm: m.time, p: players, m: meta, s: m.stateSnapshot(),
      d: m.droppedWeapons.map(function (d) { return [d.id, d.wid, d.x, d.y, d.z, d.yaw]; }),
      g: m.nades.smokes.map(function (s) { return [s.id, s.pos.x, s.pos.y, s.pos.z, s.radius, s.opacity]; }),
      f: m.nades.fires.map(function (f) { return [f.id, f.pos.x, f.pos.y, f.pos.z, f.radius, f.grow]; }),
      n: m.nades.proj.map(function (g) { return [g.id, g.wid, g.pos.x, g.pos.y, g.pos.z, g.spin]; })
    }, false);
  };

  Game.prototype.applySnapshot = function (msg) {
    var m = this.match;
    if (!m) return;
    this.serverTime = msg.tm;

    var seen = {};
    for (var i = 0; i < msg.p.length; i++) {
      var s = msg.p[i];
      var id = s[0];
      seen[id] = true;
      var p = m.byId[id];
      if (!p) {
        p = P.create({ id: id, name: id, team: s[1] });
        m.addPlayer(p);
      }
      if (id === this.localId) {
        // authoritative correction for our own prediction
        var dx = s[3] / 64 - p.pos.x, dy = s[4] / 64 - p.pos.y, dz = s[5] / 64 - p.pos.z;
        var err = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (err > 2.2) { p.pos.x = s[3] / 64; p.pos.y = s[4] / 64; p.pos.z = s[5] / 64; this.predictError.x = this.predictError.y = this.predictError.z = 0; }
        else if (err > 0.06) { this.predictError.x = dx; this.predictError.y = dy; this.predictError.z = dz; }
        p.alive = !!s[2]; p.health = s[8]; p.armor = s[9];
        p.team = s[1];
        var fl = s[10];
        p.helmet = !!(fl & 4); p.bomb = !!(fl & 8);
      } else {
        // buffer for interpolation
        p.netPrev = p.netNext || null;
        p.netNext = { t: msg.tm, x: s[3] / 64, y: s[4] / 64, z: s[5] / 64, yaw: s[6] / 1000, pitch: s[7] / 1000 };
        P.applySnapshot(p, s);
      }
    }
    for (var k = m.players.length - 1; k >= 0; k--) {
      if (!seen[m.players[k].id]) m.removePlayer(m.players[k].id);
    }

    for (var q = 0; q < msg.m.length; q++) {
      var md = msg.m[q];
      var pp = m.byId[md[0]];
      if (!pp) continue;
      pp.money = md[1]; pp.kills = md[2]; pp.deaths = md[3]; pp.assists = md[4];
      pp.score = md[5]; pp.mvps = md[6]; pp.damage = md[7]; pp.headshots = md[8]; pp.ping = md[9];
      pp.primary = md[10] ? { id: md[10], mag: md[11], reserve: md[12] } : null;
      pp.secondary = md[13] ? { id: md[13], mag: md[14], reserve: md[15] } : null;
      pp.grenades = md[16] ? md[16].split(',').filter(Boolean).map(function (g) {
        var parts = g.split(':'); return { id: parts[0], count: parseInt(parts[1], 10) };
      }) : [];
      pp.kit = !!md[17];
      if (pp !== this.localPlayer) pp.cur = md[18];   // our own selection stays predicted
    }

    var st = msg.s;
    m.time = st.time; m.round = st.round; m.phase = st.phase; m.phaseTime = st.phaseTime;
    m.score = st.score; m.roundWinner = st.winner; m.roundReason = st.reason;
    m.sideSwapped = st.swapped; m.overtimeRound = st.ot; m.matchOver = st.over;
    m.bomb = st.bomb;
    m.dmScore = st.dmScore;

    m.droppedWeapons = msg.d.map(function (d) { return { id: d[0], wid: d[1], x: d[2], y: d[3], z: d[4], yaw: d[5] }; });
    m.nades.smokes = msg.g.map(function (s2) {
      return { id: s2[0], pos: { x: s2[1], y: s2[2], z: s2[3] }, radius: s2[4], opacity: s2[5] };
    });
    m.nades.fires = msg.f.map(function (f) {
      return { id: f[0], pos: { x: f[1], y: f[2], z: f[3] }, radius: f[4], grow: f[5] };
    });
    m.nades.proj = msg.n.map(function (g2) {
      return { id: g2[0], wid: g2[1], pos: { x: g2[2], y: g2[3], z: g2[4] }, spin: g2[5] };
    });
    this.world.smokes = m.nades.smokes;
  };

  /* ---------------------------------------------------------------
   * Chat
   * ------------------------------------------------------------- */
  Game.prototype.sendChat = function (text, teamOnly) {
    var p = this.localPlayer;
    var msg = {
      t: 'chat', name: this.settings.name, text: text,
      team: p ? p.team : 0, scope: teamOnly ? 'team' : null
    };
    if (this.online) this.net.broadcast(msg, true);
    this.onChat(msg, null);
  };
  Game.prototype.onChat = function (msg, fromPeer) {
    var p = this.localPlayer;
    if (msg.scope === 'team' && p && msg.team && msg.team !== p.team) return;
    this.ui.addChat({ name: msg.name, text: msg.text, team: msg.team, scope: msg.scope });
    if (this.isHost && this.online && fromPeer) this.net.broadcast(msg, true, fromPeer);
  };

  /* ---------------------------------------------------------------
   * Settings plumbing
   * ------------------------------------------------------------- */
  Game.prototype.setSetting = function (path, value) {
    var parts = path.split('.');
    var obj = this.settings;
    for (var i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
    obj[parts[parts.length - 1]] = value;
    C.saveSettings(this.settings);
    if (path === 'quality') this.applyQuality(value);
    if (path.indexOf('Volume') >= 0) this.audio.setVolumes();
    if (path === 'resolutionScale' && this.renderer) this.renderer.resize(true);
    if (path === 'voiceEnabled' && value) this.enableVoice(true);
  };
  Game.prototype.setKey = function (action, code) {
    this.settings.keys[action] = code;
    C.saveSettings(this.settings);
  };
  Game.prototype.resetSettings = function () {
    this.settings = C.resetSettings();
    this.audio.settings = this.settings;
    this.voice.settings = this.settings;
    this.ui.settings = this.settings;
    if (this.renderer) { this.renderer.settings = this.settings; this.applyQuality(this.settings.quality); }
    this.audio.setVolumes();
  };
  Game.prototype.applyQuality = function (q) {
    var self = this;
    if (!this.renderer) return;
    this.renderer.applyQuality(q);
    if (this.world && this.map) {
      this.ui.setLoading(0.5, 'Rebuilding lighting');
      setTimeout(function () {
        self.renderer.loadMap(self.world, self.map);
        self.ui.hideLoading();
      }, 20);
    }
  };
  Game.prototype.onNameChanged = function () {
    if (this.localPlayer) this.localPlayer.name = this.settings.name;
    if (this.isHost) { this.setLobbyField(this.localId, 'name', this.settings.name); this.broadcastLobby(); }
  };
  Game.prototype.setSkin = function (weaponId, skinId) {
    this.settings.skins[weaponId] = skinId;
    C.saveSettings(this.settings);
  };
  Game.prototype.setGlove = function (id) {
    this.settings.glove = id; C.saveSettings(this.settings);
    if (this.localPlayer) this.localPlayer.gloveId = id;
  };
  Game.prototype.setCharacter = function (team, id) {
    if (team === 1) this.settings.charATT = id; else this.settings.charDEF = id;
    C.saveSettings(this.settings);
    if (this.localPlayer && this.localPlayer.team === team) this.localPlayer.charId = id;
  };

  Game.prototype.enableVoice = function (explicit) {
    var self = this;
    if (!this.settings.voiceEnabled && !explicit) return;
    this.voice.request().then(function () {
      self.ui.toast('Microphone enabled. Hold ' + CS.keyLabel(self.settings.keys.voice) + ' to talk.', 'good');
      if (self.ui.screen === 'settings') self.ui.renderSettings();
    }).catch(function () {
      self.ui.toast(self.voice.error || 'Microphone unavailable.', 'bad');
      if (self.ui.screen === 'settings') self.ui.renderSettings();
    });
  };

  Game.prototype.buy = function (id) {
    var p = this.localPlayer;
    if (!p || !this.match) return;
    if (this.isHost || !this.online) {
      var res = this.match.buyFor(p, id);
      if (res.ok) this.audio.local('buy');
      else { this.audio.local('deny'); this.ui.toast(res.why || 'Cannot buy that.', 'bad'); }
    } else {
      this.net.broadcast({ t: 'buy', id: id }, true);
      this.audio.local('buy');
    }
  };

  /* Show a +/- next to the wallet whenever it moves. */
  Game.prototype.trackMoney = function () {
    var p = this.localPlayer;
    if (!p) return;
    if (this._lastMoney === undefined) { this._lastMoney = p.money; return; }
    var delta = p.money - this._lastMoney;
    this._lastMoney = p.money;
    if (!delta) return;
    var node = this.ui.n.moneyDelta;
    if (!node) return;
    node.textContent = (delta > 0 ? '+$' : '-$') + Math.abs(delta);
    node.className = 'delta show ' + (delta > 0 ? 'plus' : 'minus');
    clearTimeout(this._moneyT);
    this._moneyT = setTimeout(function () { node.className = 'delta'; }, 1600);
  };

  /* Enemies show on radar only while a living teammate can actually see them.
   * The line-of-sight sweep is refreshed a few times a second, not per frame. */
  Game.prototype.radarSeesEnemy = function (p) {
    var m = this.match;
    if (!m) return false;
    var now = m.time;
    if (!this._radarSeen || now - this._radarSeenAt > 0.12) {
      this._radarSeen = this.computeRadarVisibility();
      this._radarSeenAt = now;
    }
    var v = this._radarSeen[p.id];
    return !!(v && now - v < 2.2);      // last known position lingers briefly
  };

  Game.prototype.computeRadarVisibility = function () {
    var m = this.match;
    var seen = this._radarSeen || {};
    var view = this.spectateTarget || this.localPlayer;
    if (!view) return seen;
    var team = m.teamPlayers(view.team, true);
    var foes = m.teamPlayers(view.team === C.TEAM.ATT ? C.TEAM.DEF : C.TEAM.ATT, true);
    for (var e = 0; e < foes.length; e++) {
      var p = foes[e];
      for (var i = 0; i < team.length; i++) {
        var t = team[i];
        if (M.vdist(t.pos, p.pos) > 60) continue;
        var f = M.angleVectors(t.yaw, t.pitch);
        var dx = p.pos.x - t.pos.x, dz = p.pos.z - t.pos.z;
        var d = Math.sqrt(dx * dx + dz * dz) || 1;
        if ((f.x * dx + f.z * dz) / d < -0.1) continue;
        if (this.world.canSee(t.pos.x, t.pos.y + t.eye, t.pos.z,
                              p.pos.x, p.pos.y + p.eye, p.pos.z, m.nades.smokes)) {
          seen[p.id] = m.time;
          break;
        }
      }
    }
    return seen;
  };

  CS.Game = Game;
})(typeof window !== 'undefined' ? window : globalThis);
