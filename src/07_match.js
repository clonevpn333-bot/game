/* =============================================================
 * BREACHPOINT — authoritative match simulation
 *
 * Owns every rule: round flow, economy, the bomb, scoring, damage.
 * The host runs this; clients mirror it from snapshots. All damage
 * is decided here from server-side traces, never from client claims.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C, W = CS.W, P = CS.P, G = CS.G;

  var PH = C.PHASE;

  function Match(opts) {
    this.map = opts.map;
    this.world = opts.world;
    this.rules = C.deepMerge(C.deepClone(C.DEFAULT_RULES), opts.rules || {});
    var preset = C.MODE_PRESETS[this.rules.mode];
    if (preset) this.rules = C.deepMerge(this.rules, C.deepClone(preset.rules));
    if (opts.rules) this.rules = C.deepMerge(this.rules, opts.rules);

    this.players = [];
    this.byId = {};
    this.nades = G.createState();
    this.events = [];
    this.droppedWeapons = [];
    this.targets = [];

    this.time = 0;
    this.round = 0;
    this.phase = PH.WARMUP;
    this.phaseTime = this.rules.mode === 'deathmatch' || this.rules.mode === 'aim' ? 3 : 8;
    this.score = { 1: 0, 2: 0 };
    this.lossStreak = { 1: 0, 2: 0 };
    this.sideSwapped = false;
    this.overtimeRound = 0;
    this.roundWinner = 0;
    this.roundReason = '';
    this.matchOver = false;
    this.matchResult = null;

    this.bomb = null;          // {carried, x,y,z, planted, plantTime, site, defusing, defuser, progress}
    this.bombCarrier = null;
    this.history = [];         // lag-compensation ring
    this.historyTime = 0;

    this.nextDropId = 1;
    this.roundStats = [];
    this.stats = { rounds: [] };
    this.pendingEvents = [];
    this.dmScore = { 1: 0, 2: 0 };
    this.aimStats = null;
  }

  /* ---------------------------------------------------------------
   * Roster
   * ------------------------------------------------------------- */
  Match.prototype.addPlayer = function (p) {
    if (this.byId[p.id]) return this.byId[p.id];
    this.players.push(p);
    this.byId[p.id] = p;
    p.money = this.rules.startMoney;
    this.emit({ t: 'join', id: p.id, name: p.name, team: p.team, bot: p.bot });
    return p;
  };

  Match.prototype.removePlayer = function (id) {
    var p = this.byId[id];
    if (!p) return;
    if (this.bombCarrier === p) this.dropBomb(p);
    var i = this.players.indexOf(p);
    if (i >= 0) this.players.splice(i, 1);
    delete this.byId[id];
    this.emit({ t: 'leave', id: id, name: p.name });
  };

  Match.prototype.teamPlayers = function (team, aliveOnly) {
    var out = [];
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      if (p.team !== team) continue;
      if (aliveOnly && !p.alive) continue;
      out.push(p);
    }
    return out;
  };
  Match.prototype.teamCount = function (team) { return this.teamPlayers(team).length; };

  Match.prototype.setTeam = function (p, team) {
    if (p.team === team) return false;
    p.team = team;
    if (p.alive) { this.killPlayer(p, null, null, 'switched teams'); }
    p.kills = p.kills || 0;
    this.emit({ t: 'team', id: p.id, team: team });
    return true;
  };

  /* Auto-balance: only ever moves the lowest-scoring player of the big team. */
  Match.prototype.balanceTeams = function () {
    if (!this.rules.teamBalance) return;
    var a = this.teamPlayers(C.TEAM.ATT), d = this.teamPlayers(C.TEAM.DEF);
    if (Math.abs(a.length - d.length) < 2) return;
    var from = a.length > d.length ? a : d;
    var to = a.length > d.length ? C.TEAM.DEF : C.TEAM.ATT;
    from.sort(function (x, y) { return x.score - y.score; });
    var mover = from[0];
    if (!mover) return;
    mover.team = to;
    this.emit({ t: 'balance', id: mover.id, team: to, name: mover.name });
  };

  Match.prototype.emit = function (e) { e.time = this.time; this.events.push(e); };

  /* ---------------------------------------------------------------
   * Round flow
   * ------------------------------------------------------------- */
  Match.prototype.startWarmup = function (seconds) {
    this.phase = PH.WARMUP;
    this.phaseTime = seconds === undefined ? 20 : seconds;
    this.respawnAll(true);
    this.emit({ t: 'warmup' });
  };

  Match.prototype.beginRound = function () {
    this.round++;
    this.planRound();
    this.phase = PH.FREEZE;
    this.phaseTime = this.rules.freezeTime;
    this.roundWinner = 0;
    this.roundReason = '';
    this.bomb = null;
    this.bombCarrier = null;
    this.droppedWeapons.length = 0;
    G.clear(this.nades);
    this.world.smokes = this.nades.smokes;

    this.respawnAll(false);
    this.assignBomb();
    this.emit({ t: 'roundStart', round: this.round, score: { 1: this.score[1], 2: this.score[2] } });
  };

  Match.prototype.respawnAll = function (warmup) {
    var used = { 1: 0, 2: 0 };
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      if (p.team !== C.TEAM.ATT && p.team !== C.TEAM.DEF) { p.alive = false; continue; }
      var list = this.map.spawns[p.team];
      var spot = this.safeSpawn(list[used[p.team] % list.length]);
      used[p.team]++;
      P.spawn(p, spot, false);

      if (this.rules.mode === 'deathmatch' || this.rules.mode === 'aim' || warmup) {
        this.giveDefaultLoadout(p, true);
      } else {
        // carry weapons over between rounds; pistols are re-issued if you have none
        if (!p.secondary) P.giveWeapon(p, p.team === C.TEAM.ATT ? 'gs18' : 'sentinel');
        else { p.secondary.mag = W.get(p.secondary.id).mag; p.secondary.reserve = W.get(p.secondary.id).reserve; }
        if (p.primary) {
          var pw = W.get(p.primary.id);
          p.primary.mag = pw.mag; p.primary.reserve = pw.reserve;
          P.switchTo(p, 'primary');
        } else P.switchTo(p, 'secondary');
        p.grenades = [];
        if (this.rules.freeArmor) { p.armor = C.MAX_ARMOR; p.helmet = true; }
      }
      this.emit({ t: 'spawn', id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    }
  };

  /* A spawn point that has ended up inside geometry (after a map edit, say)
   * would trap a player, so snap it to the nearest walkable spot. */
  Match.prototype.safeSpawn = function (spot) {
    if (!this.world.overlaps(spot.x, spot.y + 0.02, spot.z, C.PLAYER_RADIUS, C.STAND_HEIGHT)) return spot;
    var id = this.world.nearestNode(spot.x, spot.y, spot.z);
    if (id < 0) return spot;
    var nv = this.world.nav;
    return { x: nv.x[id], y: nv.y[id] + 0.05, z: nv.z[id], yaw: spot.yaw };
  };

  Match.prototype.giveDefaultLoadout = function (p, full) {
    P.clearInventory(p);
    var loadout = p.dmLoadout || (p.team === C.TEAM.ATT ? 'kr47' : 'ar4');
    P.giveWeapon(p, loadout);
    P.giveWeapon(p, p.team === C.TEAM.ATT ? 'raider9' : 'cobra57');
    p.armor = C.MAX_ARMOR; p.helmet = true;
    if (full && this.rules.mode !== 'aim') {
      P.giveWeapon(p, 'he'); P.giveWeapon(p, 'flash'); P.giveWeapon(p, 'smoke');
    }
    P.switchTo(p, 'primary');
  };

  Match.prototype.assignBomb = function () {
    if (!this.map.sites.length) return;
    var att = this.teamPlayers(C.TEAM.ATT, true);
    if (!att.length) return;
    for (var i = 0; i < att.length; i++) att[i].bomb = false;
    var pick = att[(Math.random() * att.length) | 0];
    pick.bomb = true;
    this.bombCarrier = pick;
    this.emit({ t: 'bombAssigned', id: pick.id });
  };

  Match.prototype.isBuyTime = function (p) {
    if (this.rules.infiniteMoney) return true;
    if (this.rules.mode === 'deathmatch' || this.rules.mode === 'aim') return true;
    if (this.phase === PH.WARMUP) return true;
    if (this.phase === PH.FREEZE) return true;
    if (this.phase !== PH.LIVE) return false;
    var elapsed = this.rules.roundTime - this.phaseTime;
    return elapsed <= this.rules.buyTime;
  };

  Match.prototype.endRound = function (winner, reason) {
    if (this.phase === PH.ENDED || this.matchOver) return;
    this.phase = PH.ENDED;
    this.phaseTime = 5.0;
    this.roundWinner = winner;
    this.roundReason = reason;
    if (winner) this.score[winner]++;

    this.awardEconomy(winner, reason);
    var mvp = this.pickMVP(winner, reason);
    if (mvp) { mvp.mvps++; mvp.score += 1; }

    this.emit({
      t: 'roundEnd', winner: winner, reason: reason, round: this.round,
      score: { 1: this.score[1], 2: this.score[2] }, mvp: mvp ? mvp.id : null
    });

    this.stats.rounds.push({
      round: this.round, winner: winner, reason: reason,
      score1: this.score[1], score2: this.score[2]
    });
  };

  Match.prototype.awardEconomy = function (winner, reason) {
    if (this.rules.mode === 'deathmatch' || this.rules.mode === 'aim') return;
    var loser = winner === C.TEAM.ATT ? C.TEAM.DEF : C.TEAM.ATT;
    var E = C.ECON;
    var winAmount = E.winElim;
    if (reason === 'bomb') winAmount = E.winBomb;
    else if (reason === 'defused') winAmount = E.winDefuse;
    else if (reason === 'time') winAmount = E.winTimeCT;

    var i, p;
    var winners = this.teamPlayers(winner);
    for (i = 0; i < winners.length; i++) P.addMoney(winners[i], winAmount, this.rules);

    this.lossStreak[winner] = Math.max(0, this.lossStreak[winner] - 1);
    var streak = Math.min(this.lossStreak[loser], E.lossLadder.length - 1);
    var lossAmount = E.lossLadder[streak];
    if (this.rules.lossBonusFloor) lossAmount = Math.max(lossAmount, this.rules.lossBonusFloor);
    this.lossStreak[loser] = Math.min(E.lossLadder.length - 1, this.lossStreak[loser] + 1);

    var losers = this.teamPlayers(loser);
    for (i = 0; i < losers.length; i++) {
      var extra = 0;
      if (loser === C.TEAM.ATT && this.bomb && this.bomb.planted) extra = E.plantBonusT;
      P.addMoney(losers[i], lossAmount + extra, this.rules);
    }
  };

  Match.prototype.pickMVP = function (winner, reason) {
    if (reason === 'bomb' && this.bomb && this.bomb.planterId && this.byId[this.bomb.planterId]) return this.byId[this.bomb.planterId];
    if (reason === 'defused' && this.bomb && this.bomb.defuserId && this.byId[this.bomb.defuserId]) return this.byId[this.bomb.defuserId];
    var best = null, bestScore = -1;
    var list = this.teamPlayers(winner);
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var s = p.roundKills * 100 + p.roundDamage;
      if (s > bestScore) { bestScore = s; best = p; }
    }
    return bestScore > 0 ? best : null;
  };

  Match.prototype.checkRoundEnd = function () {
    if (this.phase !== PH.LIVE) return;
    if (this.rules.mode === 'deathmatch' || this.rules.mode === 'aim') return;

    var attAlive = this.teamPlayers(C.TEAM.ATT, true).length;
    var defAlive = this.teamPlayers(C.TEAM.DEF, true).length;
    var planted = this.bomb && this.bomb.planted;

    if (!planted && attAlive === 0 && this.teamCount(C.TEAM.ATT) > 0) { this.endRound(C.TEAM.DEF, 'elimination'); return; }
    if (defAlive === 0 && this.teamCount(C.TEAM.DEF) > 0) { this.endRound(C.TEAM.ATT, 'elimination'); return; }
    if (planted && defAlive === 0) { this.endRound(C.TEAM.ATT, 'elimination'); return; }

    if (this.phaseTime <= 0 && !planted) { this.endRound(C.TEAM.DEF, 'time'); return; }
  };

  Match.prototype.advancePhase = function () {
    var r = this.rules;
    switch (this.phase) {
      case PH.WARMUP:
        if (r.mode === 'deathmatch' || r.mode === 'aim') {
          this.phase = PH.LIVE; this.phaseTime = r.roundTime;
          this.round = 1;
          if (r.mode === 'aim') this.initAimMode();
          this.emit({ t: 'roundStart', round: 1, score: this.score });
        } else this.beginRound();
        break;
      case PH.FREEZE:
        this.phase = PH.LIVE;
        this.phaseTime = r.roundTime;
        this.emit({ t: 'roundLive', round: this.round });
        break;
      case PH.LIVE:
        if (r.mode === 'deathmatch' || r.mode === 'aim') this.endMatchByScore();
        else this.checkRoundEnd();
        break;
      case PH.ENDED:
        if (this.checkMatchEnd()) break;
        if (this.needsHalftime()) { this.doHalftime(); break; }
        this.beginRound();
        break;
      case PH.HALFTIME:
        this.beginRound();
        break;
    }
  };

  Match.prototype.needsHalftime = function () {
    var r = this.rules;
    if (!r.halftimeAt || this.sideSwapped) return false;
    return (this.score[1] + this.score[2]) >= r.halftimeAt;
  };

  Match.prototype.doHalftime = function () {
    this.sideSwapped = true;
    this.phase = PH.HALFTIME;
    this.phaseTime = 10;
    var tmp = this.score[1]; this.score[1] = this.score[2]; this.score[2] = tmp;
    var ls = this.lossStreak[1]; this.lossStreak[1] = this.lossStreak[2]; this.lossStreak[2] = ls;
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      if (p.team === C.TEAM.ATT) p.team = C.TEAM.DEF;
      else if (p.team === C.TEAM.DEF) p.team = C.TEAM.ATT;
      P.clearInventory(p);
      p.money = this.rules.startMoney;
    }
    this.emit({ t: 'halftime', score: { 1: this.score[1], 2: this.score[2] } });
  };

  Match.prototype.checkMatchEnd = function () {
    var r = this.rules;
    if (r.mode === 'deathmatch' || r.mode === 'aim') return false;
    var need = r.winRounds;
    if (this.overtimeRound > 0) {
      // regulation is a draw at maxRounds/2 each; every OT adds otMaxRounds/2 + 1
      need = Math.floor(r.maxRounds / 2) + (Math.floor(r.otMaxRounds / 2) + 1) * this.overtimeRound;
    }
    if (this.score[1] >= need || this.score[2] >= need) {
      this.finishMatch(this.score[1] > this.score[2] ? C.TEAM.ATT : C.TEAM.DEF);
      return true;
    }
    var played = this.score[1] + this.score[2];
    var maxPlayed = r.maxRounds + this.overtimeRound * r.otMaxRounds;
    if (played >= maxPlayed) {
      if (this.score[1] === this.score[2]) {
        if (r.overtime) { this.startOvertime(); return true; }
        this.finishMatch(0); return true;
      }
      this.finishMatch(this.score[1] > this.score[2] ? C.TEAM.ATT : C.TEAM.DEF);
      return true;
    }
    return false;
  };

  Match.prototype.startOvertime = function () {
    this.overtimeRound++;
    this.sideSwapped = false;
    this.phase = PH.HALFTIME;
    this.phaseTime = 10;
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      if (p.team === C.TEAM.ATT) p.team = C.TEAM.DEF;
      else if (p.team === C.TEAM.DEF) p.team = C.TEAM.ATT;
      P.clearInventory(p);
      p.money = this.rules.otStartMoney;
    }
    var tmp = this.score[1]; this.score[1] = this.score[2]; this.score[2] = tmp;
    this.lossStreak[1] = this.lossStreak[2] = 0;
    this.rules.halftimeAt = 0;
    this.emit({ t: 'overtime', n: this.overtimeRound, score: { 1: this.score[1], 2: this.score[2] } });
  };

  Match.prototype.endMatchByScore = function () {
    var w = this.dmScore[1] === this.dmScore[2] ? 0 : (this.dmScore[1] > this.dmScore[2] ? C.TEAM.ATT : C.TEAM.DEF);
    this.finishMatch(w);
  };

  Match.prototype.finishMatch = function (winner) {
    this.matchOver = true;
    this.phase = PH.MATCH_END;
    this.phaseTime = 30;
    this.matchResult = { winner: winner, score: { 1: this.score[1], 2: this.score[2] } };
    this.emit({ t: 'matchEnd', winner: winner, score: { 1: this.score[1], 2: this.score[2] } });
  };

  /* ---------------------------------------------------------------
   * Bomb
   * ------------------------------------------------------------- */
  Match.prototype.dropBomb = function (p) {
    if (!p || !p.bomb) return;
    p.bomb = false;
    this.bombCarrier = null;
    var y = this.world.dropToFloor(p.pos.x, p.pos.y + 0.5, p.pos.z, 6) || p.pos.y;
    this.bomb = this.bomb || {};
    this.bomb.dropped = true;
    this.bomb.x = p.pos.x; this.bomb.y = y + 0.08; this.bomb.z = p.pos.z;
    this.emit({ t: 'bombDropped', x: this.bomb.x, y: this.bomb.y, z: this.bomb.z });
  };

  Match.prototype.pickupBomb = function (p) {
    if (p.team !== C.TEAM.ATT || !this.bomb || !this.bomb.dropped || this.bomb.planted) return false;
    var d = M.vdist(p.pos, { x: this.bomb.x, y: this.bomb.y, z: this.bomb.z });
    if (d > 1.5) return false;
    this.bomb.dropped = false;
    p.bomb = true;
    this.bombCarrier = p;
    this.emit({ t: 'bombPickup', id: p.id });
    return true;
  };

  Match.prototype.updatePlant = function (p, cmd, dt) {
    if (!p.bomb || !p.alive || this.phase !== PH.LIVE) { p.planting = 0; return; }
    if (this.bomb && this.bomb.planted) { p.planting = 0; return; }
    var canPlant = cmd.use && p.onGround && P.speed2D(p) < 0.9 &&
                   this.world.siteAt(p.pos.x, p.pos.y + 0.1, p.pos.z);
    if (!canPlant) {
      if (p.planting > 0) this.emit({ t: 'plantAbort', id: p.id });
      p.planting = 0;
      return;
    }
    if (p.planting === 0) this.emit({ t: 'plantStart', id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    p.planting += dt;
    if (p.planting >= this.rules.plantTime) {
      var site = this.world.siteAt(p.pos.x, p.pos.y + 0.1, p.pos.z);
      p.planting = 0; p.bomb = false;
      this.bombCarrier = null;
      this.bomb = {
        planted: true, dropped: false,
        x: p.pos.x, y: this.world.dropToFloor(p.pos.x, p.pos.y + 0.5, p.pos.z, 3) + 0.05, z: p.pos.z,
        plantTime: this.time, site: site ? site.name : '?',
        planterId: p.id, defusing: 0, defuserId: null, beepTimer: 0
      };
      this.phaseTime = this.rules.bombTime;
      P.addMoney(p, C.ECON.plantReward, this.rules);
      p.score += 2;
      this.emit({ t: 'bombPlanted', id: p.id, site: this.bomb.site, x: this.bomb.x, y: this.bomb.y, z: this.bomb.z });
      for (var bi = 0; bi < this.players.length; bi++) {
        var b = this.players[bi];
        if (b.ai) { b.ai.alertUntil = 0; b.ai.path = null; b.ai.pathGoal = null; b.ai.holdSpot = null; }
      }
    }
  };

  Match.prototype.updateDefuse = function (p, cmd, dt) {
    var b = this.bomb;
    if (!b || !b.planted || p.team !== C.TEAM.DEF || !p.alive) { p.defusing = 0; return; }
    var d = M.vdistXZ(p.pos, { x: b.x, z: b.z });
    var dy = Math.abs(p.pos.y - b.y);
    var can = cmd.use && d < 1.5 && dy < 1.6 && p.onGround && P.speed2D(p) < 0.9;
    if (!can) {
      if (p.defusing > 0) { this.emit({ t: 'defuseAbort', id: p.id }); b.defusing = 0; b.defuserId = null; }
      p.defusing = 0;
      return;
    }
    if (p.defusing === 0) this.emit({ t: 'defuseStart', id: p.id, kit: p.kit });
    p.defusing += dt;
    b.defusing = p.defusing;
    b.defuserId = p.id;
    var need = p.kit ? this.rules.defuseTimeKit : this.rules.defuseTime;
    b.defuseNeed = need;
    if (p.defusing >= need) {
      p.defusing = 0;
      b.defused = true;
      P.addMoney(p, C.ECON.defuseReward, this.rules);
      p.score += 2;
      this.emit({ t: 'bombDefused', id: p.id });
      this.endRound(C.TEAM.DEF, 'defused');
    }
  };

  Match.prototype.explodeBomb = function () {
    var b = this.bomb;
    b.exploded = true;
    this.emit({ t: 'bombExploded', x: b.x, y: b.y, z: b.z });
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      if (!p.alive) continue;
      var dist = M.vdist(p.pos, { x: b.x, y: b.y, z: b.z });
      var radius = 25;
      if (dist > radius) continue;
      var dmg = 500 * Math.pow(1 - dist / radius, 1.6);
      if (dmg <= 0) continue;
      P.applyDamage(p, dmg, 0, null, C.HITGROUP.CHEST, this.time);
      if (!p.alive) this.onDeath(p, null, W.get('he'), C.HITGROUP.CHEST, false, false);
    }
    this.endRound(C.TEAM.ATT, 'bomb');
  };

  /* ---------------------------------------------------------------
   * Damage & death
   * ------------------------------------------------------------- */
  Match.prototype.dealDamage = function (victim, attacker, weapon, healthDmg, armorDmg, hitgroup, penetrated) {
    if (!victim.alive) return;
    if (victim.spawnProtect > 0) return;
    var friendly = attacker && attacker !== victim && attacker.team === victim.team;
    if (friendly) {
      if (!this.rules.friendlyFire) return;
      healthDmg *= this.rules.friendlyFireScale;
      armorDmg *= this.rules.friendlyFireScale;
    }
    var applied = P.applyDamage(victim, healthDmg, armorDmg, attacker ? attacker.id : null, hitgroup, this.time);
    if (attacker && attacker !== victim && !friendly) {
      attacker.damage += applied; attacker.roundDamage += applied;
    }
    this.emit({
      t: 'hurt', v: victim.id, a: attacker ? attacker.id : null,
      dmg: Math.round(applied), group: hitgroup, hp: Math.round(victim.health),
      armor: Math.round(victim.armor), pen: !!penetrated, wid: weapon ? weapon.id : null,
      x: victim.pos.x, y: victim.pos.y + victim.height * 0.6, z: victim.pos.z
    });
    if (!victim.alive) {
      this.onDeath(victim, attacker, weapon, hitgroup, hitgroup === C.HITGROUP.HEAD, penetrated);
    }
  };

  Match.prototype.onDeath = function (victim, attacker, weapon, hitgroup, headshot, penetrated) {
    victim.alive = false;
    victim.deaths++;
    victim.killStreak = 0;
    victim.deathTime = this.time;
    victim.deathPos = { x: victim.pos.x, y: victim.pos.y, z: victim.pos.z };
    victim.deathYaw = victim.yaw;
    victim.deathDir = attacker ? Math.atan2(-(victim.pos.z - attacker.pos.z), victim.pos.x - attacker.pos.x) : victim.yaw;

    // assist: anyone who did >= 40 damage and is not the killer
    var assistId = null, bestAssist = 0;
    for (var k in victim.hurtBy) {
      if (attacker && k === attacker.id) continue;
      if (victim.hurtBy[k] >= 40 && victim.hurtBy[k] > bestAssist) { bestAssist = victim.hurtBy[k]; assistId = k; }
    }
    if (assistId && this.byId[assistId]) { this.byId[assistId].assists++; this.byId[assistId].score += 1; }

    if (attacker && attacker !== victim) {
      var friendly = attacker.team === victim.team;
      if (friendly) {
        attacker.kills--; attacker.score -= 2;
        P.addMoney(attacker, -300, this.rules);
      } else {
        attacker.kills++; attacker.roundKills++; attacker.killStreak++;
        attacker.score += 2;
        if (headshot) attacker.headshots++;
        var award = (weapon && weapon.killAward) || 300;
        P.addMoney(attacker, award, this.rules);
        if (this.rules.mode === 'deathmatch') this.dmScore[attacker.team]++;
      }
    }

    // drop what they were carrying
    if (this.rules.mode !== 'deathmatch' && this.rules.mode !== 'aim') {
      this.dropInventory(victim);
    }
    if (victim.bomb) this.dropBomb(victim);

    this.emit({
      t: 'kill', a: attacker ? attacker.id : null, v: victim.id,
      wid: weapon ? weapon.id : null, hs: !!headshot, pen: !!penetrated,
      assist: assistId, x: victim.pos.x, y: victim.pos.y, z: victim.pos.z,
      dir: victim.deathDir, streak: attacker ? attacker.killStreak : 0,
      noscope: attacker ? (weapon && weapon.scope && !attacker.scoped) : false,
      thruSmoke: attacker ? G.smokeBlocks(this.nades, attacker.pos.x, attacker.pos.y + attacker.eye, attacker.pos.z, victim.pos.x, victim.pos.y + victim.eye, victim.pos.z) : false
    });

    // a dead teammate is a callout: the rest of the team rotates to the fight
    for (var bi = 0; bi < this.players.length; bi++) {
      var b = this.players[bi];
      if (!b.ai || !b.alive) continue;
      if (b.team === victim.team) CS.Bots.alert(b, victim.pos.x, victim.pos.y, victim.pos.z, this.time, 7.0);
      else if (attacker && b.team === attacker.team && b !== attacker) {
        CS.Bots.alert(b, victim.pos.x, victim.pos.y, victim.pos.z, this.time, 3.0);
      }
    }

    victim.respawnAt = this.time + (this.rules.respawnDelay || 2.5);
    this.checkRoundEnd();
  };

  Match.prototype.dropInventory = function (p) {
    var item = p.primary || p.secondary;
    if (!item) return;
    var w = W.get(item.id);
    if (!w) return;
    this.droppedWeapons.push({
      id: this.nextDropId++, wid: item.id, mag: item.mag, reserve: item.reserve,
      x: p.pos.x, y: this.world.dropToFloor(p.pos.x, p.pos.y + 0.6, p.pos.z, 4) + 0.1, z: p.pos.z,
      yaw: p.yaw, born: this.time
    });
    if (p.primary) p.primary = null; else p.secondary = null;
  };

  Match.prototype.killPlayer = function (p, attacker, weapon, reason) {
    if (!p.alive) return;
    p.health = 0; p.alive = false;
    this.onDeath(p, attacker, weapon, C.HITGROUP.CHEST, false, false);
  };

  /* ---------------------------------------------------------------
   * Lag compensation: rewind every hitbox to where the shooter saw it
   * ------------------------------------------------------------- */
  Match.prototype.recordHistory = function () {
    var frame = { time: this.time, pos: {} };
    for (var i = 0; i < this.players.length; i++) {
      var p = this.players[i];
      frame.pos[p.id] = { x: p.pos.x, y: p.pos.y, z: p.pos.z, h: p.height, alive: p.alive };
    }
    this.history.push(frame);
    while (this.history.length && this.time - this.history[0].time > C.HISTORY_SECONDS) this.history.shift();
  };

  Match.prototype.rewind = function (targetTime, exceptId) {
    if (!this.history.length) return null;
    targetTime = M.clamp(targetTime, this.time - C.LAGCOMP_MAX, this.time);
    var a = null, b = null;
    for (var i = this.history.length - 1; i >= 0; i--) {
      if (this.history[i].time <= targetTime) { a = this.history[i]; b = this.history[i + 1] || a; break; }
    }
    if (!a) { a = this.history[0]; b = this.history[0]; }
    var t = (b.time - a.time) > 1e-5 ? (targetTime - a.time) / (b.time - a.time) : 0;
    var saved = [];
    for (var k = 0; k < this.players.length; k++) {
      var p = this.players[k];
      if (p.id === exceptId) continue;
      var pa = a.pos[p.id], pb = b.pos[p.id] || pa;
      if (!pa) continue;
      saved.push({ p: p, x: p.pos.x, y: p.pos.y, z: p.pos.z, h: p.height });
      p.pos.x = pa.x + (pb.x - pa.x) * t;
      p.pos.y = pa.y + (pb.y - pa.y) * t;
      p.pos.z = pa.z + (pb.z - pa.z) * t;
      p.height = pa.h + (pb.h - pa.h) * t;
    }
    return saved;
  };

  Match.prototype.restore = function (saved) {
    if (!saved) return;
    for (var i = 0; i < saved.length; i++) {
      var s = saved[i];
      s.p.pos.x = s.x; s.p.pos.y = s.y; s.p.pos.z = s.z; s.p.height = s.h;
    }
  };

  /* ---------------------------------------------------------------
   * Firing
   * ------------------------------------------------------------- */
  var _dir = { x: 0, y: 0, z: 0 }, _fwd = { x: 0, y: 0, z: 0 }, _eye = { x: 0, y: 0, z: 0 };

  Match.prototype.resolveShot = function (shooter, shot, lagTime) {
    var w = shot.weapon;
    P.eyePos(shooter, _eye);

    if (shot.melee) { this.resolveMelee(shooter, shot); return; }
    if (shot.dryFire) { this.emit({ t: 'dry', id: shooter.id }); return; }

    M.angleVectors(shot.yaw, shot.pitch, _fwd);
    var saved = (lagTime !== undefined && !shooter.bot) ? this.rewind(lagTime, shooter.id) : null;

    var impacts = [];
    var hitAny = false, hitGroups = [];
    var maxDist = 140;
    if (this.aimStats) this.aimStats.shots += shot.pellets;

    for (var pel = 0; pel < shot.pellets; pel++) {
      W.spreadDir(_dir, _fwd, shot.cone, shot.seed, pel);
      if (this.targets.length && this.hitTarget(_eye, _dir, shooter)) { hitAny = true; continue; }
      var r = this.world.traceBullet(_eye.x, _eye.y, _eye.z, _dir.x, _dir.y, _dir.z,
                                     maxDist, w, this.players, shooter.id);
      for (var i = 0; i < r.impacts.length; i++) {
        if (!r.impacts[i].exit) impacts.push(r.impacts[i]);
      }
      for (var h = 0; h < r.hits.length; h++) {
        var hit = r.hits[h];
        var victim = hit.player;
        if (!victim.alive) continue;
        if (victim.team === shooter.team && !this.rules.friendlyFire) continue;
        var dmg = W.resolveDamage(w, hit.dist, hit.group, victim.armor, victim.helmet, hit.power);
        this.dealDamage(victim, shooter, w, dmg.health, dmg.armor, hit.group, hit.power < 0.99);
        hitAny = true;
        hitGroups.push(hit.group);
      }
      if (pel === 0) {
        shot.endX = r.end.x; shot.endY = r.end.y; shot.endZ = r.end.z;
      }
    }
    this.restore(saved);

    this.alertBots(shooter, _eye.x, _eye.y, _eye.z, w.silenced ? 16 : 42, 3.5);

    this.emit({
      t: 'shot', id: shooter.id, wid: w.id,
      ox: _eye.x, oy: _eye.y, oz: _eye.z,
      dx: _fwd.x, dy: _fwd.y, dz: _fwd.z,
      ex: shot.endX, ey: shot.endY, ez: shot.endZ,
      cone: shot.cone, seed: shot.seed, pellets: shot.pellets,
      silenced: !!w.silenced, hit: hitAny, impacts: impacts,
      groups: hitGroups
    });
  };

  /* Pop-up targets for the training range. */
  Match.prototype.hitTarget = function (eye, dir, shooter) {
    var best = null, bestT = 140;
    for (var i = 0; i < this.targets.length; i++) {
      var t = this.targets[i];
      if (!t.alive) continue;
      var h = this.world.rayPlayer(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, bestT,
                                   t.x, t.y, t.z, t.height);
      if (h) { bestT = h.t; best = { t: t, group: h.group }; }
    }
    if (!best) return false;
    var wall = this.world.rayWorld(eye.x, eye.y, eye.z, dir.x, dir.y, dir.z, bestT);
    if (wall) return false;
    var head = best.group === C.HITGROUP.HEAD;
    best.t.hp -= head ? 100 : 34;
    if (this.aimStats) {
      this.aimStats.hits++;
      var react = this.time - best.t.born;
      this.aimStats.reactSum += react; this.aimStats.reactN++;
    }
    this.emit({
      t: 'hurt', v: 'target' + best.t.id, a: shooter.id, dmg: head ? 100 : 34,
      group: best.group, hp: Math.max(0, best.t.hp), armor: 0, target: true,
      x: best.t.x, y: best.t.y + best.t.height * 0.6, z: best.t.z
    });
    if (best.t.hp <= 0) {
      best.t.alive = false;
      if (this.aimStats) this.aimStats.kills++;
      shooter.kills++;
      this.emit({ t: 'targetDown', x: best.t.x, y: best.t.y, z: best.t.z, head: head });
    }
    return true;
  };

  Match.prototype.resolveMelee = function (shooter, shot) {
    var w = shot.weapon;
    P.eyePos(shooter, _eye);
    var aim = P.aimAngles(shooter);
    M.angleVectors(aim.yaw, aim.pitch, _fwd);
    var range = w.range || 1.35;
    var best = null, bestT = range;
    for (var i = 0; i < this.players.length; i++) {
      var v = this.players[i];
      if (!v.alive || v === shooter) continue;
      if (v.team === shooter.team && !this.rules.friendlyFire) continue;
      var ph = this.world.rayPlayer(_eye.x, _eye.y, _eye.z, _fwd.x, _fwd.y, _fwd.z, range,
                                    v.pos.x, v.pos.y, v.pos.z, v.height);
      if (ph && ph.t < bestT) { bestT = ph.t; best = { v: v, group: ph.group }; }
    }
    var wallHit = this.world.rayWorld(_eye.x, _eye.y, _eye.z, _fwd.x, _fwd.y, _fwd.z, range);
    if (wallHit && (!best || wallHit.t < bestT)) best = null;

    this.emit({ t: 'melee', id: shooter.id, secondary: shot.secondary, hit: !!best,
                x: _eye.x + _fwd.x * bestT, y: _eye.y + _fwd.y * bestT, z: _eye.z + _fwd.z * bestT });
    if (!best) return;

    var v = best.v;
    // behind the victim = backstab
    var toV = { x: v.pos.x - shooter.pos.x, y: 0, z: v.pos.z - shooter.pos.z };
    M.vnorm(toV, toV);
    var vf = M.angleVectors(v.yaw, 0);
    var behind = (vf.x * toV.x + vf.z * toV.z) > 0.45;
    var base = shot.secondary ? (behind ? w.secondaryBackstab : w.secondaryDmg) : (behind ? w.backstab : w.dmg);
    var dmg = W.resolveDamage({ dmg: base, rangeMod: 1, armorPen: w.armorPen, pellets: 1 }, 0, best.group, v.armor, v.helmet, 1);
    this.dealDamage(v, shooter, w, dmg.health, dmg.armor, best.group, false);
  };

  /* ---------------------------------------------------------------
   * Per-player command processing
   * ------------------------------------------------------------- */
  Match.prototype.applyCommand = function (p, cmd, dt) {
    if (!cmd) cmd = { forward: 0, side: 0, yaw: p.yaw, pitch: p.pitch };
    var frozen = (this.phase === PH.FREEZE || this.phase === PH.ENDED || this.phase === PH.HALFTIME ||
                  this.phase === PH.MATCH_END);

    if (!p.alive) { p.planting = 0; p.defusing = 0; return; }

    P.move(p, cmd, this.world, dt, frozen);
    P.updateWeapon(p, dt);

    if (p.pendingFallDamage) {
      this.dealDamage(p, null, null, p.pendingFallDamage, 0, C.HITGROUP.LEG, false);
      this.emit({ t: 'land', id: p.id, hard: true, x: p.pos.x, y: p.pos.y, z: p.pos.z });
      p.pendingFallDamage = 0;
      if (!p.alive) return;
    }
    if (p.justJumped) { this.emit({ t: 'jump', id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z }); p.justJumped = false; }

    // footsteps
    var interval = P.footstepInterval(p);
    if (p.stepDist >= interval) {
      p.stepDist = 0;
      var vol = P.footstepVolume(p);
      if (vol > 0.02) {
        var below = this.world.rayWorld(p.pos.x, p.pos.y + 0.2, p.pos.z, 0, -1, 0, 1.0);
        var surf = below ? (below.box.mat || 'concrete') : 'concrete';
        p.lastSurface = surf;
        this.emit({ t: 'step', id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, surf: surf, vol: vol });
      }
    }

    if (frozen) { p.triggerHeld = !!cmd.attack; return; }

    // weapon selection
    if (cmd.slot && cmd.slot !== p.lastSlotCmd) { P.switchSlotNumber(p, cmd.slot); }
    p.lastSlotCmd = cmd.slot;
    if (cmd.wheel) { P.nextWeapon(p, cmd.wheel > 0 ? 1 : -1); }
    if (cmd.lastWeapon && !p.lastWeaponHeld) { P.switchTo(p, p.lastSlot); }
    p.lastWeaponHeld = !!cmd.lastWeapon;

    if (cmd.reload && !p.reloadHeld) P.startReload(p);
    p.reloadHeld = !!cmd.reload;
    if (P.needsReload(p) && !p.reloadTimer && cmd.attack) P.startReload(p);

    if (cmd.drop && !p.dropHeld) {
      var dropped = P.dropCurrent(p);
      if (dropped && dropped.id !== 'bomb') {
        this.droppedWeapons.push({
          id: this.nextDropId++, wid: dropped.id, mag: dropped.mag, reserve: dropped.reserve,
          x: p.pos.x, y: p.pos.y + 0.9, z: p.pos.z, yaw: p.yaw, born: this.time,
          vx: Math.cos(p.yaw) * 3.2, vy: 1.2, vz: -Math.sin(p.yaw) * 3.2
        });
        this.emit({ t: 'drop', id: p.id, wid: dropped.id });
      } else if (dropped && dropped.id === 'bomb') {
        this.dropBomb(p);
      }
    }
    p.dropHeld = !!cmd.drop;

    if (cmd.inspect && !p.inspectHeld && P.canAct(p)) { p.inspectTimer = 2.0; this.emit({ t: 'inspect', id: p.id }); }
    p.inspectHeld = !!cmd.inspect;

    // scope
    var wdef = P.curWeapon(p);
    if (cmd.attack2 && !p.attack2Held) {
      if (wdef.scope) P.toggleScope(p);
    }

    // use: plant / defuse / pick up
    if (cmd.use) {
      this.pickupBomb(p);
      this.tryPickupWeapon(p);
    }
    this.updatePlant(p, cmd, dt);
    this.updateDefuse(p, cmd, dt);

    // throwing grenades
    var isNade = p.cur.indexOf('nade:') === 0;
    if (isNade) {
      var slot = P.curSlot(p);
      if ((cmd.attack || cmd.attack2) && p.deployTimer <= 0) {
        p.nadeCharge = (p.nadeCharge || 0) + dt;
        p.nadeMode = cmd.attack2 ? (cmd.attack ? 0.32 : 0.58) : 1.0;
      } else if (p.nadeCharge > 0) {
        var power = p.nadeMode || 1.0;
        var aim2 = P.aimAngles(p);
        var dirv = M.angleVectors(aim2.yaw, aim2.pitch);
        P.eyePos(p, _eye);
        G.throwGrenade(this.nades, p, slot.id, _eye, dirv, power, this.time);
        this.emit({ t: 'throw', id: p.id, wid: slot.id, power: power });
        slot.count--;
        p.nadeCharge = 0;
        if (slot.count <= 0) {
          for (var gi = 0; gi < p.grenades.length; gi++) if (p.grenades[gi] === slot) { p.grenades.splice(gi, 1); break; }
          var list = P.slotList(p);
          P.switchTo(p, list[0] || 'knife');
        } else {
          p.deployTimer = 0.55;
        }
      }
    } else if (wdef.cls !== 'bomb') {
      // firing
      if (cmd.attack) {
        var shot = P.tryFire(p, false);
        if (shot) this.resolveShot(p, shot, cmd.lagTime);
      } else {
        P.releaseTrigger(p);
      }
      if (cmd.attack2 && !wdef.scope && wdef.cls === 'knife') {
        var shot2 = P.tryFire(p, true);
        if (shot2) this.resolveShot(p, shot2, cmd.lagTime);
      }
      if (cmd.attack2 && wdef.burst && !p.attack2Held) p.burstLeft = wdef.burst;
      if (p.burstLeft > 0 && wdef.burst) {
        var shot3 = P.tryFire(p, true);
        if (shot3 && !shot3.dryFire) { p.burstLeft--; this.resolveShot(p, shot3, cmd.lagTime); }
        else if (shot3) p.burstLeft = 0;
      }
    }
    p.attack2Held = !!cmd.attack2;
    p.useHeld = !!cmd.use;
  };

  /* Noise propagation to bot ears. Gunfire carries; suppressed fire does not. */
  Match.prototype.alertBots = function (source, x, y, z, radius, weight) {
    for (var i = 0; i < this.players.length; i++) {
      var b = this.players[i];
      if (!b.ai || !b.alive || b === source) continue;
      if (b.team === source.team) continue;
      if (M.vdist(b.pos, { x: x, y: y, z: z }) > radius) continue;
      CS.Bots.alert(b, x, y, z, this.time, weight);
    }
  };

  Match.prototype.tryPickupWeapon = function (p) {
    for (var i = 0; i < this.droppedWeapons.length; i++) {
      var d = this.droppedWeapons[i];
      var dist = M.vdist(p.pos, { x: d.x, y: d.y, z: d.z });
      if (dist > 1.6) continue;
      if (P.pickup(p, { id: d.wid, mag: d.mag, reserve: d.reserve })) {
        this.droppedWeapons.splice(i, 1);
        this.emit({ t: 'pickup', id: p.id, wid: d.wid });
        return true;
      }
    }
    return false;
  };

  /* ---------------------------------------------------------------
   * Aim training
   * ------------------------------------------------------------- */
  Match.prototype.initAimMode = function () {
    this.aimStats = { shots: 0, hits: 0, kills: 0, startTime: this.time, reactSum: 0, reactN: 0, best: 0 };
    this.targets = [];
    for (var i = 0; i < 5; i++) this.spawnTarget();
  };

  /* Targets only spawn where a shooter can actually see them — no pop-ups
   * hidden behind a crate, which would just feel unfair. */
  Match.prototype.spawnTarget = function () {
    var shooters = this.players.filter(function (p) { return p.alive; });
    var from = shooters.length ? shooters[(Math.random() * shooters.length) | 0] : null;
    var eye = from ? { x: from.pos.x, y: from.pos.y + from.eye, z: from.pos.z } : { x: 0, y: 1.6, z: 0 };
    var best = null;
    for (var attempt = 0; attempt < 24; attempt++) {
      var a = Math.random() * Math.PI * 2, r = 7 + Math.random() * 13;
      var x = M.clamp(eye.x + Math.cos(a) * r, -20, 20);
      var z = M.clamp(eye.z + Math.sin(a) * r, -20, 20);
      var y = this.world.dropToFloor(x, 9, z, 14);
      if (!this.world.standClear(x, y, z, C.PLAYER_RADIUS, C.STAND_HEIGHT)) continue;
      if (!this.world.losWorld(eye.x, eye.y, eye.z, x, y + 1.25, z)) continue;
      best = { x: x, y: y, z: z };
      break;
    }
    if (!best) {
      var w = this.world.randomWalkable();
      best = { x: w.x, y: w.y, z: w.z };
    }
    this.targets.push({
      id: this.nextDropId++, x: best.x, y: best.y, z: best.z, height: 1.83,
      born: this.time, alive: true, hp: 100, bob: Math.random() * 6.28
    });
  };

  Match.prototype.updateAim = function (dt) {
    for (var i = this.targets.length - 1; i >= 0; i--) {
      var t = this.targets[i];
      if (!t.alive) { this.targets.splice(i, 1); this.spawnTarget(); continue; }
      if (this.time - t.born > 6.5) { this.targets.splice(i, 1); this.spawnTarget(); }
    }
    while (this.targets.length < 5) this.spawnTarget();
  };

  /* ---------------------------------------------------------------
   * Main tick
   * ------------------------------------------------------------- */
  Match.prototype.tick = function (dt, commands) {
    this.time += dt;
    var i, p;

    if (this.phaseTime > 0) this.phaseTime -= dt;

    this.recordHistory();

    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      if (p.team !== C.TEAM.ATT && p.team !== C.TEAM.DEF) continue;
      if (!p.alive) {
        if ((this.rules.respawn || this.rules.mode === 'aim' || this.phase === PH.WARMUP) &&
            p.respawnAt && this.time >= p.respawnAt && this.phase === PH.LIVE) {
          this.respawnPlayer(p);
        }
        continue;
      }
      var cmd = p.bot ? CS.Bots.think(p, this, dt, this.time) : (commands ? commands[p.id] : null);
      this.applyCommand(p, cmd, dt);
    }

    // grenades
    var gev = [];
    G.update(this.nades, this.world, dt, this.time, this.players, gev);
    for (i = 0; i < gev.length; i++) this.handleGrenadeEvent(gev[i]);

    // burning
    for (i = 0; i < this.players.length; i++) {
      p = this.players[i];
      if (!p.alive) continue;
      var fire = G.fireDamage(this.nades, p, dt);
      if (fire) {
        var src = this.byId[fire.owner] || null;
        this.dealDamage(p, src, W.get('molotov'), fire.dmg, 0, C.HITGROUP.LEG, false);
        p.burnTime = this.time;
      }
    }

    // dropped weapons fall to the ground
    for (i = 0; i < this.droppedWeapons.length; i++) {
      var d = this.droppedWeapons[i];
      if (d.vy !== undefined) {
        d.vy -= C.GRAVITY * dt;
        d.x += (d.vx || 0) * dt; d.y += d.vy * dt; d.z += (d.vz || 0) * dt;
        var floor = this.world.dropToFloor(d.x, d.y + 0.4, d.z, 3);
        if (d.y <= floor + 0.08) { d.y = floor + 0.08; delete d.vy; d.vx = d.vz = 0; }
      }
    }

    if (this.rules.mode === 'aim') this.updateAim(dt);

    // bomb timer
    if (this.bomb && this.bomb.planted && !this.bomb.defused && !this.bomb.exploded) {
      if (this.phaseTime <= 0) this.explodeBomb();
    }

    if (this.phaseTime <= 0) {
      this.phaseTime = 0;
      this.advancePhase();
    } else {
      this.checkRoundEnd();
    }
  };

  Match.prototype.respawnPlayer = function (p) {
    var list = this.map.dmSpawns || this.map.spawns[p.team];
    var spot = null, bestScore = -1;
    // pick the spawn furthest from any living enemy
    for (var i = 0; i < list.length; i++) {
      var s = list[i], worst = 1e9;
      for (var k = 0; k < this.players.length; k++) {
        var o = this.players[k];
        if (!o.alive || o.team === p.team) continue;
        worst = Math.min(worst, M.vdist(s, o.pos));
      }
      if (worst > bestScore) { bestScore = worst; spot = s; }
    }
    P.spawn(p, spot || list[0], false);
    this.giveDefaultLoadout(p, true);
    p.spawnProtect = 1.2;
    p.respawnAt = 0;
    this.emit({ t: 'spawn', id: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
  };

  Match.prototype.handleGrenadeEvent = function (ev) {
    var i, p;
    if (ev.t === 'he') {
      for (i = 0; i < this.players.length; i++) {
        p = this.players[i];
        if (!p.alive) continue;
        var raw = G.explosionDamage(ev, p, this.world);
        if (raw <= 0) continue;
        var owner = this.byId[ev.owner] || null;
        var dmg = W.resolveDamage(W.get('he'), 0, C.HITGROUP.CHEST, p.armor, p.helmet, raw / W.get('he').dmg);
        this.dealDamage(p, owner, W.get('he'), dmg.health, dmg.armor, C.HITGROUP.CHEST, false);
      }
    } else if (ev.t === 'flash') {
      for (i = 0; i < this.players.length; i++) {
        p = this.players[i];
        if (!p.alive) continue;
        var fx = G.flashEffect(ev, p, this.world);
        if (!fx) continue;
        if (fx.amount > p.flashAmount) { p.flashAmount = fx.amount; p.flashTime = fx.hold; }
        this.emit({ t: 'flashed', id: p.id, amount: fx.amount, hold: fx.hold, by: ev.owner });
      }
    }
    this.emit(ev);
  };

  /* ---------------------------------------------------------------
   * Bots
   * ------------------------------------------------------------- */
  Match.prototype.buyFor = function (p, id) {
    return P.buy(p, id, this.world, this.rules, this.isBuyTime(p));
  };

  Match.prototype.addBot = function (team, difficulty, name) {
    var B = CS.Bots;
    var p = P.create({ name: name || B.nextName(), team: team, bot: true });
    B.attach(p, difficulty || this.rules.botDifficulty);
    this.addPlayer(p);
    if (this.phase !== PH.WARMUP && this.phase !== PH.MATCH_END) {
      var list = this.map.spawns[team] || this.map.spawns[1];
      P.spawn(p, list[(this.teamCount(team) - 1) % list.length], false);
      P.giveWeapon(p, team === C.TEAM.ATT ? 'gs18' : 'sentinel');
      p.alive = this.phase === PH.FREEZE;
    }
    return p;
  };

  Match.prototype.fillBots = function (perTeam, difficulty) {
    for (var t = 1; t <= 2; t++) {
      var have = this.teamCount(t);
      for (var i = have; i < perTeam; i++) this.addBot(t, difficulty);
    }
  };

  Match.prototype.removeBots = function (count) {
    for (var i = this.players.length - 1; i >= 0 && count > 0; i--) {
      if (this.players[i].bot) { this.removePlayer(this.players[i].id); count--; }
    }
  };

  /* Attackers commit to one site per round; defenders spread across both. */
  Match.prototype.planRound = function () {
    this.attPlan = Math.random() < 0.5 ? 'a' : 'b';
    var def = this.teamPlayers(C.TEAM.DEF);
    var toggle = 0;
    var assign = {};
    for (var i = 0; i < def.length; i++) {
      assign[def[i].id] = (toggle++ % 2 === 0) ? 'hold_a' : 'hold_b';
    }
    this.defAssign = function (p) { return assign[p.id] || 'hold_a'; };
    for (var k = 0; k < this.players.length; k++) {
      var pl = this.players[k];
      if (pl.ai) {
        pl.ai.plan = null; pl.ai.planAt = 0;
        pl.ai.holdSpot = null; pl.ai.roamSpot = null; pl.ai.roamGoalTag = null;
        pl.ai.path = null; pl.ai.pathGoal = null; pl.ai.target = null;
        pl.ai.lastKnown = null; pl.ai.alertUntil = 0; pl.ai.buyDone = false;
        pl.ai.aimYaw = pl.yaw; pl.ai.aimPitch = 0;
      }
    }
  };

  /* Serialisable state for clients. */
  Match.prototype.stateSnapshot = function () {
    return {
      time: this.time, round: this.round, phase: this.phase, phaseTime: this.phaseTime,
      score: this.score, winner: this.roundWinner, reason: this.roundReason,
      swapped: this.sideSwapped, ot: this.overtimeRound, over: this.matchOver,
      bomb: this.bomb ? {
        planted: !!this.bomb.planted, dropped: !!this.bomb.dropped,
        x: this.bomb.x, y: this.bomb.y, z: this.bomb.z, site: this.bomb.site,
        defusing: this.bomb.defusing || 0, defuseNeed: this.bomb.defuseNeed || 10,
        defuserId: this.bomb.defuserId || null
      } : null,
      dmScore: this.dmScore
    };
  };

  CS.Match = Match;
})(typeof window !== 'undefined' ? window : globalThis);
