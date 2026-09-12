/* =============================================================
 * BREACHPOINT — main loop, camera, viewmodel, event presentation
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C, W = CS.W, P = CS.P, G = CS.G;
  var Game = CS.Game;
  var doc = root.document;

  /* ---------------------------------------------------------------
   * Loop
   * ------------------------------------------------------------- */
  Game.prototype.startLoop = function () {
    var self = this;
    this.lastTime = (root.performance || Date).now();
    function frame(now) {
      root.requestAnimationFrame(frame);
      var dt = (now - self.lastTime) / 1000;
      if (dt > 0.25) dt = 0.25;
      var cap = self.settings.fpsCap;
      if (cap > 0 && dt < 1 / cap - 0.0015) return;
      self.lastTime = now;
      var t0 = (root.performance || Date).now();
      try { self.frame(dt, now); } catch (e) {
        if (!self._errored) { self._errored = true; console.error(e); self.ui.toast('Something went wrong: ' + e.message, 'bad'); }
      }
      var t1 = (root.performance || Date).now();
      self.frameMs = self.frameMs * 0.9 + (t1 - t0) * 0.1;
      self.fpsSamples.push(dt);
      if (self.fpsSamples.length > 30) self.fpsSamples.shift();
      var sum = 0;
      for (var i = 0; i < self.fpsSamples.length; i++) sum += self.fpsSamples[i];
      self.fps = self.fpsSamples.length / Math.max(1e-4, sum);
    }
    root.requestAnimationFrame(frame);
    this.audio.init();
    this.audio.startAmbience();
  };

  Game.prototype.frame = function (dt, now) {
    if (!this.running || !this.match) {
      this.renderMenuBackdrop(dt);
      return;
    }
    var m = this.match;

    // ---- simulation at a fixed rate
    // Enough substeps that the game still runs at real speed down to ~5 fps;
    // past that we drop the backlog rather than spiral.
    this.acc += dt;
    var steps = 0, MAX_STEPS = 14;
    while (this.acc >= C.TICK_DT && steps < MAX_STEPS) {
      this.acc -= C.TICK_DT;
      this.simulate(C.TICK_DT);
      steps++;
    }
    if (steps === MAX_STEPS) this.acc = 0;

    // ---- presentation
    this.processEvents();
    this.updateSpectate(dt);
    this.updateCamera(dt);
    this.updateViewmodel(dt);
    this.updateAudioWorld(dt);
    this.updateOverlays(dt);
    this.renderer.updateFX(dt, this.world);
    this.interpolateRemotes();

    var scene = {
      camera: this.camera, players: m.players, local: this.localPlayer,
      time: m.time, world: this.world, nades: m.nades, bomb: m.bomb,
      dropped: m.droppedWeapons, targets: m.rules.mode === 'aim' ? m.targets : null,
      viewmodel: this.vm, thirdPerson: !!this.freeCam
    };
    var draws = this.renderer.render(scene);

    this.trackMoney();
    this.ui.updateHUD();
    if (this.settings.hud.radar) this.ui.drawRadar(scene);
    this.ui.drawCrosshair(this.crosshairSpread());
    this.ui.updatePerf(this.fps, this.frameMs, draws, this.online ? {
      ping: this.isHost ? 0 : this.net.pingOf(this.net.hostId), in: this.net.rateIn, out: this.net.rateOut
    } : null);

    if (this.online) {
      if (now - this.lastPingTime > 1000) { this.net.pingAll(); this.lastPingTime = now; }
      if (this.isHost && now - this.lastSnapSent > 1000 / C.SNAPSHOT_RATE) {
        var withMeta = now - this.lastMetaSent > 200;
        if (withMeta) this.lastMetaSent = now;
        this.sendSnapshot(withMeta);
        this.flushEventsToClients();
        this.lastSnapSent = now;
      }
    }
    this.voice.update();
    this.updateVoiceState();
  };

  /* Slowly orbiting shot of the map behind the menus. */
  Game.prototype.renderMenuBackdrop = function (dt) {
    if (!this.renderer || !this.map) return;
    this.menuT = (this.menuT || 0) + dt * 0.06;
    var b = this.map.bounds;
    var cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    var r = Math.max(b.x1 - b.x0, b.z1 - b.z0) * 0.42;
    this.camera.x = cx + Math.cos(this.menuT) * r;
    this.camera.z = cz + Math.sin(this.menuT) * r;
    this.camera.y = 16 + Math.sin(this.menuT * 0.7) * 3;
    this.camera.yaw = Math.atan2(-(cz - this.camera.z), cx - this.camera.x);
    this.camera.pitch = -0.42;
    this.camera.roll = 0; this.camera.zoom = 1;
    this.renderer.updateFX(dt, this.world);
    this.renderer.render({
      camera: this.camera, players: [], local: null, time: this.menuT,
      world: this.world, nades: null, bomb: null, dropped: null, viewmodel: null
    });
  };

  Game.prototype.simulate = function (dt) {
    var m = this.match;
    var cmd = this.buildCommand(dt);
    this.lastCmd = cmd;

    if (this.isHost || !this.online) {
      if (this.localPlayer) this.pendingCommands[this.localPlayer.id] = cmd;
      m.tick(dt, this.pendingCommands);
      // commands persist until replaced so a dropped packet does not freeze a player
      for (var id in this.pendingCommands) {
        var p = m.byId[id];
        if (p && !p.bot) p.afk = (p.afk || 0) + dt;
      }
      this.checkAfk(dt);
    } else {
      this.predictLocal(cmd, dt);
      m.time += dt;
      if (m.phaseTime > 0) m.phaseTime -= dt;
      G.stepProjectilesOnly(m.nades, this.world, dt, m.time);
      var now = (root.performance || Date).now();
      if (now - this.lastCmdSent > 1000 / 30) {
        this.net.broadcast({ t: 'cmd', c: cmd }, false);
        this.lastCmdSent = now;
      }
    }
  };

  /* Client-side prediction: run our own movement locally so aiming and
   * strafing stay instant, then reconcile against the host's snapshot. */
  Game.prototype.predictLocal = function (cmd, dt) {
    var p = this.localPlayer, m = this.match;
    if (!p || !p.alive) return;
    var frozen = (m.phase === C.PHASE.FREEZE || m.phase === C.PHASE.ENDED ||
                  m.phase === C.PHASE.HALFTIME || m.phase === C.PHASE.MATCH_END);
    P.move(p, cmd, this.world, dt, frozen);
    P.updateWeapon(p, dt);
    p.pendingFallDamage = 0;

    // smoothly absorb the correction the host sent us
    var e = this.predictError;
    if (e.x || e.y || e.z) {
      var k = Math.min(1, dt * 9);
      p.pos.x += e.x * k; p.pos.y += e.y * k; p.pos.z += e.z * k;
      e.x -= e.x * k; e.y -= e.y * k; e.z -= e.z * k;
      if (Math.abs(e.x) < 0.001) e.x = 0;
      if (Math.abs(e.y) < 0.001) e.y = 0;
      if (Math.abs(e.z) < 0.001) e.z = 0;
    }

    if (frozen) return;
    // local feedback for firing; the host decides whether anything was hit
    if (cmd.slot) P.switchSlotNumber(p, cmd.slot);
    if (cmd.wheel) P.nextWeapon(p, cmd.wheel > 0 ? 1 : -1);
    if (cmd.reload && !p.reloadHeld) P.startReload(p);
    p.reloadHeld = !!cmd.reload;
    var wdef = P.curWeapon(p);
    if (cmd.attack2 && !p.attack2Held && wdef.scope) P.toggleScope(p);
    p.attack2Held = !!cmd.attack2;
    if (p.cur.indexOf('nade:') !== 0 && wdef.cls !== 'bomb') {
      if (cmd.attack) {
        var shot = P.tryFire(p, false);
        if (shot && !shot.dryFire && !shot.melee) this.localShotFeedback(p, shot);
        else if (shot && shot.dryFire) this.audio.local('dry');
      } else P.releaseTrigger(p);
    }
  };

  Game.prototype.localShotFeedback = function (p, shot) {
    this.pendingLocalFx = true;
    var eye = P.eyePos(p);
    var fwd = M.angleVectors(shot.yaw, shot.pitch);
    var end = {
      x: eye.x + fwd.x * 60, y: eye.y + fwd.y * 60, z: eye.z + fwd.z * 60
    };
    var hit = this.world.rayWorld(eye.x, eye.y, eye.z, fwd.x, fwd.y, fwd.z, 60);
    if (hit) { end.x = hit.x; end.y = hit.y; end.z = hit.z; }
    this.onLocalShotFx(p, shot.weapon, eye, end);
  };

  Game.prototype.checkAfk = function (dt) {
    var m = this.match;
    if (!this.online || !this.isHost || !m || !this.rules.afkKickSeconds) return;
    this.afkTimer = (this.afkTimer || 0) + dt;
    if (this.afkTimer < 5) return;
    this.afkTimer = 0;
    for (var i = 0; i < m.players.length; i++) {
      var p = m.players[i];
      if (p.bot || p.local || p.id === this.localId) continue;
      if (p.afk > this.rules.afkKickSeconds) {
        this.ui.addChat({ sys: true, text: p.name + ' was idle and is now controlled by a bot' });
        p.bot = true;
        CS.Bots.attach(p, this.rules.botDifficulty);
        p.afk = 0;
      }
    }
  };

  /* Interpolate everyone else ~90 ms in the past for smooth motion. */
  Game.prototype.interpolateRemotes = function () {
    if (this.isHost || !this.online || !this.match) return;
    var target = this.serverTime - C.INTERP_DELAY;
    for (var i = 0; i < this.match.players.length; i++) {
      var p = this.match.players[i];
      if (p === this.localPlayer || !p.netNext) continue;
      var a = p.netPrev, b = p.netNext;
      if (!a) { p.pos.x = b.x; p.pos.y = b.y; p.pos.z = b.z; continue; }
      var span = b.t - a.t;
      var t = span > 1e-4 ? M.clamp((target - a.t) / span, 0, 1.4) : 1;
      p.pos.x = a.x + (b.x - a.x) * t;
      p.pos.y = a.y + (b.y - a.y) * t;
      p.pos.z = a.z + (b.z - a.z) * t;
      p.yaw = a.yaw + M.angleDelta(a.yaw, b.yaw) * t;
      p.pitch = a.pitch + (b.pitch - a.pitch) * t;
    }
  };

  /* ---------------------------------------------------------------
   * Events
   * ------------------------------------------------------------- */
  var NET_EVENTS = {
    shot: 1, kill: 1, hurt: 1, step: 1, roundStart: 1, roundEnd: 1, roundLive: 1,
    halftime: 1, matchEnd: 1, overtime: 1, bombPlanted: 1, bombDefused: 1, bombExploded: 1,
    bombDropped: 1, bombPickup: 1, plantStart: 1, plantAbort: 1, defuseStart: 1, defuseAbort: 1,
    he: 1, flash: 1, smoke: 1, fire: 1, flashed: 1, throw: 1, melee: 1, jump: 1, land: 1,
    spawn: 1, dry: 1, pickup: 1, drop: 1, reload: 1, join: 1, leave: 1, bombAssigned: 1
  };

  Game.prototype.processEvents = function () {
    var m = this.match;
    if (!m) return;
    for (var i = 0; i < m.events.length; i++) this.handleEvent(m.events[i], false);
    this.pendingLocalFx = false;
    if (this.isHost && this.online) {
      for (var k = 0; k < m.events.length; k++) {
        if (NET_EVENTS[m.events[k].t]) this.eventQueue.push(this.stripEvent(m.events[k]));
      }
      // a stalled link must not let the queue grow unbounded
      if (this.eventQueue.length > 240) this.eventQueue.splice(0, this.eventQueue.length - 240);
    }
    m.events.length = 0;
  };

  Game.prototype.stripEvent = function (e) {
    var o = {};
    for (var k in e) {
      if (k === 'impacts' || k === 'groups') continue;
      var v = e[k];
      if (typeof v === 'number') o[k] = Math.round(v * 1000) / 1000;
      else if (typeof v !== 'object' || v === null) o[k] = v;
    }
    if (e.impacts && e.impacts.length) {
      o.im = e.impacts.slice(0, 3).map(function (p) {
        return [Math.round(p.x * 100) / 100, Math.round(p.y * 100) / 100, Math.round(p.z * 100) / 100,
                p.nx, p.ny, p.nz, p.box ? p.box.mat : 'concrete'];
      });
    }
    return o;
  };

  Game.prototype.flushEventsToClients = function () {
    if (!this.eventQueue.length) return;
    this.net.broadcast({ t: 'ev', e: this.eventQueue }, true);
    this.eventQueue = [];
  };

  Game.prototype.handleEvent = function (e, fromNet) {
    var m = this.match, R = this.renderer, A = this.audio;
    var lp = this.localPlayer;
    var view = this.spectateTarget || lp;
    switch (e.t) {
      case 'shot': {
        var shooter = m.byId[e.id];
        var w = W.get(e.wid);
        if (!w) break;
        var isLocal = shooter === lp && !this.freeCam;
        if (isLocal) {
          // as host (or offline) the authoritative shot is also our own trigger pull
          if (!fromNet && !this.pendingLocalFx) {
            this.onLocalShotFx(shooter, w, { x: e.ox, y: e.oy, z: e.oz },
                               { x: e.ex, y: e.ey, z: e.ez });
          }
        } else {
          A.gunshot(w, e.ox, e.oy, e.oz, false);
          if (shooter) this.spawnRemoteMuzzle(shooter, e);
        }
        if (e.im) {
          for (var q = 0; q < e.im.length; q++) {
            var im = e.im[q];
            R.spawnImpact(im[0], im[1], im[2], im[3], im[4], im[5], im[6], 1);
            A.impact(im[6], im[0], im[1], im[2]);
          }
        } else if (e.impacts) {
          for (var s = 0; s < e.impacts.length; s++) {
            var ip = e.impacts[s];
            R.spawnImpact(ip.x, ip.y, ip.z, ip.nx, ip.ny, ip.nz, ip.box ? ip.box.mat : 'concrete', ip.power);
            A.impact(ip.box ? ip.box.mat : 'concrete', ip.x, ip.y, ip.z);
          }
        }
        if (!isLocal && e.ex !== undefined) {
          R.tracers.add(e.ox, e.oy, e.oz, e.ex, e.ey, e.ez, 300, 0.05);
          // whiz-by when the round passes close to the camera
          if (view) {
            var closest = this.pointSegDist(view.pos.x, view.pos.y + view.eye, view.pos.z,
                                            e.ox, e.oy, e.oz, e.ex, e.ey, e.ez);
            if (closest < 2.6 && closest > 0.3) A.bulletWhiz(view.pos.x, view.pos.y + view.eye, view.pos.z);
          }
        }
        break;
      }
      case 'melee': {
        if (e.id === (lp && lp.id)) {
          this.vm.anim = 'fire'; this.vm.animT = 0;
          this.vm.kick = Math.min(1.2, this.vm.kick + 0.8);
          A.local(e.hit ? 'hitmarker' : 'switch');
        } else {
          A.impact('metal', e.x, e.y, e.z);
        }
        break;
      }
      case 'hurt': {
        var victim = m.byId[e.v], attacker = e.a ? m.byId[e.a] : null;
        if (e.target) {
          R.spawnBlood(e.x, e.y, e.z, 0, 0.4, 0, e.dmg, null);
          A.impact('wood', e.x, e.y, e.z);
        }
        if (victim) {
          var dir = attacker ? {
            x: victim.pos.x - attacker.pos.x, y: 0.35, z: victim.pos.z - attacker.pos.z
          } : { x: 0, y: 1, z: 0 };
          var dl = Math.sqrt(dir.x * dir.x + dir.z * dir.z) || 1;
          R.spawnBlood(e.x, e.y, e.z, dir.x / dl * 0.6, dir.y, dir.z / dl * 0.6, e.dmg, this.world);
          A.fleshHit(e.x, e.y, e.z, e.group === 0, e.armor > 0);
          victim.hitFlash = 0.35;
        }
        if (attacker === lp && victim !== lp) {
          this.ui.hitmarker(false, e.group === 0);
          A.local(e.group === 0 ? 'headshot' : 'hitmarker');
          var pt = this.projectToScreen(e.x, e.y, e.z);
          if (pt) this.ui.damageNumber(pt[0], pt[1], e.dmg, e.group === 0);
        }
        if (victim === lp) {
          this.hurtFlash = 1;
          A.local('hurt');
          this.ui.setOverlay('dmg', Math.min(0.85, (e.dmg / 60)));
        }
        break;
      }
      case 'kill': {
        var vp = m.byId[e.v], ap = e.a ? m.byId[e.a] : null;
        if (vp) {
          R.addCorpse(vp, this.world,
            vp.charId || (vp.team === C.TEAM.ATT ? 'syn_default' : 'van_default'), vp.gloveId || 'default');
        }
        var wName = e.wid ? (W.get(e.wid) ? W.get(e.wid).name : e.wid) : 'world';
        this.ui.addKill({
          attacker: ap ? ap.name : 'World', victim: vp ? vp.name : '?',
          aTeam: ap ? ap.team : 0, vTeam: vp ? vp.team : 0,
          weapon: wName, hs: e.hs, pen: e.pen, thruSmoke: e.thruSmoke, noscope: e.noscope,
          assist: e.assist && m.byId[e.assist] ? m.byId[e.assist].name : null,
          mine: ap === lp || vp === lp
        });
        if (ap === lp && vp !== lp) {
          A.local('kill');
          this.ui.hitmarker(true, e.hs);
          if (e.streak >= 3) this.ui.toast(e.streak + ' in a row', 'good');
        }
        if (vp === lp) {
          A.local('death');
          this.ui.setOverlay('dmg', 1);
          this.spectateIndex = 0;
        }
        break;
      }
      case 'step': {
        var sp = m.byId[e.id];
        if (sp === lp && !this.freeCam) break;
        A.footstep(e.surf, e.x, e.y, e.z, e.vol);
        break;
      }
      case 'jump': if (m.byId[e.id] !== lp) A.footstep('concrete', e.x, e.y, e.z, 0.5); break;
      case 'land': if (e.hard) A.footstep('concrete', e.x, e.y, e.z, 1); break;
      case 'throw': A.throwSound(e.x || 0, e.y || 0, e.z || 0); break;
      case 'smoke': A.smokePop(e.x, e.y, e.z); break;
      case 'fire': A.explosion(e.x, e.y, e.z, 0.35); break;
      case 'he':
        R.spawnExplosion(e.x, e.y, e.z, e.radius || 7, this.world);
        A.explosion(e.x, e.y, e.z, 1);
        break;
      case 'flash':
        R.particles.spawn({ x: e.x, y: e.y, z: e.z, size: 0.4, size2: 6, life: 0.25,
                            tile: CS.FX.T.GLOW, r: 1, g: 1, b: 1, a: 1, a2: 0, drag: 0 });
        break;
      case 'flashed':
        if (e.id === (lp && lp.id)) {
          lp.flashAmount = e.amount; lp.flashTime = e.hold;
          A.flashbang(e.amount);
        }
        break;
      case 'bombPlanted':
        this.ui.banner('Bomb planted', 'Site ' + e.site, '', '#ff5a3c');
        A.local('pin');
        this.bombBeepT = 0;
        break;
      case 'bombDefused': this.ui.banner('Bomb defused', '', '', C.TEAM_INFO[2].color); break;
      case 'bombExploded':
        R.spawnExplosion(e.x, e.y + 0.5, e.z, 14, this.world);
        A.explosion(e.x, e.y, e.z, 1.6);
        break;
      case 'plantStart': if (e.id !== (lp && lp.id)) A.plantBeep(e.x, e.y, e.z); break;
      case 'defuseStart': if (e.id !== (lp && lp.id)) A.defuseWire(0, 0, 0); break;
      case 'roundStart':
        this.ui.hideBanner();
        A.local('roundStart');
        this.renderer.decals.clear();
        this.renderer.corpses.length = 0;
        this.ui.addChat({ sys: true, text: 'Round ' + e.round + ' — ' + m.score[1] + ' : ' + m.score[2] });
        break;
      case 'roundLive': this.ui.banner('Go', '', '', '#ffffff'); break;
      case 'roundEnd': {
        var info = C.TEAM_INFO[e.winner];
        var reason = { elimination: 'Team eliminated', bomb: 'Explosive detonated',
                       defused: 'Bomb defused', time: 'Time expired' }[e.reason] || '';
        var won = lp && e.winner === lp.team;
        this.ui.banner(info ? info.name + ' win' : 'Round draw', reason,
          e.mvp && m.byId[e.mvp] ? '★ MVP  ' + m.byId[e.mvp].name : '', info ? info.color : '');
        A.local(won ? 'win' : 'lose');
        if (e.mvp === (lp && lp.id)) setTimeout(function () { A.local('mvp'); }, 700);
        break;
      }
      case 'halftime':
        this.ui.banner('Half time', 'Swapping sides', '', '#ffffff');
        if (lp) { this.view.yaw = lp.yaw; }
        break;
      case 'overtime': this.ui.banner('Overtime', 'First to three', '', '#ff7a2f'); break;
      case 'matchEnd': {
        var winInfo = C.TEAM_INFO[e.winner];
        this.ui.banner(winInfo ? winInfo.name + ' take the match' : 'Draw',
                       m.score[1] + ' — ' + m.score[2], '', winInfo ? winInfo.color : '');
        var self = this;
        setTimeout(function () {
          if (doc.exitPointerLock) doc.exitPointerLock();
          if (m.rules.mode === 'aim' && m.aimStats) self.ui.showAimStats(m.aimStats, m.time);
          else self.ui.showResults(m, lp ? lp.team : 0);
        }, 3200);
        break;
      }
      case 'spawn':
        if (e.id === (lp && lp.id)) {
          this.ui.setOverlay('dmg', 0);
          this.view.yaw = lp.yaw; this.view.pitch = 0;
          this.freeCam = null; this.spectateTarget = null;
          this.vm.anim = 'deploy'; this.vm.animT = 0;
        }
        break;
      case 'targetDown':
        R.particles.spawn({ x: e.x, y: e.y + 1.2, z: e.z, size: 0.3, size2: 1.6, life: 0.4,
                            tile: CS.FX.T.RING, r: 1, g: e.head ? 0.85 : 0.4, b: 0.3, a: 0.9, a2: 0, drag: 0 });
        A.local(e.head ? 'headshot' : 'kill');
        break;
      case 'dry': if (e.id === (lp && lp.id)) A.local('dry'); break;
      case 'pickup': if (e.id === (lp && lp.id)) A.local('pickup'); break;
      case 'join': if (!fromNet) break; this.ui.addChat({ sys: true, text: e.name + ' joined' }); break;
      case 'leave': this.ui.addChat({ sys: true, text: e.name + ' left' }); break;
    }
  };

  Game.prototype.spawnRemoteMuzzle = function (shooter, e) {
    var R = this.renderer;
    R.particles.spawn({
      x: e.ox + e.dx * 0.55, y: e.oy + e.dy * 0.55 - 0.1, z: e.oz + e.dz * 0.55,
      size: 0.34, size2: 0.1, life: 0.06, tile: CS.FX.T.FLASH,
      r: 1, g: 0.9, b: 0.6, a: 1, a2: 0, drag: 0, rot: Math.random() * 6.28
    });
    R.spawnShell(e.ox + e.dx * 0.2, e.oy - 0.1, e.oz + e.dz * 0.2,
      (Math.random() - 0.5) * 2 + e.dz * 1.5, 1.6 + Math.random(), (Math.random() - 0.5) * 2 - e.dx * 1.5);
  };

  Game.prototype.onLocalShotFx = function (p, w, eye, end) {
    var R = this.renderer, vm = this.vm;
    this.audio.gunshot(w, eye.x, eye.y, eye.z, true);
    vm.flash = 1;
    vm.flashRot = Math.random() * 6.28;
    vm.kick = Math.min(1.4, vm.kick + 0.55 + (w.recoilScale || 1) * 0.3);
    vm.kickYaw += (Math.random() - 0.5) * 0.06;
    vm.anim = 'fire'; vm.animT = 0;
    R.tracers.add(eye.x + 0.1, eye.y - 0.12, eye.z, end.x, end.y, end.z, 340, 0.04);
    if (w.cls !== 'shotgun' || Math.random() < 0.5) {
      var side = this.settings.viewmodelSide || 1;
      var rx = Math.sin(this.camera.yaw), rz = Math.cos(this.camera.yaw);
      R.spawnShell(eye.x + rx * 0.25 * side, eye.y - 0.18, eye.z + rz * 0.25 * side,
        rx * (2 + Math.random()) * side, 1.8 + Math.random(), rz * (2 + Math.random()) * side);
    }
  };

  Game.prototype.pointSegDist = function (px, py, pz, ax, ay, az, bx, by, bz) {
    var dx = bx - ax, dy = by - ay, dz = bz - az;
    var l2 = dx * dx + dy * dy + dz * dz;
    if (l2 < 1e-6) return Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay) + (pz - az) * (pz - az));
    var t = M.clamp(((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / l2, 0, 1);
    var cx = ax + dx * t - px, cy = ay + dy * t - py, cz = az + dz * t - pz;
    return Math.sqrt(cx * cx + cy * cy + cz * cz);
  };

  Game.prototype.projectToScreen = function (x, y, z) {
    var Mat4 = CS.Mat4;
    var vp = this.renderer.viewProj;
    var w = vp[3] * x + vp[7] * y + vp[11] * z + vp[15];
    if (w <= 0.05) return null;
    var cx = (vp[0] * x + vp[4] * y + vp[8] * z + vp[12]) / w;
    var cy = (vp[1] * x + vp[5] * y + vp[9] * z + vp[13]) / w;
    if (cx < -1.2 || cx > 1.2 || cy < -1.2 || cy > 1.2) return null;
    var rect = this.renderer.canvas.getBoundingClientRect();
    return [(cx * 0.5 + 0.5) * rect.width, (-cy * 0.5 + 0.5) * rect.height];
  };

  /* ---------------------------------------------------------------
   * Camera
   * ------------------------------------------------------------- */
  Game.prototype.updateCamera = function (dt) {
    var p = this.spectateTarget || this.localPlayer;
    var cam = this.camera;

    if (this.freeCam) {
      var fc = this.freeCam;
      var f = M.angleVectors(this.view.yaw, this.view.pitch);
      var speed = (this.keys[this.settings.keys.walk] ? 3 : 9) * dt;
      var side = { x: Math.sin(this.view.yaw), y: 0, z: Math.cos(this.view.yaw) };
      var fwd = (this.keys[this.settings.keys.forward] ? 1 : 0) - (this.keys[this.settings.keys.back] ? 1 : 0);
      var str = (this.keys[this.settings.keys.right] ? 1 : 0) - (this.keys[this.settings.keys.left] ? 1 : 0);
      fc.x += (f.x * fwd + side.x * str) * speed;
      fc.y += (f.y * fwd) * speed + (this.keys[this.settings.keys.jump] ? speed : 0);
      fc.z += (f.z * fwd + side.z * str) * speed;
      cam.x = fc.x; cam.y = fc.y; cam.z = fc.z;
      cam.yaw = this.view.yaw; cam.pitch = this.view.pitch; cam.roll = 0; cam.zoom = 1;
      return;
    }
    if (!p) return;

    var isLocal = (p === this.localPlayer) && p.alive;
    var aim = isLocal ? P.aimAngles(p) : { yaw: p.yaw, pitch: p.pitch };
    cam.yaw = aim.yaw + (isLocal ? p.viewPunchYaw * M.DEG * 0.5 : 0);
    cam.pitch = M.clamp(aim.pitch + (isLocal ? p.viewPunchPitch * M.DEG * 0.5 : 0), -1.55, 1.55);

    // head bob and strafe roll
    var speed = P.speed2D(p);
    var moveFrac = M.clamp(speed / C.MAX_SPEED, 0, 1);
    this.bobT = (this.bobT || 0) + dt * speed * 1.5;
    var bobY = p.onGround ? Math.abs(Math.sin(this.bobT)) * 0.022 * moveFrac : 0;
    var bobX = p.onGround ? Math.sin(this.bobT * 0.5) * 0.016 * moveFrac : 0;

    var rightDot = 0;
    if (speed > 0.2) {
      var rx = Math.sin(p.yaw), rz = Math.cos(p.yaw);
      rightDot = (p.vel.x * rx + p.vel.z * rz) / C.MAX_SPEED;
    }
    this.rollTarget = M.clamp(-rightDot * 0.028, -0.03, 0.03);
    cam.roll = M.damp(cam.roll || 0, this.rollTarget, 0.002, dt);

    cam.x = p.pos.x + bobX * 0.4;
    cam.y = p.pos.y + p.eye + bobY;
    cam.z = p.pos.z;

    // nudge the camera out of geometry when very close to a wall
    cam.zoom = isLocal ? P.zoomFactor(p) : 1;
    this.ui.setScope(isLocal && p.scoped, p.scopeLevel);
    this.vm.hidden = (isLocal && p.scoped) || !isLocal;
  };

  Game.prototype.updateSpectate = function (dt) {
    var lp = this.localPlayer, m = this.match;
    if (!lp || lp.alive) { this.spectateTarget = null; this.freeCam = null; return; }
    var mates = m.teamPlayers(lp.team, true);
    if (this.keys[this.settings.keys.jump] && !this.freeCam) {
      this.freeCam = { x: this.camera.x, y: this.camera.y, z: this.camera.z };
      this.spectateTarget = null;
      return;
    }
    if (!mates.length) { this.spectateTarget = null; return; }
    if (this.mouse.left && !this.specClick) { this.spectateIndex++; this.specClick = true; this.freeCam = null; }
    else if (this.mouse.right && !this.specClick) { this.spectateIndex--; this.specClick = true; this.freeCam = null; }
    else if (!this.mouse.left && !this.mouse.right) this.specClick = false;
    if (this.freeCam) return;
    this.spectateIndex = ((this.spectateIndex % mates.length) + mates.length) % mates.length;
    this.spectateTarget = mates[this.spectateIndex];
    if (this.spectateTarget) {
      this.view.yaw = this.spectateTarget.yaw;
      this.view.pitch = this.spectateTarget.pitch;
    }
  };

  /* ---------------------------------------------------------------
   * Viewmodel
   * ------------------------------------------------------------- */
  Game.prototype.updateViewmodel = function (dt) {
    var vm = this.vm, p = this.localPlayer;
    if (!p) return;
    var w = P.curWeapon(p);
    var slot = P.curSlot(p);

    if (vm.lastWeapon !== w.id) {
      vm.lastWeapon = w.id;
      vm.anim = 'deploy'; vm.animT = 0;
      if (this.audio.ready) this.audio.local('switch');
    }
    // reload sound cues, driven off the reload timer
    var reloading = p.reloadTimer > 0;
    if (reloading && !this._wasReloading) {
      this.audio.local('magOut');
      var self = this, total = Math.max(0.2, w.reload || 2.2);
      clearTimeout(this._magInT);
      this._magInT = setTimeout(function () { self.audio.local('magIn'); }, total * 620);
    }
    if (!reloading && this._wasReloading && w.bolt) this.audio.local('bolt');
    this._wasReloading = reloading;
    vm.weaponId = w.id === 'bomb' ? null : w.id;
    vm.skin = (this.settings.skins && this.settings.skins[w.id]) || 'factory';
    vm.glove = this.settings.glove;
    vm.hidden = vm.hidden || !p.alive || !vm.weaponId;

    vm.animT += dt;
    if (p.reloadTimer > 0 && vm.anim !== 'reload') { vm.anim = 'reload'; vm.animT = 0; }
    if (p.inspectTimer > 0 && vm.anim !== 'inspect') { vm.anim = 'inspect'; vm.animT = 0; }

    // sway follows the mouse with a spring
    var dYaw = M.angleDelta(vm.lastYaw === undefined ? this.view.yaw : vm.lastYaw, this.view.yaw);
    var dPitch = this.view.pitch - (vm.lastPitch === undefined ? this.view.pitch : vm.lastPitch);
    vm.lastYaw = this.view.yaw; vm.lastPitch = this.view.pitch;
    vm.swayX = M.damp(vm.swayX + dYaw * 0.55, 0, 0.0001, dt);
    vm.swayY = M.damp(vm.swayY + dPitch * 0.55, 0, 0.0001, dt);
    vm.swayX = M.clamp(vm.swayX, -0.22, 0.22);
    vm.swayY = M.clamp(vm.swayY, -0.22, 0.22);

    // walking bob
    var speed = P.speed2D(p);
    var frac = M.clamp(speed / C.MAX_SPEED, 0, 1);
    vm.bobT += dt * (1.5 + speed * 1.4);
    var bobEnabled = this.settings.viewmodelBob;
    var bx = bobEnabled ? Math.sin(vm.bobT) * 0.018 * frac : 0;
    var by = bobEnabled ? Math.abs(Math.cos(vm.bobT)) * 0.014 * frac : 0;
    if (!p.onGround) { by -= M.clamp(p.vel.y * 0.01, -0.05, 0.05); }

    vm.kick = M.damp(vm.kick, 0, 0.00004, dt);
    vm.kickYaw = M.damp(vm.kickYaw, 0, 0.0001, dt);
    vm.flash = Math.max(0, vm.flash - dt * 22);

    // base pose, tuned per weapon class so silhouettes differ
    // A small inward yaw and roll keeps the weapon from reading as a flat slab.
    var base = { x: 0.168, y: -0.112, z: -0.50, scale: 0.50, yaw: -0.085, roll: 0.075 };
    if (w.cls === 'pistol') { base.x = 0.140; base.y = -0.104; base.z = -0.40; base.scale = 0.62; base.yaw = -0.105; base.roll = 0.10; }
    else if (w.cls === 'knife') { base.x = 0.170; base.y = -0.126; base.z = -0.35; base.scale = 0.76; base.yaw = -0.22; base.roll = 0.30; }
    else if (w.cls === 'sniper') { base.x = 0.160; base.y = -0.100; base.z = -0.54; base.scale = 0.45; base.yaw = -0.070; base.roll = 0.06; }
    else if (w.cls === 'shotgun') { base.x = 0.168; base.y = -0.116; base.z = -0.50; base.scale = 0.49; base.yaw = -0.080; base.roll = 0.07; }
    else if (w.cls === 'heavy') { base.x = 0.180; base.y = -0.124; base.z = -0.54; base.scale = 0.46; base.yaw = -0.075; base.roll = 0.06; }
    else if (w.cls === 'grenade') { base.x = 0.178; base.y = -0.150; base.z = -0.38; base.scale = 0.84; base.yaw = -0.30; base.roll = 0.14; }

    var ax = 0, ay = 0, az = 0, apitch = 0, ayaw = 0, aroll = 0;
    var t = vm.animT;
    if (vm.anim === 'deploy') {
      var dT = M.clamp(t / Math.max(0.15, w.deploy || 0.4), 0, 1);
      var e = 1 - Math.pow(1 - dT, 3);
      ay -= (1 - e) * 0.22; az += (1 - e) * 0.12; apitch -= (1 - e) * 0.8;
      if (dT >= 1) vm.anim = null;
    } else if (vm.anim === 'reload') {
      var total = Math.max(0.2, w.reload || 2.2);
      var rT = M.clamp(t / total, 0, 1);
      var dip = Math.sin(rT * Math.PI);
      ay -= dip * 0.12;
      apitch -= dip * 0.5;
      ayaw += Math.sin(rT * Math.PI * 2) * 0.2;
      az += dip * 0.04;
      if (p.reloadTimer <= 0) vm.anim = null;
    } else if (vm.anim === 'inspect') {
      var iT = M.clamp(t / 2.0, 0, 1);
      ayaw += Math.sin(iT * Math.PI * 2) * 1.1;
      apitch += Math.sin(iT * Math.PI) * 0.5;
      ay -= Math.sin(iT * Math.PI) * 0.06;
      if (iT >= 1) vm.anim = null;
    } else if (vm.anim === 'fire') {
      if (t > 0.12) vm.anim = null;
    }

    az += vm.kick * 0.042;
    apitch += vm.kick * 0.12;
    ayaw += vm.kickYaw;

    vm.x = base.x + bx - vm.swayX * 0.32 + ax;
    vm.y = base.y + by - vm.swayY * 0.22 + ay;
    vm.z = base.z + az;
    vm.scale = base.scale;
    vm.yaw = base.yaw - vm.swayX * 0.45 + ayaw * 0.28;
    vm.pitch = vm.swayY * 0.4 + apitch * 0.22;
    vm.roll = base.roll + aroll;
    var muzzle = (w.cls === 'sniper' ? 0.86 : w.cls === 'pistol' ? (w.silenced ? 0.32 : 0.19) :
                  w.cls === 'shotgun' ? 0.64 : w.cls === 'heavy' ? 0.72 : w.cls === 'smg' ? 0.34 : 0.60);
    vm.flashPos = [vm.x, vm.y + 0.028 * base.scale / 0.46, vm.z - muzzle * base.scale];
    vm.flashScale = w.cls === 'shotgun' || w.cls === 'sniper' ? 1.35 : (w.silenced ? 0.5 : 1);
    vm.tint = null;
  };

  Game.prototype.crosshairSpread = function () {
    var p = this.localPlayer;
    if (!p || !p.alive) return 0;
    var cone = P.inaccuracy(p);
    // convert the cone angle to pixels at the current FOV
    var h = this.renderer.canvas.clientHeight || 720;
    var hFov = (this.settings.fov || 90) * M.DEG;
    var aspect = (this.renderer.canvas.clientWidth || 1280) / h;
    var vFov = 2 * Math.atan(Math.tan(hFov / 2) / Math.max(0.3, aspect)) / (this.camera.zoom || 1);
    var px = Math.tan(cone) / Math.tan(vFov / 2) * (h / 2);
    return M.clamp(px, 0, 90);
  };

  /* ---------------------------------------------------------------
   * Audio world state
   * ------------------------------------------------------------- */
  Game.prototype.updateAudioWorld = function (dt) {
    var A = this.audio, m = this.match;
    var view = this.spectateTarget || this.localPlayer;
    if (!view || !A.ready) return;
    A.setListener(this.camera.x, this.camera.y, this.camera.z, this.camera.yaw, this.world);

    // flash deafness eases off with the blindness
    var lp = this.localPlayer;
    if (lp && lp.flashAmount > 0.02) A.setMuffle(lp.flashAmount * 0.85);
    else if (A.muffle > 0.02) A.setMuffle(Math.max(0, A.muffle - dt * 0.7));

    // bomb beeps accelerate as the timer runs down
    if (m.bomb && m.bomb.planted && !m.bomb.defused && !m.bomb.exploded) {
      var frac = 1 - M.clamp(m.phaseTime / m.rules.bombTime, 0, 1);
      var interval = M.lerp(1.0, 0.12, frac * frac);
      this.bombBeepT -= dt;
      if (this.bombBeepT <= 0) {
        this.bombBeepT = interval;
        A.bombBeep(m.bomb.x, m.bomb.y, m.bomb.z, frac);
      }
    }
    // fire ambience
    var nearest = null;
    for (var i = 0; i < m.nades.fires.length; i++) {
      var d = M.vdist(view.pos, m.nades.fires[i].pos);
      if (nearest === null || d < nearest) nearest = d;
    }
    A.updateFireLoop(nearest);
  };

  Game.prototype.updateVoiceState = function () {
    var self = this;
    var lp = this.localPlayer;
    var held = !!this.keys[this.settings.keys.voice];
    var talk = this.settings.voiceEnabled && this.voice.enabled &&
               (this.settings.pushToTalk ? held : true) && !this.ui.chatMode;
    this.voice.setTransmitting(talk);

    var m = this.match;
    this.voice.applyRouting(lp ? lp.team : 0, function (peerId) {
      var pid = self.remote[peerId];
      var p = pid && m ? m.byId[pid] : null;
      return p ? p.team : 0;
    });

    var st = this.ui.n.pttstate;
    if (st) {
      if (!this.settings.voiceEnabled || !this.online) st.textContent = '';
      else if (!this.voice.enabled) st.textContent = 'Mic off';
      else { st.textContent = talk ? 'TRANSMITTING' : ('Hold ' + CS.keyLabel(this.settings.keys.voice)); }
      st.className = talk ? 'on' : '';
    }
    var hud = this.ui.n.voicehud;
    if (!hud || !m) return;
    var speaking = [];
    for (var peerId in this.voice.peers) {
      if (!this.voice.speaking(peerId)) continue;
      var id = this.remote[peerId];
      var sp = id ? m.byId[id] : null;
      if (sp) speaking.push(sp.name);
    }
    var key = (talk ? '1' : '0') + '|' + speaking.join(',');
    if (key === this._voiceHudKey) return;
    this._voiceHudKey = key;
    var html = '<div id="pttstate" class="' + (talk ? 'on' : '') + '">' + (st ? st.textContent : '') + '</div>';
    for (var q = 0; q < speaking.length; q++) {
      html += '<div class="vspeak"><span class="mic"></span>' + speaking[q] + '</div>';
    }
    hud.innerHTML = html;
    this.ui.n.pttstate = doc.getElementById('pttstate');
  };

  /* ---------------------------------------------------------------
   * Screen overlays
   * ------------------------------------------------------------- */
  Game.prototype.updateOverlays = function (dt) {
    var lp = this.localPlayer, ui = this.ui;
    if (!lp) return;

    // flashbang
    var f = lp.flashAmount || 0;
    ui.setOverlay('flash', f);

    // damage vignette decays
    this.hurtFlash = Math.max(0, (this.hurtFlash || 0) - dt * 1.6);
    var dmgNode = ui.n.dmg;
    if (dmgNode) {
      var cur = parseFloat(dmgNode.style.opacity || 0);
      dmgNode.style.opacity = Math.max(0, cur - dt * 1.5);
    }
    // low health vignette
    var low = lp.alive ? M.clamp((38 - lp.health) / 38, 0, 1) : 0;
    ui.setOverlay('lowhp', low * (0.55 + 0.25 * Math.sin(this.match.time * 4)));
    // burning
    var burning = lp.alive && this.match.time - (lp.burnTime || -99) < 0.35;
    ui.setOverlay('burn', burning ? 0.75 : 0);

    // pickup prompt
    this.nearPickup = null;
    if (lp.alive && this.match.droppedWeapons) {
      for (var i = 0; i < this.match.droppedWeapons.length; i++) {
        var d = this.match.droppedWeapons[i];
        if (M.vdist(lp.pos, { x: d.x, y: d.y, z: d.z }) < 1.6) {
          var wd = W.get(d.wid);
          if (wd && ((wd.slot === 1 && !lp.primary) || (wd.slot === 2 && !lp.secondary))) {
            this.nearPickup = wd.name;
            break;
          }
        }
      }
      if (!this.nearPickup && this.match.bomb && this.match.bomb.dropped &&
          lp.team === C.TEAM.ATT &&
          M.vdist(lp.pos, { x: this.match.bomb.x, y: this.match.bomb.y, z: this.match.bomb.z }) < 1.6) {
        this.nearPickup = 'the explosive';
      }
    }
    // fade hit flashes on bodies
    var m = this.match;
    for (var k = 0; k < m.players.length; k++) {
      if (m.players[k].hitFlash) m.players[k].hitFlash = Math.max(0, m.players[k].hitFlash - dt * 2.4);
    }
  };

  /* ---------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------- */
  function start() {
    var game = new CS.Game();
    root.BREACHPOINT = game;
    game.boot();
  }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})(typeof window !== 'undefined' ? window : globalThis);
