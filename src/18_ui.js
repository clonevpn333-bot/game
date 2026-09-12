/* =============================================================
 * BREACHPOINT — user interface
 * Menus, HUD, buy menu, scoreboard, radar, crosshair, chat.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C, W = CS.W, P = CS.P, Geo = CS.Geo;

  var doc = root.document;
  function el(id) { return doc.getElementById(id); }
  function mk(tag, cls, html) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function on(node, ev, fn) { if (node) node.addEventListener(ev, fn); }

  var KEY_LABEL = {
    Space: 'SPACE', ControlLeft: 'L CTRL', ControlRight: 'R CTRL', ShiftLeft: 'L SHIFT',
    ShiftRight: 'R SHIFT', AltLeft: 'L ALT', AltRight: 'R ALT', Tab: 'TAB', Escape: 'ESC',
    Enter: 'ENTER', CapsLock: 'CAPS', Backquote: '`', Minus: '-', Equal: '=',
    BracketLeft: '[', BracketRight: ']', Backslash: '\\', Semicolon: ';', Quote: "'",
    Comma: ',', Period: '.', Slash: '/', MouseLeft: 'MOUSE 1', MouseRight: 'MOUSE 2',
    MouseMiddle: 'MOUSE 3', Mouse3: 'MOUSE 4', Mouse4: 'MOUSE 5',
    WheelUp: 'WHEEL UP', WheelDown: 'WHEEL DOWN'
  };
  function keyLabel(code) {
    if (!code) return '—';
    if (KEY_LABEL[code]) return KEY_LABEL[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad/.test(code)) return 'NUM ' + code.slice(6);
    if (/^Arrow/.test(code)) return code.slice(5).toUpperCase();
    return code.toUpperCase();
  }
  CS.keyLabel = keyLabel;

  /* ===============================================================
   * UI
   * =============================================================== */
  function UI(game) {
    this.game = game;
    this.settings = game.settings;
    this.screen = null;
    this.buyOpen = false;
    this.scoreOpen = false;
    this.chatMode = null;
    this.killfeedItems = [];
    this.chatItems = [];
    this.dmgNums = [];
    this.radarCache = {};
    this.listenKey = null;
    this.settingsTab = 'game';
    this.buyCat = 'rifle';
    this.buyHover = null;
    this.build();
  }

  UI.prototype.build = function () {
    var r = el('ui');
    r.innerHTML = TEMPLATE;
    this.cacheNodes();
    this.wire();
  };

  UI.prototype.cacheNodes = function () {
    this.n = {
      loading: el('loading'), loadingBar: el('loadBar'), loadingStatus: el('loadStatus'), loadingTip: el('loadTip'),
      mainmenu: el('mainmenu'), play: el('playscreen'), lobby: el('lobbyscreen'),
      settings: el('settingsscreen'), cosmetics: el('cosmeticsscreen'),
      pause: el('pausemenu'), results: el('resultsscreen'),
      hud: el('hud'), topbar: el('topbar'),
      scoreA: el('scoreA'), scoreD: el('scoreD'), nameA: el('nameA'), nameD: el('nameD'),
      aliveA: el('aliveA'), aliveD: el('aliveD'),
      clock: el('clock'), phase: el('phase'),
      bombstrip: el('bombstrip'), bombTime: el('bombTime'), bombLabel: el('bombLabel'),
      hp: el('hpNum'), hpBar: el('hpBar'), armorNum: el('armorNum'), armorWrap: el('armorWrap'),
      kitBadge: el('kitbadge'), vitalsHp: el('vitalsHp'),
      wname: el('wname'), ammoCount: el('ammoCount'), nades: el('nadeRow'),
      money: el('moneyAmt'), moneyDelta: el('moneyDelta'), teamecon: el('teamecon'),
      killfeed: el('killfeed'), radar: el('radarCanvas'), callout: el('calloutText'),
      mates: el('mates'), xhair: el('xhairCanvas'), hitmark: el('hitmark'),
      banner: el('banner'), bannerBig: el('bannerBig'), bannerSmall: el('bannerSmall'), bannerMvp: el('bannerMvp'),
      centertext: el('centertext'), progress: el('progress'), progressBar: el('progressBar'), progressLabel: el('progressLabel'),
      chatbox: el('chatbox'), chatinput: el('chatinput'), chatfield: el('chatfield'), chatprefix: el('chatprefix'),
      flash: el('flashoverlay'), dmg: el('dmgoverlay'), lowhp: el('lowhp'), burn: el('burnoverlay'),
      scope: el('scopeoverlay'),
      buymenu: el('buymenu'), buycats: el('buycats'), buyitems: el('buyitems'), buyinfo: el('buyinfo'),
      buyMoney: el('buyMoney'), buyTime: el('buyTime'),
      scoreboard: el('scoreboard'), sbBody: el('sbBody'),
      spectate: el('spectate'), specWho: el('specWho'), deadinfo: el('deadinfo'),
      perf: el('perf'), toasts: el('toasts'),
      voicehud: el('voicehud'), pttstate: el('pttstate'),
      dmgLayer: el('dmgLayer')
    };
    this.xctx = this.n.xhair ? this.n.xhair.getContext('2d') : null;
    this.rctx = this.n.radar ? this.n.radar.getContext('2d') : null;
  };

  /* ---------------------------------------------------------------
   * Screens
   * ------------------------------------------------------------- */
  UI.prototype.show = function (name) {
    var screens = ['mainmenu', 'play', 'lobby', 'settings', 'cosmetics', 'pause', 'results'];
    for (var i = 0; i < screens.length; i++) {
      var node = this.n[screens[i]];
      if (node) node.classList.toggle('hidden', screens[i] !== name);
    }
    this.screen = name;
    var inGame = !name;
    this.n.hud.classList.toggle('hidden', !inGame);
    if (name === 'settings') this.renderSettings();
    if (name === 'cosmetics') this.renderCosmetics();
    if (name === 'play') this.renderPlay();
    if (name === 'lobby') this.renderLobby();
    if (name === 'mainmenu') this.renderMain();
  };
  UI.prototype.inMenu = function () { return !!this.screen; };

  UI.prototype.setLoading = function (pct, status) {
    if (!this.n.loading) return;
    this.n.loading.classList.remove('hidden');
    this.n.loadingBar.style.width = Math.round(pct * 100) + '%';
    if (status) this.n.loadingStatus.textContent = status;
  };
  UI.prototype.hideLoading = function () {
    if (this.n.loading) this.n.loading.classList.add('hidden');
  };

  /* ---------------------------------------------------------------
   * Wiring
   * ------------------------------------------------------------- */
  UI.prototype.wire = function () {
    var self = this, g = this.game;

    doc.addEventListener('click', function (e) {
      var act = e.target.closest && e.target.closest('[data-act]');
      if (!act) return;
      var a = act.getAttribute('data-act');
      var v = act.getAttribute('data-val');
      self.action(a, v, act, e);
    });
    doc.addEventListener('mouseover', function (e) {
      var b = e.target.closest && e.target.closest('.btn,.mode-card,.map-card,.bitem,.bcat,.skin');
      if (b && g.audio && g.audio.ready) g.audio.local('hover');
    });

    on(el('nameInput'), 'change', function () {
      self.settings.name = (this.value || '').slice(0, 18) || C.randomName();
      this.value = self.settings.name;
      C.saveSettings(self.settings);
      g.onNameChanged();
    });
    on(el('joinCode'), 'input', function () {
      this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    });
    on(el('joinCode'), 'keydown', function (e) {
      if (e.key === 'Enter') self.action('join-go');
      e.stopPropagation();
    });
    on(this.n.chatfield, 'keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { self.sendChat(); }
      else if (e.key === 'Escape') { self.closeChat(); }
    });
  };

  UI.prototype.action = function (a, v, node, ev) {
    var g = this.game, self = this;
    if (g.audio && g.audio.ready && a !== 'none') g.audio.local('click');
    switch (a) {
      case 'goto': this.show(v); break;
      case 'back': this.show(v || 'mainmenu'); break;
      case 'mode': g.chooseMode(v); this.show('play'); break;
      case 'map': g.setMap(v); this.renderPlay(); break;
      case 'vote-map': g.voteMap(v); break;
      case 'create': g.createMatch(); break;
      case 'solo': g.startSolo(); break;
      case 'join-go':
        var code = (el('joinCode').value || '').toUpperCase().trim();
        if (code.length < 4) { this.toast('Enter the room code first.', 'bad'); return; }
        g.joinMatch(code); break;
      case 'ready': g.toggleReady(); break;
      case 'start': g.hostStart(); break;
      case 'leave': g.leaveMatch(); break;
      case 'switch-team': g.requestTeam(parseInt(v, 10)); break;
      case 'add-bot': g.addBot(parseInt(v, 10)); break;
      case 'kick-bot': g.removeBot(); break;
      case 'settings-tab': this.settingsTab = v; this.renderSettings(); break;
      case 'reset-settings':
        if (root.confirm('Reset every setting to defaults?')) { g.resetSettings(); this.renderSettings(); }
        break;
      case 'bind': this.beginBind(v, node); break;
      case 'buy-cat': this.buyCat = v; this.renderBuy(); break;
      case 'buy': g.buy(v); this.renderBuy(); break;
      case 'close-buy': this.closeBuy(); break;
      case 'resume': g.resume(); break;
      case 'quit': g.quitToMenu(); break;
      case 'skin': g.setSkin(node.getAttribute('data-weapon'), v); this.renderCosmetics(); break;
      case 'glove': g.setGlove(v); this.renderCosmetics(); break;
      case 'char': g.setCharacter(parseInt(node.getAttribute('data-team'), 10), v); this.renderCosmetics(); break;
      case 'cos-weapon': this.cosWeapon = v; this.renderCosmetics(); break;
      case 'copy-code':
        try {
          root.navigator.clipboard.writeText(g.roomCode || '');
          this.toast('Room code copied.', 'good');
        } catch (e) { this.toast('Copy failed — read it out instead.', 'bad'); }
        break;
      case 'rules': g.setRule(node.getAttribute('data-rule'), v); this.renderLobby(); break;
      case 'again': g.playAgain(); break;
    }
  };

  /* ---------------------------------------------------------------
   * Main menu / play screen
   * ------------------------------------------------------------- */
  UI.prototype.renderMain = function () {
    var input = el('nameInput');
    if (input) input.value = this.settings.name;
    var modes = el('modeList');
    if (!modes) return;
    var order = ['competitive', 'casual', 'deathmatch', 'practice', 'aim'];
    var html = '';
    for (var i = 0; i < order.length; i++) {
      var m = C.MODE_PRESETS[order[i]];
      html += '<div class="mode-card" data-act="mode" data-val="' + order[i] + '">' +
              '<div class="k">' + (i === 0 ? 'Ranked style' : (order[i] === 'aim' ? 'Training' : 'Casual')) + '</div>' +
              '<div class="n">' + esc(m.label) + '</div>' +
              '<div class="d">' + esc(m.desc) + '</div></div>';
    }
    modes.innerHTML = html;
  };

  UI.prototype.renderPlay = function () {
    var g = this.game;
    var m = C.MODE_PRESETS[g.pendingMode] || C.MODE_PRESETS.competitive;
    var t = el('playTitle'); if (t) t.textContent = m.label;
    var d = el('playDesc'); if (d) d.textContent = m.desc;

    var list = (g.pendingMode === 'aim') ? ['arena'] :
               (g.pendingMode === 'deathmatch') ? CS.Maps.order : CS.Maps.competitive;
    var wrap = el('mapList');
    if (!wrap) return;
    wrap.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var map = CS.Maps.get(list[i]);
      var card = mk('div', 'map-card' + (g.pendingMap === list[i] ? ' sel' : ''));
      card.setAttribute('data-act', 'map');
      card.setAttribute('data-val', list[i]);
      var cv = mk('canvas');
      cv.width = 320; cv.height = 208;
      card.appendChild(cv);
      card.appendChild(mk('div', 'info', '<b>' + esc(map.name) + '</b><span>' + esc(map.desc) + '</span>'));
      wrap.appendChild(card);
      this.drawMapPreview(cv, map);
    }
    var soloBtn = el('soloBtn');
    if (soloBtn) soloBtn.textContent = (g.pendingMode === 'aim' || g.pendingMode === 'practice')
      ? 'Start training' : 'Play offline with bots';
  };

  /* Top-down map thumbnail, drawn straight from the collision boxes. */
  UI.prototype.drawMapPreview = function (canvas, map) {
    var ctx = canvas.getContext('2d');
    var b = map.bounds;
    var w = canvas.width, h = canvas.height;
    var sx = w / (b.x1 - b.x0), sz = h / (b.z1 - b.z0);
    var s = Math.min(sx, sz);
    var ox = (w - (b.x1 - b.x0) * s) / 2, oz = (h - (b.z1 - b.z0) * s) / 2;
    ctx.fillStyle = '#0c1016'; ctx.fillRect(0, 0, w, h);
    for (var i = 0; i < map.boxes.length; i++) {
      var box = map.boxes[i];
      if (box.max.y - box.min.y < 0.4) continue;
      var hgt = M.clamp((box.max.y) / 7, 0, 1);
      ctx.fillStyle = 'rgba(' + Math.round(70 + hgt * 90) + ',' + Math.round(80 + hgt * 92) + ',' + Math.round(94 + hgt * 96) + ',0.9)';
      ctx.fillRect(ox + (box.min.x - b.x0) * s, oz + (box.min.z - b.z0) * s,
                   Math.max(1, (box.max.x - box.min.x) * s), Math.max(1, (box.max.z - box.min.z) * s));
    }
    for (var k = 0; k < map.sites.length; k++) {
      var site = map.sites[k];
      ctx.strokeStyle = 'rgba(255,122,47,.85)'; ctx.lineWidth = 1.5;
      ctx.strokeRect(ox + (site.min.x - b.x0) * s, oz + (site.min.z - b.z0) * s,
                     (site.max.x - site.min.x) * s, (site.max.z - site.min.z) * s);
      ctx.fillStyle = '#ff7a2f'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(site.name, ox + (site.center.x - b.x0) * s, oz + (site.center.z - b.z0) * s + 5);
    }
    var teams = [[1, '#e0a53a'], [2, '#4aa8ff']];
    for (var t = 0; t < teams.length; t++) {
      var sp = map.spawns[teams[t][0]];
      if (!sp) continue;
      ctx.fillStyle = teams[t][1];
      for (var q = 0; q < Math.min(5, sp.length); q++) {
        ctx.beginPath();
        ctx.arc(ox + (sp[q].x - b.x0) * s, oz + (sp[q].z - b.z0) * s, 2.2, 0, 6.283);
        ctx.fill();
      }
    }
  };

  /* ---------------------------------------------------------------
   * Lobby
   * ------------------------------------------------------------- */
  UI.prototype.renderLobby = function () {
    var g = this.game;
    var codeEl = el('lobbyCode');
    if (codeEl) codeEl.textContent = g.roomCode || '—';
    var statusEl = el('lobbyStatus');
    if (statusEl) statusEl.textContent = g.lobbyStatus || '';
    var mapEl = el('lobbyMap');
    if (mapEl) mapEl.textContent = CS.Maps.get(g.pendingMap).name;
    var modeEl = el('lobbyMode');
    if (modeEl) modeEl.textContent = (C.MODE_PRESETS[g.pendingMode] || {}).label || '';

    var att = el('teamAtt'), def = el('teamDef');
    if (!att || !def) return;
    var size = g.rules.teamSize || 5;
    var lists = { 1: [], 2: [] };
    for (var i = 0; i < g.lobbyPlayers.length; i++) {
      var p = g.lobbyPlayers[i];
      if (lists[p.team]) lists[p.team].push(p);
    }
    function render(node, team) {
      var html = '';
      var arr = lists[team];
      for (var k = 0; k < size; k++) {
        var p = arr[k];
        if (p) {
          html += '<div class="slot"><i class="dot' + (p.ready ? ' ready' : '') + '"></i>' +
                  '<span class="nm">' + esc(p.name) + '</span>' +
                  (p.bot ? '<span class="bot">BOT ' + esc(p.skill || '') + '</span>' : '') +
                  (p.host ? '<span class="bot">HOST</span>' : '') + '</div>';
        } else {
          html += '<div class="slot empty"><i class="dot"></i><span class="nm">Open slot</span></div>';
        }
      }
      node.innerHTML = html;
    }
    render(att, 1); render(def, 2);

    var readyBtn = el('readyBtn');
    if (readyBtn) {
      readyBtn.textContent = g.localReady ? 'Not ready' : 'Ready up';
      readyBtn.classList.toggle('primary', !g.localReady);
    }
    var startBtn = el('startBtn');
    if (startBtn) {
      startBtn.classList.toggle('hidden', !g.isHost);
      var allReady = g.lobbyPlayers.filter(function (p) { return !p.bot; }).every(function (p) { return p.ready; });
      startBtn.disabled = !allReady;
      startBtn.textContent = allReady ? 'Start match' : 'Waiting for players…';
    }
    var hostOnly = doc.querySelectorAll('.host-only');
    for (var h = 0; h < hostOnly.length; h++) hostOnly[h].classList.toggle('hidden', !g.isHost);

    var rulesBox = el('lobbyRules');
    if (rulesBox && g.isHost) {
      rulesBox.innerHTML = this.rulesHTML(g.rules);
    } else if (rulesBox) {
      rulesBox.innerHTML = '<div class="lo-row"><span>Rounds</span><b>First to ' + g.rules.winRounds + '</b></div>' +
        '<div class="lo-row"><span>Friendly fire</span><b>' + (g.rules.friendlyFire ? 'On' : 'Off') + '</b></div>' +
        '<div class="lo-row"><span>Overtime</span><b>' + (g.rules.overtime ? 'On' : 'Off') + '</b></div>' +
        '<div class="lo-row"><span>Bots</span><b>' + (g.rules.botFill ? 'Fill teams' : 'Off') + '</b></div>';
    }
    this.renderMapVotes();
    this.bindRuleInputs();
    this.renderLobbyChat();
  };

  UI.prototype.renderMapVotes = function () {
    var wrap = el('lobbyMaps');
    if (!wrap) return;
    var g = this.game;
    var list = g.pendingMode === 'aim' ? ['arena'] :
               g.pendingMode === 'deathmatch' ? CS.Maps.order : CS.Maps.competitive;
    var tally = {};
    for (var k in g.mapVotes) tally[g.mapVotes[k]] = (tally[g.mapVotes[k]] || 0) + 1;
    var html = '';
    for (var i = 0; i < list.length; i++) {
      var map = CS.Maps.get(list[i]);
      var votes = tally[list[i]] || 0;
      html += '<div class="map-card' + (g.pendingMap === list[i] ? ' sel' : '') +
        '" data-act="vote-map" data-val="' + list[i] + '" style="min-width:0">' +
        (votes ? '<div class="votes">' + votes + '</div>' : '') +
        '<div class="info"><b>' + esc(map.name) + '</b></div></div>';
    }
    wrap.innerHTML = html;
  };

  UI.prototype.bindRuleInputs = function () {
    var g = this.game, self = this;
    var sels = doc.querySelectorAll('[data-rulesel]');
    for (var i = 0; i < sels.length; i++) {
      (function (node) {
        node.addEventListener('change', function () {
          var v = node.value;
          if (/^-?\d+(\.\d+)?$/.test(v)) v = parseFloat(v);
          g.setRule(node.getAttribute('data-rulesel'), v);
        });
      })(sels[i]);
    }
    var chks = doc.querySelectorAll('[data-rulechk]');
    for (var k = 0; k < chks.length; k++) {
      (function (node) {
        node.addEventListener('change', function () {
          g.setRule(node.getAttribute('data-rulechk'), node.checked);
        });
      })(chks[k]);
    }
  };

  UI.prototype.rulesHTML = function (r) {
    function opt(val, cur, label) {
      return '<option value="' + val + '"' + (String(cur) === String(val) ? ' selected' : '') + '>' + label + '</option>';
    }
    return '' +
      '<div class="setting"><label>Round limit</label><select data-rulesel="winRounds">' +
        opt(9, r.winRounds, 'First to 9 (MR8)') + opt(13, r.winRounds, 'First to 13 (MR12)') +
        opt(16, r.winRounds, 'First to 16 (MR15)') + '</select><span class="val"></span></div>' +
      '<div class="setting"><label>Round time</label><select data-rulesel="roundTime">' +
        opt(90, r.roundTime, '1:30') + opt(115, r.roundTime, '1:55') + opt(155, r.roundTime, '2:35') +
        '</select><span class="val"></span></div>' +
      '<div class="setting"><label>Freeze time</label><select data-rulesel="freezeTime">' +
        opt(5, r.freezeTime, '5s') + opt(10, r.freezeTime, '10s') + opt(15, r.freezeTime, '15s') +
        opt(20, r.freezeTime, '20s') + '</select><span class="val"></span></div>' +
      '<div class="setting"><label>Start money</label><select data-rulesel="startMoney">' +
        opt(800, r.startMoney, '$800') + opt(1400, r.startMoney, '$1400') + opt(16000, r.startMoney, '$16000') +
        '</select><span class="val"></span></div>' +
      '<div class="setting"><label>Friendly fire</label><input type="checkbox" data-rulechk="friendlyFire"' +
        (r.friendlyFire ? ' checked' : '') + '><span class="val"></span></div>' +
      '<div class="setting"><label>Overtime</label><input type="checkbox" data-rulechk="overtime"' +
        (r.overtime ? ' checked' : '') + '><span class="val"></span></div>' +
      '<div class="setting"><label>Team balance</label><input type="checkbox" data-rulechk="teamBalance"' +
        (r.teamBalance ? ' checked' : '') + '><span class="val"></span></div>' +
      '<div class="setting"><label>Fill with bots</label><input type="checkbox" data-rulechk="botFill"' +
        (r.botFill ? ' checked' : '') + '><span class="val"></span></div>' +
      '<div class="setting"><label>Bot difficulty</label><select data-rulesel="botDifficulty">' +
        opt('easy', r.botDifficulty, 'Easy') + opt('normal', r.botDifficulty, 'Normal') +
        opt('hard', r.botDifficulty, 'Hard') + opt('expert', r.botDifficulty, 'Expert') +
        '</select><span class="val"></span></div>';
  };

  UI.prototype.renderLobbyChat = function () {
    var box = el('lobbyChat');
    if (!box) return;
    var html = '';
    for (var i = 0; i < this.chatItems.length; i++) {
      var c = this.chatItems[i];
      html += '<div>' + this.chatLineHTML(c) + '</div>';
    }
    box.innerHTML = html;
    box.scrollTop = box.scrollHeight;
  };

  /* ---------------------------------------------------------------
   * Settings
   * ------------------------------------------------------------- */
  UI.prototype.renderSettings = function () {
    var s = this.settings;
    var tabs = el('settingsTabs');
    var body = el('settingsBody');
    if (!tabs || !body) return;
    var list = [['game', 'Game'], ['controls', 'Controls'], ['crosshair', 'Crosshair'],
                ['video', 'Video'], ['audio', 'Audio'], ['voice', 'Voice']];
    var html = '';
    for (var i = 0; i < list.length; i++) {
      html += '<button class="tab' + (this.settingsTab === list[i][0] ? ' on' : '') +
              '" data-act="settings-tab" data-val="' + list[i][0] + '">' + list[i][1] + '</button>';
    }
    tabs.innerHTML = html;
    body.innerHTML = this['settings_' + this.settingsTab]();
    this.bindSettingInputs(body);
    if (this.settingsTab === 'crosshair') this.drawXhairPreview();
  };

  function slider(key, label, min, max, step, val, hint) {
    return '<div class="setting"><label>' + label + '</label>' +
      '<input type="range" data-set="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">' +
      '<span class="val" data-valfor="' + key + '">' + (Math.round(val * 100) / 100) + '</span>' +
      (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
  }
  function toggle(key, label, val, hint) {
    return '<div class="setting"><label>' + label + '</label>' +
      '<input type="checkbox" data-set="' + key + '"' + (val ? ' checked' : '') + '><span class="val"></span>' +
      (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
  }
  function picker(key, label, options, val, hint) {
    var o = '';
    for (var i = 0; i < options.length; i++) {
      o += '<option value="' + options[i][0] + '"' + (String(val) === String(options[i][0]) ? ' selected' : '') +
           '>' + options[i][1] + '</option>';
    }
    return '<div class="setting"><label>' + label + '</label><select data-set="' + key + '">' + o + '</select>' +
      '<span class="val"></span>' + (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
  }

  UI.prototype.settings_game = function () {
    var s = this.settings;
    return '<div class="panel">' +
      slider('sensitivity', 'Mouse sensitivity', 0.2, 8, 0.05, s.sensitivity,
             'Distance for a 360° turn scales with this and your FOV.') +
      slider('zoomSensRatio', 'Scoped sensitivity ratio', 0.2, 2, 0.05, s.zoomSensRatio) +
      toggle('invertY', 'Invert vertical look', s.invertY) +
      slider('fov', 'Field of view', 70, 120, 1, s.fov, 'Horizontal FOV. Higher shows more, makes targets smaller.') +
      slider('viewmodelFov', 'Viewmodel FOV', 54, 90, 1, s.viewmodelFov) +
      picker('viewmodelSide', 'Weapon hand', [[1, 'Right'], [-1, 'Left']], s.viewmodelSide) +
      toggle('viewmodelBob', 'Weapon bob', s.viewmodelBob) +
      toggle('hud.damageNumbers', 'Show damage numbers', s.hud.damageNumbers) +
      toggle('hud.hitmarker', 'Hit marker', s.hud.hitmarker) +
      toggle('hud.killfeed', 'Kill feed', s.hud.killfeed) +
      toggle('hud.radar', 'Radar', s.hud.radar) +
      slider('hud.radarScale', 'Radar zoom', 0.5, 2, 0.05, s.hud.radarScale) +
      '</div>';
  };

  UI.prototype.settings_controls = function () {
    var s = this.settings;
    var groups = [
      ['Movement', ['forward', 'back', 'left', 'right', 'jump', 'duck', 'walk']],
      ['Combat', ['reload', 'drop', 'use', 'inspect', 'lastWeapon']],
      ['Weapons', ['slot1', 'slot2', 'slot3', 'slot4', 'slot5']],
      ['Communication', ['voice', 'chatAll', 'chatTeam', 'buy', 'scoreboard']]
    ];
    var labels = {
      forward: 'Move forward', back: 'Move back', left: 'Strafe left', right: 'Strafe right',
      jump: 'Jump', duck: 'Crouch', walk: 'Walk (silent)', reload: 'Reload', drop: 'Drop weapon',
      use: 'Use / plant / defuse', inspect: 'Inspect weapon', lastWeapon: 'Last weapon',
      slot1: 'Primary', slot2: 'Secondary', slot3: 'Knife', slot4: 'Grenades', slot5: 'Bomb',
      voice: 'Push to talk', chatAll: 'Chat (all)', chatTeam: 'Chat (team)',
      buy: 'Buy menu', scoreboard: 'Scoreboard'
    };
    var html = '';
    for (var gi = 0; gi < groups.length; gi++) {
      html += '<div class="panel"><h3>' + groups[gi][0] + '</h3><div class="keys-grid">';
      var keys = groups[gi][1];
      for (var i = 0; i < keys.length; i++) {
        html += '<div class="keybind"><span>' + labels[keys[i]] + '</span>' +
          '<b data-act="bind" data-val="' + keys[i] + '">' + keyLabel(s.keys[keys[i]]) + '</b></div>';
      }
      html += '</div></div>';
    }
    html += '<div class="panel"><h3>Notes</h3><p class="muted" style="font-size:13px;line-height:1.7">' +
      'Mouse 1 fires, Mouse 2 is secondary fire (scope, burst, grenade lob). The scroll wheel cycles weapons. ' +
      'Hold both mouse buttons on a grenade for an underhand toss.</p></div>';
    return html;
  };

  UI.prototype.settings_crosshair = function () {
    var c = this.settings.crosshair;
    return '<div class="panel"><h3>Preview</h3><div id="xhairPreview"></div></div>' +
      '<div class="panel">' +
      picker('crosshair.style', 'Style', [['classic', 'Classic'], ['dynamic', 'Dynamic'], ['cross', 'Static cross'], ['dot', 'Dot only']], c.style) +
      slider('crosshair.size', 'Length', 0, 16, 0.5, c.size) +
      slider('crosshair.thickness', 'Thickness', 0.5, 6, 0.1, c.thickness) +
      slider('crosshair.gap', 'Gap', -3, 14, 0.5, c.gap) +
      slider('crosshair.outline', 'Outline', 0, 3, 0.1, c.outline) +
      slider('crosshair.alpha', 'Opacity', 0.2, 1, 0.05, c.alpha) +
      slider('crosshair.dynamicScale', 'Dynamic spread response', 0, 2, 0.05, c.dynamicScale) +
      toggle('crosshair.dot', 'Centre dot', c.dot) +
      toggle('crosshair.tStyle', 'T style (no top line)', c.tStyle) +
      '<div class="setting"><label>Colour</label><div class="row" id="xhairColors"></div><span class="val"></span></div>' +
      '</div>';
  };

  UI.prototype.settings_video = function () {
    var s = this.settings;
    return '<div class="panel">' +
      picker('quality', 'Graphics preset', [['low', 'Low — best performance'], ['medium', 'Medium'],
             ['high', 'High'], ['ultra', 'Ultra']], s.quality,
             'Affects lighting detail, particle counts and render resolution. Changing this rebuilds the map.') +
      slider('resolutionScale', 'Resolution scale', 0.5, 1, 0.05, s.resolutionScale,
             'Lower this first if the frame rate dips on a laptop.') +
      picker('fpsCap', 'Frame rate cap', [[0, 'Unlimited'], [30, '30'], [60, '60'], [120, '120'], [144, '144']], s.fpsCap) +
      toggle('showFps', 'Show performance counter', s.showFps) +
      toggle('showNetGraph', 'Show network stats', s.showNetGraph) +
      '</div>';
  };

  UI.prototype.settings_audio = function () {
    var s = this.settings;
    return '<div class="panel">' +
      slider('masterVolume', 'Master volume', 0, 1, 0.01, s.masterVolume) +
      slider('sfxVolume', 'Effects volume', 0, 1, 0.01, s.sfxVolume) +
      slider('musicVolume', 'Music & stingers', 0, 1, 0.01, s.musicVolume) +
      slider('voiceVolume', 'Voice chat volume', 0, 1, 0.01, s.voiceVolume) +
      '</div><div class="panel"><h3>About the audio</h3><p class="muted" style="font-size:13px;line-height:1.7">' +
      'Every sound is generated in the browser, so nothing has to download. Gunfire, footsteps and ' +
      'bomb cues are positioned in 3D and muffled through walls — listening is a real advantage.</p></div>';
  };

  UI.prototype.settings_voice = function () {
    var s = this.settings;
    var g = this.game;
    var status = g.voice && g.voice.enabled ? '<span style="color:var(--good)">Microphone ready</span>' :
                 (g.voice && g.voice.error ? '<span style="color:var(--bad)">' + esc(g.voice.error) + '</span>' :
                 '<span class="dim">Microphone not enabled yet</span>');
    return '<div class="panel">' +
      toggle('voiceEnabled', 'Enable voice chat', s.voiceEnabled) +
      toggle('pushToTalk', 'Push to talk', s.pushToTalk, 'Off means open mic — your team hears everything.') +
      toggle('voiceTeamOnly', 'Team only', s.voiceTeamOnly) +
      slider('micGain', 'Microphone gain', 0.2, 3, 0.05, s.micGain) +
      '<div class="setting"><label>Status</label><div>' + status + '</div><span class="val"></span></div>' +
      '<div class="setting"><label></label><button class="btn sm" id="micTestBtn">Enable microphone</button><span class="val"></span></div>' +
      '</div>';
  };

  UI.prototype.bindSettingInputs = function (body) {
    var self = this, g = this.game;
    var inputs = body.querySelectorAll('[data-set]');
    for (var i = 0; i < inputs.length; i++) {
      (function (inp) {
        var key = inp.getAttribute('data-set');
        var handler = function () {
          var val;
          if (inp.type === 'checkbox') val = inp.checked;
          else if (inp.tagName === 'SELECT') {
            val = inp.value;
            if (/^-?\d+(\.\d+)?$/.test(val)) val = parseFloat(val);
          } else val = parseFloat(inp.value);
          g.setSetting(key, val);
          var lbl = body.querySelector('[data-valfor="' + key + '"]');
          if (lbl) lbl.textContent = Math.round(val * 100) / 100;
          if (key.indexOf('crosshair') === 0) self.drawXhairPreview();
        };
        inp.addEventListener('input', handler);
        inp.addEventListener('change', handler);
      })(inputs[i]);
    }
    var colors = el('xhairColors');
    if (colors) {
      var palette = ['#39ff6a', '#ffffff', '#ff3b3b', '#4aa8ff', '#ffd000', '#ff00d0', '#00e5ff', '#ff7a2f'];
      colors.innerHTML = '';
      for (var c = 0; c < palette.length; c++) {
        (function (col) {
          var sw = mk('div');
          sw.style.cssText = 'width:22px;height:22px;border-radius:3px;cursor:pointer;background:' + col +
            ';border:2px solid ' + (self.settings.crosshair.color === col ? '#fff' : 'transparent');
          sw.addEventListener('click', function () {
            g.setSetting('crosshair.color', col);
            self.renderSettings();
          });
          colors.appendChild(sw);
        })(palette[c]);
      }
    }
    var mic = el('micTestBtn');
    if (mic) mic.addEventListener('click', function () { g.enableVoice(true); });
  };

  UI.prototype.beginBind = function (key, node) {
    var self = this;
    if (this.listenKey) return;
    this.listenKey = { key: key, node: node };
    node.classList.add('listening');
    node.textContent = 'Press a key…';
    var finish = function (code) {
      node.classList.remove('listening');
      self.listenKey = null;
      if (code) self.game.setKey(key, code);
      node.textContent = keyLabel(self.settings.keys[key]);
      doc.removeEventListener('keydown', kd, true);
      doc.removeEventListener('mousedown', md, true);
    };
    var kd = function (e) {
      e.preventDefault(); e.stopPropagation();
      finish(e.code === 'Escape' ? null : e.code);
    };
    var md = function (e) {
      e.preventDefault(); e.stopPropagation();
      var names = ['MouseLeft', 'MouseMiddle', 'MouseRight', 'Mouse3', 'Mouse4'];
      finish(names[e.button] || null);
    };
    setTimeout(function () {
      doc.addEventListener('keydown', kd, true);
      doc.addEventListener('mousedown', md, true);
    }, 20);
  };

  /* ---------------------------------------------------------------
   * Cosmetics
   * ------------------------------------------------------------- */
  UI.prototype.renderCosmetics = function () {
    var body = el('cosmeticsBody');
    if (!body) return;
    var s = this.settings;
    var weaponIds = ['kr47', 'ar4', 'ar4s', 'apex700', 'viper10', 'waspMP', 'torrent',
                     'talon50', 'gs18', 'sentinel', 'breaker12', 'knife'];
    var cur = this.cosWeapon || 'kr47';

    var html = '<div class="panel"><h3>Weapon finishes</h3><div class="row" style="flex-wrap:wrap;margin-bottom:14px">';
    for (var i = 0; i < weaponIds.length; i++) {
      var w = W.get(weaponIds[i]);
      html += '<button class="btn sm' + (cur === weaponIds[i] ? ' primary' : ' ghost') +
        '" data-act="cos-weapon" data-val="' + weaponIds[i] + '">' + esc(w.name) + '</button>';
    }
    html += '</div><div class="skin-grid">';
    var skins = CS.Models.skinList();
    for (var k = 0; k < skins.length; k++) {
      var sk = Geo.SKINS[skins[k].id];
      var c1 = sk.body ? rgbCss(sk.body) : '#2a2d33';
      var c2 = sk.accent ? rgbCss(sk.accent) : '#4a4f57';
      html += '<div class="skin' + ((s.skins[cur] || 'factory') === skins[k].id ? ' sel' : '') +
        '" data-act="skin" data-val="' + skins[k].id + '" data-weapon="' + cur + '">' +
        '<div class="sw" style="background:linear-gradient(120deg,' + c1 + ',' + c2 + ')"></div>' +
        '<b>' + esc(skins[k].name) + '</b><span class="r-' + skins[k].rarity + '">' + skins[k].rarity + '</span></div>';
    }
    html += '</div></div>';

    html += '<div class="panel"><h3>Gloves</h3><div class="skin-grid">';
    var gloves = CS.Models.gloveList();
    for (var gi = 0; gi < gloves.length; gi++) {
      var gc = Geo.GLOVES[gloves[gi].id].col;
      html += '<div class="skin' + (s.glove === gloves[gi].id ? ' sel' : '') +
        '" data-act="glove" data-val="' + gloves[gi].id + '">' +
        '<div class="sw" style="background:' + rgbCss(gc) + '"></div><b>' + esc(gloves[gi].name) + '</b>' +
        '<span class="r-uncommon">gloves</span></div>';
    }
    html += '</div></div>';

    for (var team = 1; team <= 2; team++) {
      var info = C.TEAM_INFO[team];
      html += '<div class="panel"><h3>' + esc(info.name) + ' character</h3><div class="skin-grid">';
      var chars = CS.Models.characterList(team);
      var selChar = team === 1 ? s.charATT : s.charDEF;
      for (var ci = 0; ci < chars.length; ci++) {
        var ch = Geo.CHARACTERS[chars[ci].id];
        html += '<div class="skin' + (selChar === chars[ci].id ? ' sel' : '') +
          '" data-act="char" data-val="' + chars[ci].id + '" data-team="' + team + '">' +
          '<div class="sw" style="background:linear-gradient(120deg,' + rgbCss(ch.shirt) + ',' + rgbCss(ch.vest) + ')"></div>' +
          '<b>' + esc(chars[ci].name) + '</b><span style="color:' + info.color + '">' + info.short + '</span></div>';
      }
      html += '</div></div>';
    }
    html += '<div class="panel"><p class="muted" style="font-size:13px;line-height:1.7">' +
      'Every finish is unlocked and free. Cosmetics never change damage, recoil, handling or hitboxes — ' +
      'they only change how your gear looks.</p></div>';
    body.innerHTML = html;
  };
  function rgbCss(c) {
    return 'rgb(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ')';
  }

  /* ---------------------------------------------------------------
   * Buy menu
   * ------------------------------------------------------------- */
  UI.prototype.openBuy = function () {
    if (this.buyOpen) return;
    this.buyOpen = true;
    this.n.buymenu.classList.remove('hidden');
    this.renderBuy();
  };
  UI.prototype.closeBuy = function () {
    this.buyOpen = false;
    this.n.buymenu.classList.add('hidden');
  };
  UI.prototype.toggleBuy = function () { this.buyOpen ? this.closeBuy() : this.openBuy(); };

  UI.prototype.renderBuy = function () {
    if (!this.buyOpen) return;
    var g = this.game, p = g.localPlayer;
    if (!p) return;
    this.n.buyMoney.textContent = '$' + p.money;

    var cats = W.BUY_CATEGORIES;
    var ch = '';
    for (var i = 0; i < cats.length; i++) {
      ch += '<div class="bcat' + (this.buyCat === cats[i].key ? ' on' : '') +
        '" data-act="buy-cat" data-val="' + cats[i].key + '">' + cats[i].label +
        '<kbd>' + (i + 1) + '</kbd></div>';
    }
    this.n.buycats.innerHTML = ch;

    var cat = null;
    for (var c = 0; c < cats.length; c++) if (cats[c].key === this.buyCat) cat = cats[c];
    if (!cat) cat = cats[0];

    var ih = '';
    var n = 0;
    for (var k = 0; k < cat.items.length; k++) {
      var w = W.get(cat.items[k]);
      if (!w || w.teams.indexOf(p.team) < 0) continue;
      n++;
      var check = P.canBuy(p, w.id, g.world, g.rules, g.match ? g.match.isBuyTime(p) : true);
      var price = P.priceFor(p, w);
      var owned = (p.primary && p.primary.id === w.id) || (p.secondary && p.secondary.id === w.id) ||
                  (w.gear === 'kit' && p.kit) || (w.gear === 'helmet' && p.helmet) ||
                  (w.gear === 'armor' && p.armor > 0);
      ih += '<div class="bitem' + (check.ok ? '' : ' cant') + (owned ? ' owned' : '') +
        '" data-act="' + (check.ok ? 'buy' : 'none') + '" data-val="' + w.id + '" data-info="' + w.id + '">' +
        '<div class="n">' + esc(w.name) + '</div>' +
        '<div class="c">' + (W.classLabel[w.cls] || w.cls) + '</div>' +
        '<div class="p">$' + price + '</div><kbd>' + n + '</kbd></div>';
    }
    this.n.buyitems.innerHTML = ih || '<div class="dim">Nothing available to your team here.</div>';

    var self = this;
    var items = this.n.buyitems.querySelectorAll('[data-info]');
    for (var q = 0; q < items.length; q++) {
      (function (node) {
        node.addEventListener('mouseenter', function () { self.showBuyInfo(node.getAttribute('data-info')); });
      })(items[q]);
    }
    this.showBuyInfo(this.buyHover || (cat.items[0] || 'kr47'));
    this.updateBuyLoadout();
  };

  UI.prototype.showBuyInfo = function (id) {
    var w = W.get(id);
    if (!w) return;
    this.buyHover = id;
    var body = '<h4>' + esc(w.name) + '</h4><div class="cls">' + (W.classLabel[w.cls] || w.cls) + '</div>';
    body += '<p>' + esc(w.desc || '') + '</p>';
    function bar(label, val, max, display) {
      var pct = M.clamp(val / max, 0, 1) * 100;
      return '<div class="statrow"><span>' + label + '</span><span class="bar"><i style="width:' + pct + '%"></i></span>' +
             '<span class="v">' + display + '</span></div>';
    }
    if (w.cls !== 'gear' && w.cls !== 'grenade') {
      body += bar('Damage', w.dmg * (w.pellets || 1), 200, String(Math.round(w.dmg * (w.pellets || 1))));
      body += bar('Fire rate', w.rpm, 900, w.rpm + '/m');
      body += bar('Armour pen', w.armorPen * 100, 100, Math.round(w.armorPen * 100) + '%');
      body += bar('Wall pen', (w.pen || 0) * 100, 100, Math.round((w.pen || 0) * 100) + '%');
      body += bar('Accuracy', 100 - M.clamp((w.inaccStand || 0.05) * 22, 0, 95), 100,
                  Math.round(100 - M.clamp((w.inaccStand || 0.05) * 22, 0, 95)) + '');
      body += bar('Mobility', (w.speed / 6.5) * 100, 100, Math.round(w.speed * 10) / 10 + ' m/s');
      body += bar('Magazine', w.mag, 100, w.mag + ' / ' + w.reserve);
      body += '<div class="statrow"><span>Kill reward</span><span class="bar"></span><span class="v">$' + (w.killAward || 300) + '</span></div>';
    } else if (w.cls === 'grenade') {
      if (w.dmg) body += bar('Damage', w.dmg, 100, String(w.dmg));
      if (w.radius) body += bar('Radius', w.radius, 20, w.radius + ' m');
      if (w.duration) body += bar('Duration', w.duration, 20, w.duration + ' s');
      body += '<div class="statrow"><span>Carry limit</span><span class="bar"></span><span class="v">' + (w.max || 1) + '</span></div>';
    }
    body += '<div id="buyloadout"></div>';
    this.n.buyinfo.innerHTML = body;
    this.updateBuyLoadout();
  };

  UI.prototype.updateBuyLoadout = function () {
    var lo = el('buyloadout');
    var p = this.game.localPlayer;
    if (!lo || !p) return;
    var nades = p.grenades.map(function (g) {
      return esc(W.get(g.id).name) + (g.count > 1 ? ' x' + g.count : '');
    }).join(', ') || '—';
    lo.innerHTML = '<div class="lo-row"><span>Primary</span><b>' + (p.primary ? esc(W.get(p.primary.id).name) : '—') + '</b></div>' +
      '<div class="lo-row"><span>Secondary</span><b>' + (p.secondary ? esc(W.get(p.secondary.id).name) : '—') + '</b></div>' +
      '<div class="lo-row"><span>Armour</span><b>' + (p.armor > 0 ? (p.helmet ? 'Vest + helmet' : 'Vest') : '—') + '</b></div>' +
      '<div class="lo-row"><span>Grenades</span><b>' + nades + '</b></div>' +
      (p.team === C.TEAM.DEF ? '<div class="lo-row"><span>Defuse kit</span><b>' + (p.kit ? 'Yes' : '—') + '</b></div>' : '');
  };

  UI.prototype.buyByNumber = function (n) {
    var cats = W.BUY_CATEGORIES, p = this.game.localPlayer;
    if (!p) return;
    var cat = null;
    for (var c = 0; c < cats.length; c++) if (cats[c].key === this.buyCat) cat = cats[c];
    if (!cat) return;
    var idx = 0;
    for (var k = 0; k < cat.items.length; k++) {
      var w = W.get(cat.items[k]);
      if (!w || w.teams.indexOf(p.team) < 0) continue;
      idx++;
      if (idx === n) { this.game.buy(w.id); this.renderBuy(); return; }
    }
  };
  UI.prototype.buyCatByNumber = function (n) {
    var cats = W.BUY_CATEGORIES;
    if (cats[n - 1]) { this.buyCat = cats[n - 1].key; this.renderBuy(); }
  };

  /* ---------------------------------------------------------------
   * Scoreboard
   * ------------------------------------------------------------- */
  UI.prototype.toggleScoreboard = function (show) {
    this.scoreOpen = show;
    this.n.scoreboard.classList.toggle('hidden', !show);
    if (show) this.renderScoreboard();
  };

  UI.prototype.renderScoreboard = function () {
    var g = this.game, m = g.match;
    if (!m) return;
    var infoA = C.TEAM_INFO[1], infoD = C.TEAM_INFO[2];
    var html = '<div class="sbhead"><div class="score">' +
      '<span class="a">' + esc(infoA.name) + ' ' + m.score[1] + '</span><span class="dim">:</span>' +
      '<span class="d">' + m.score[2] + ' ' + esc(infoD.name) + '</span></div>' +
      '<div class="meta">' + esc(CS.Maps.get(g.mapId).name) + ' · ' +
      esc((C.MODE_PRESETS[m.rules.mode] || {}).label || '') + '<br>Round ' + m.round +
      (m.overtimeRound ? ' · Overtime ' + m.overtimeRound : '') + '</div></div>';

    for (var t = 1; t <= 2; t++) {
      var info = C.TEAM_INFO[t];
      var list = m.teamPlayers(t).slice().sort(function (a, b) {
        return (b.kills - b.deaths) - (a.kills - a.deaths) || b.kills - a.kills || b.damage - a.damage;
      });
      var money = 0;
      for (var q = 0; q < list.length; q++) money += list[q].money;
      html += '<div class="sbteam ' + (t === 1 ? 'att' : 'def') + '"><div class="tt">' + esc(info.name) +
        ' · ' + list.length + ' players · $' + money + ' team economy</div>' +
        '<table class="sbt"><thead><tr><th>Player</th><th>K</th><th>A</th><th>D</th><th>+/-</th>' +
        '<th>ADR</th><th>HS%</th><th>MVP</th><th>$</th><th>Ping</th></tr></thead><tbody>';
      for (var i = 0; i < list.length; i++) {
        var p = list[i];
        var rounds = Math.max(1, m.round);
        var adr = Math.round(p.damage / rounds);
        var hs = p.kills > 0 ? Math.round(p.headshots / p.kills * 100) : 0;
        html += '<tr class="' + (p === g.localPlayer ? 'me ' : '') + (p.alive ? '' : 'dead') + '">' +
          '<td><span class="pname">' + (p.mvps ? '<span class="mv">★</span>' : '') + esc(p.name) +
          (p.bot ? '<span class="bt">BOT</span>' : '') + '</span></td>' +
          '<td>' + p.kills + '</td><td>' + p.assists + '</td><td>' + p.deaths + '</td>' +
          '<td>' + (p.kills - p.deaths > 0 ? '+' : '') + (p.kills - p.deaths) + '</td>' +
          '<td>' + adr + '</td><td>' + hs + '</td><td>' + p.mvps + '</td>' +
          '<td>$' + p.money + '</td><td>' + (p.bot ? '—' : Math.round(p.ping)) + '</td></tr>';
      }
      html += '</tbody></table></div>';
    }

    if (m.stats.rounds.length) {
      html += '<div class="roundhist">';
      for (var r = 0; r < m.stats.rounds.length; r++) {
        var rr = m.stats.rounds[r];
        html += '<i class="' + (rr.winner === 1 ? 'a' : rr.winner === 2 ? 'd' : '') + '" title="Round ' + rr.round + '"></i>';
      }
      html += '</div>';
    }
    this.n.sbBody.innerHTML = html;
  };

  /* ---------------------------------------------------------------
   * HUD
   * ------------------------------------------------------------- */
  UI.prototype.updateHUD = function (st) {
    var g = this.game, m = g.match, p = g.localPlayer;
    if (!m) return;
    var n = this.n;
    var infoA = C.TEAM_INFO[1], infoD = C.TEAM_INFO[2];

    n.scoreA.textContent = m.score[1];
    n.scoreD.textContent = m.score[2];
    n.nameA.textContent = infoA.short;
    n.nameD.textContent = infoD.short;

    var time = Math.max(0, m.phaseTime);
    n.clock.textContent = M.formatTime(time);
    n.clock.classList.toggle('urgent', time < 11 && m.phase === C.PHASE.LIVE);
    var phaseLabel = {
      warmup: 'Warm up', freeze: 'Buy time', live: 'Live', ended: 'Round over',
      halftime: 'Half time', matchend: 'Match over'
    }[m.phase] || '';
    n.phase.textContent = phaseLabel;

    n.aliveA.innerHTML = this.aliveDots(m, 1, 'att');
    n.aliveD.innerHTML = this.aliveDots(m, 2, 'def');

    // bomb strip
    var bomb = m.bomb;
    if (bomb && bomb.planted && !bomb.defused && !bomb.exploded) {
      n.bombstrip.classList.remove('hidden');
      n.bombstrip.classList.toggle('def', !!bomb.defusing);
      n.bombTime.textContent = time.toFixed(1);
      n.bombLabel.textContent = bomb.defusing ? 'Defusing' : ('Bomb planted · Site ' + bomb.site);
    } else if (bomb && bomb.dropped) {
      n.bombstrip.classList.remove('hidden');
      n.bombstrip.classList.remove('def');
      n.bombTime.textContent = '';
      n.bombLabel.textContent = 'Bomb dropped';
    } else {
      n.bombstrip.classList.add('hidden');
    }

    if (!p) return;

    // vitals
    n.hp.textContent = Math.ceil(p.health);
    n.vitalsHp.classList.toggle('low', p.health <= 35);
    n.hpBar.style.width = M.clamp(p.health / 100, 0, 1) * 100 + '%';
    n.hpBar.classList.toggle('low', p.health <= 35);
    n.armorWrap.classList.toggle('hidden', p.armor <= 0);
    n.armorNum.textContent = Math.ceil(p.armor) + (p.helmet ? '' : '');
    n.kitBadge.classList.toggle('hidden', !p.kit);

    // weapon / ammo
    var w = P.curWeapon(p), slot = P.curSlot(p);
    n.wname.textContent = w.name || '';
    if (slot && slot.mag !== undefined && w.mag > 0) {
      n.ammoCount.innerHTML = slot.mag + ' <small>/ ' + slot.reserve + '</small>';
      n.ammoCount.classList.toggle('empty', slot.mag === 0);
    } else if (slot && slot.count !== undefined) {
      n.ammoCount.innerHTML = String(slot.count);
      n.ammoCount.classList.remove('empty');
    } else {
      n.ammoCount.innerHTML = '<small>—</small>';
      n.ammoCount.classList.remove('empty');
    }

    var nh = '';
    for (var i = 0; i < p.grenades.length; i++) {
      var gw = W.get(p.grenades[i].id);
      var active = p.cur === 'nade:' + p.grenades[i].id;
      nh += '<div class="nade' + (active ? ' on' : '') + '" title="' + esc(gw.name) + '">' +
        esc(gw.name.slice(0, 2).toUpperCase()) +
        (p.grenades[i].count > 1 ? '<i>' + p.grenades[i].count + '</i>' : '') + '</div>';
    }
    if (p.bomb) nh += '<div class="nade on" title="Explosive">C4</div>';
    n.nades.innerHTML = nh;

    // money
    n.money.textContent = '$' + p.money;
    var teamMoney = 0, mates = m.teamPlayers(p.team);
    for (var k = 0; k < mates.length; k++) teamMoney += mates[k].money;
    n.teamecon.textContent = 'Team economy $' + teamMoney;

    // teammates
    var mh = '';
    for (var t = 0; t < mates.length; t++) {
      var mp = mates[t];
      if (mp === p) continue;
      var mw = mp.netWeapon || (P.curSlot(mp) ? P.curWeapon(mp).id : '');
      var mwName = mw && W.get(mw) ? W.get(mw).name : '';
      mh += '<div class="mate' + (mp.alive ? '' : ' dead') + '">' +
        (g.voice && g.voice.speaking(g.peerIdOf(mp)) ? '<span class="vm">●</span>' : '') +
        '<span class="nm">' + esc(mp.name) + '</span>' +
        '<span class="hpb"><i style="width:' + M.clamp(mp.health / 100, 0, 1) * 100 + '%"></i></span>' +
        '<span class="wp">' + esc(mwName.split(' ')[0]) + '</span></div>';
    }
    n.mates.innerHTML = mh;

    // progress ring
    var prog = null;
    if (p.planting > 0) prog = { label: 'Planting', v: p.planting / m.rules.plantTime, cls: '' };
    else if (p.defusing > 0) {
      var need = p.kit ? m.rules.defuseTimeKit : m.rules.defuseTime;
      prog = { label: 'Defusing' + (p.kit ? ' (kit)' : ''), v: p.defusing / need, cls: 'defuse' };
    }
    if (prog) {
      n.progress.classList.remove('hidden');
      n.progress.classList.toggle('defuse', prog.cls === 'defuse');
      n.progressLabel.textContent = prog.label;
      n.progressBar.style.width = M.clamp(prog.v, 0, 1) * 100 + '%';
    } else {
      n.progress.classList.add('hidden');
    }

    // centre hint
    var hint = '';
    if (m.phase === C.PHASE.FREEZE && m.isBuyTime(p)) {
      hint = 'Press <span class="key">' + keyLabel(this.settings.keys.buy) + '</span> to buy';
    } else if (p.bomb && g.world.siteAt(p.pos.x, p.pos.y + 0.1, p.pos.z)) {
      hint = 'Hold <span class="key">' + keyLabel(this.settings.keys.use) + '</span> to plant';
    } else if (m.bomb && m.bomb.planted && p.team === C.TEAM.DEF &&
               M.vdistXZ(p.pos, { x: m.bomb.x, z: m.bomb.z }) < 1.6) {
      hint = 'Hold <span class="key">' + keyLabel(this.settings.keys.use) + '</span> to defuse';
    } else if (g.nearPickup) {
      hint = 'Press <span class="key">' + keyLabel(this.settings.keys.use) + '</span> to pick up ' + esc(g.nearPickup);
    }
    n.centertext.innerHTML = hint;

    // spectator
    var dead = !p.alive;
    n.spectate.classList.toggle('hidden', !dead);
    n.deadinfo.classList.toggle('hidden', !dead);
    if (dead) {
      var tgt = g.spectateTarget;
      n.specWho.textContent = tgt ? ('Spectating ' + tgt.name) : 'Free look';
      n.deadinfo.textContent = m.rules.respawn ? 'Respawning…' : 'You are dead — waiting for the round to end';
    }

    if (this.buyOpen) {
      this.n.buyTime.textContent = m.isBuyTime(p) ? ('Buy time ' + Math.ceil(Math.max(0, m.phase === C.PHASE.FREEZE
        ? m.phaseTime : m.rules.buyTime - (m.rules.roundTime - m.phaseTime))) + 's') : 'Buy time over';
      this.n.buyMoney.textContent = '$' + p.money;
    }
    if (this.scoreOpen) this.renderScoreboard();
  };

  UI.prototype.aliveDots = function (m, team, cls) {
    var list = m.teamPlayers(team);
    var h = '';
    for (var i = 0; i < list.length; i++) {
      h += '<i class="' + (list[i].alive ? 'on ' + cls : '') + '"></i>';
    }
    return h;
  };

  /* ---------------------------------------------------------------
   * Crosshair
   * ------------------------------------------------------------- */
  UI.prototype.drawCrosshair = function (spreadPx) {
    var cv = this.n.xhair, ctx = this.xctx;
    if (!ctx) return;
    var c = this.settings.crosshair;
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    var size = 220;
    if (cv.width !== size * dpr) { cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    var cx = size / 2, cy = size / 2;

    var gap = c.gap;
    if (c.style === 'dynamic' || c.style === 'classic') gap += (spreadPx || 0) * c.dynamicScale;
    var len = c.size, th = Math.max(0.5, c.thickness);

    ctx.globalAlpha = c.alpha;
    function line(x0, y0, x1, y1, color, width) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    var arms = [];
    if (c.style !== 'dot') {
      arms.push([cx - gap - len, cy, cx - gap, cy]);
      arms.push([cx + gap, cy, cx + gap + len, cy]);
      if (!c.tStyle) arms.push([cx, cy - gap - len, cx, cy - gap]);
      arms.push([cx, cy + gap, cx, cy + gap + len]);
    }
    if (c.outline > 0) {
      for (var i = 0; i < arms.length; i++) {
        line(arms[i][0], arms[i][1], arms[i][2], arms[i][3], 'rgba(0,0,0,0.85)', th + c.outline * 2);
      }
      if (c.dot || c.style === 'dot') {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(cx - th / 2 - c.outline, cy - th / 2 - c.outline, th + c.outline * 2, th + c.outline * 2);
      }
    }
    for (var k = 0; k < arms.length; k++) {
      line(arms[k][0], arms[k][1], arms[k][2], arms[k][3], c.color, th);
    }
    if (c.dot || c.style === 'dot') {
      ctx.fillStyle = c.color;
      ctx.fillRect(cx - th / 2, cy - th / 2, th, th);
    }
    ctx.globalAlpha = 1;
  };

  UI.prototype.drawXhairPreview = function () {
    var box = el('xhairPreview');
    if (!box) return;
    var cv = box.querySelector('canvas');
    if (!cv) { cv = mk('canvas'); box.appendChild(cv); }
    var w = box.clientWidth || 400, h = 150;
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    cv.width = w * dpr; cv.height = h * dpr;
    cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    var c = this.settings.crosshair;
    var cx = w / 2, cy = h / 2;
    var gap = c.gap, len = c.size, th = Math.max(0.5, c.thickness);
    ctx.globalAlpha = c.alpha;
    var arms = [];
    if (c.style !== 'dot') {
      arms.push([cx - gap - len, cy, cx - gap, cy]);
      arms.push([cx + gap, cy, cx + gap + len, cy]);
      if (!c.tStyle) arms.push([cx, cy - gap - len, cx, cy - gap]);
      arms.push([cx, cy + gap, cx, cy + gap + len]);
    }
    function stroke(color, width) {
      ctx.strokeStyle = color; ctx.lineWidth = width;
      for (var i = 0; i < arms.length; i++) {
        ctx.beginPath(); ctx.moveTo(arms[i][0], arms[i][1]); ctx.lineTo(arms[i][2], arms[i][3]); ctx.stroke();
      }
    }
    if (c.outline > 0) stroke('rgba(0,0,0,.85)', th + c.outline * 2);
    stroke(c.color, th);
    if (c.dot || c.style === 'dot') {
      if (c.outline > 0) { ctx.fillStyle = 'rgba(0,0,0,.85)'; ctx.fillRect(cx - th / 2 - c.outline, cy - th / 2 - c.outline, th + c.outline * 2, th + c.outline * 2); }
      ctx.fillStyle = c.color; ctx.fillRect(cx - th / 2, cy - th / 2, th, th);
    }
    ctx.globalAlpha = 1;
  };

  /* ---------------------------------------------------------------
   * Radar
   * ------------------------------------------------------------- */
  UI.prototype.prepareRadar = function (map) {
    if (this.radarCache[map.id]) { this.radarBase = this.radarCache[map.id]; return; }
    var S = 512;
    var cv = doc.createElement('canvas');
    cv.width = cv.height = S;
    var ctx = cv.getContext('2d');
    var b = map.bounds;
    var span = Math.max(b.x1 - b.x0, b.z1 - b.z0);
    var s = S / span;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(18,24,32,0.85)';
    ctx.fillRect(0, 0, S, S);
    for (var i = 0; i < map.boxes.length; i++) {
      var box = map.boxes[i];
      if (box.max.y < 0.75) continue;      // floors add nothing to a top-down view
      if (box.min.y > 7) continue;
      var lum = M.clamp(0.32 + box.max.y / 12, 0.3, 0.85);
      ctx.fillStyle = 'rgba(' + Math.round(120 * lum) + ',' + Math.round(134 * lum) + ',' + Math.round(152 * lum) + ',0.95)';
      ctx.fillRect((box.min.x - b.x0) * s, (box.min.z - b.z0) * s,
                   Math.max(1, (box.max.x - box.min.x) * s), Math.max(1, (box.max.z - box.min.z) * s));
    }
    for (var k = 0; k < map.sites.length; k++) {
      var site = map.sites[k];
      ctx.strokeStyle = 'rgba(255,140,60,.9)'; ctx.lineWidth = 2;
      ctx.strokeRect((site.min.x - b.x0) * s, (site.min.z - b.z0) * s,
                     (site.max.x - site.min.x) * s, (site.max.z - site.min.z) * s);
      ctx.fillStyle = 'rgba(255,160,80,.95)';
      ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(site.name, (site.center.x - b.x0) * s, (site.center.z - b.z0) * s + 9);
    }
    this.radarCache[map.id] = { canvas: cv, scale: s, b: b, size: S };
    this.radarBase = this.radarCache[map.id];
  };

  UI.prototype.drawRadar = function (scene) {
    var ctx = this.rctx, base = this.radarBase;
    if (!ctx || !base) return;
    var g = this.game;
    var view = g.spectateTarget || g.localPlayer;
    if (!view) return;
    var cv = this.n.radar;
    var dpr = Math.min(root.devicePixelRatio || 1, 2);
    var size = 190;
    if (cv.width !== size * dpr) { cv.width = cv.height = size * dpr; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    // fixed pixels-per-metre so every map reads at the same zoom
    var pxPerM = 3.9 * (this.settings.hud.radarScale || 1);
    var k = pxPerM / base.scale;
    var cx = size / 2, cy = size / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, size / 2 - 1, 0, 6.283); ctx.clip();

    ctx.translate(cx, cy);
    ctx.rotate(view.yaw - Math.PI / 2);
    var px = (view.pos.x - base.b.x0) * base.scale;
    var pz = (view.pos.z - base.b.z0) * base.scale;
    ctx.scale(k, k);
    ctx.translate(-px, -pz);
    ctx.drawImage(base.canvas, 0, 0);
    ctx.restore();

    // world position -> radar pixel, rotated so "up" is where you are facing
    function project(x, z) {
      var dx = (x - view.pos.x) * pxPerM, dz = (z - view.pos.z) * pxPerM;
      var a = view.yaw - Math.PI / 2;
      var ca = Math.cos(a), sa = Math.sin(a);
      return [cx + dx * ca - dz * sa, cy + dx * sa + dz * ca];
    }

    var m = g.match;
    if (m) {
      for (var i = 0; i < m.players.length; i++) {
        var p = m.players[i];
        if (!p.alive) continue;
        var mine = p.team === view.team;
        if (!mine && !g.radarSeesEnemy(p)) continue;
        var pt = project(p.pos.x, p.pos.z);
        if (pt[0] < -10 || pt[0] > size + 10 || pt[1] < -10 || pt[1] > size + 10) continue;
        var info = C.TEAM_INFO[p.team];
        ctx.save();
        ctx.translate(pt[0], pt[1]);
        ctx.rotate(-(p.yaw - view.yaw));
        ctx.fillStyle = p === view ? '#ffffff' : info.color;
        ctx.beginPath();
        ctx.moveTo(0, -5); ctx.lineTo(3.6, 4); ctx.lineTo(0, 2); ctx.lineTo(-3.6, 4);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (m.bomb && (m.bomb.planted || m.bomb.dropped)) {
        var bp = project(m.bomb.x, m.bomb.z);
        ctx.fillStyle = m.bomb.planted ? '#ff4438' : '#ffb020';
        ctx.beginPath(); ctx.arc(bp[0], bp[1], 4, 0, 6.283); ctx.fill();
      }
      for (var s2 = 0; s2 < m.nades.smokes.length; s2++) {
        var sm = m.nades.smokes[s2];
        var sp = project(sm.pos.x, sm.pos.z);
        ctx.fillStyle = 'rgba(210,215,220,' + (0.28 * sm.opacity) + ')';
        ctx.beginPath(); ctx.arc(sp[0], sp[1], sm.radius * pxPerM, 0, 6.283);
        ctx.fill();
      }
      for (var f2 = 0; f2 < m.nades.fires.length; f2++) {
        var fi = m.nades.fires[f2];
        var fp = project(fi.pos.x, fi.pos.z);
        ctx.fillStyle = 'rgba(255,120,40,' + (0.4 * fi.grow) + ')';
        ctx.beginPath(); ctx.arc(fp[0], fp[1], 3, 0, 6.283); ctx.fill();
      }
    }

    this.n.callout.textContent = g.world ? g.world.calloutAt(view.pos.x, view.pos.z) : '';
  };

  /* ---------------------------------------------------------------
   * Feeds, banners, toasts
   * ------------------------------------------------------------- */
  UI.prototype.addKill = function (entry) {
    if (!this.settings.hud.killfeed) return;
    var node = mk('div', 'kf' + (entry.mine ? ' mine' : ''));
    var aCls = entry.aTeam === 1 ? 'a' : 'd';
    var vCls = entry.vTeam === 1 ? 'a' : 'd';
    var icons = (entry.pen ? '<span class="icon" title="through a wall">▤</span>' : '') +
                (entry.thruSmoke ? '<span class="icon" title="through smoke">☁</span>' : '') +
                (entry.noscope ? '<span class="icon" title="no scope">◎</span>' : '') +
                (entry.hs ? '<span class="icon" title="headshot">✜</span>' : '');
    node.innerHTML = (entry.assist ? '<span class="' + aCls + '">' + esc(entry.assist) + '</span><span class="w">+</span>' : '') +
      '<span class="' + aCls + '">' + esc(entry.attacker) + '</span>' +
      '<span class="w">' + esc(entry.weapon) + '</span>' + icons +
      '<span class="' + vCls + '">' + esc(entry.victim) + '</span>';
    this.n.killfeed.appendChild(node);
    var self = this;
    this.killfeedItems.push(node);
    while (this.killfeedItems.length > 6) {
      var old = this.killfeedItems.shift();
      if (old.parentNode) old.parentNode.removeChild(old);
    }
    setTimeout(function () {
      node.classList.add('fade');
      setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
        var idx = self.killfeedItems.indexOf(node);
        if (idx >= 0) self.killfeedItems.splice(idx, 1);
      }, 450);
    }, 7000);
  };

  UI.prototype.chatLineHTML = function (c) {
    if (c.sys) return '<span class="sys">' + esc(c.text) + '</span>';
    var cls = c.team === 1 ? 'att' : 'def';
    return (c.scope ? '<span class="scope">(' + esc(c.scope) + ') </span>' : '') +
      '<span class="who ' + cls + '">' + esc(c.name) + '</span><span class="dim"> : </span>' + esc(c.text);
  };

  UI.prototype.addChat = function (c) {
    this.chatItems.push(c);
    while (this.chatItems.length > 40) this.chatItems.shift();
    var node = mk('div', 'chatline' + (c.sys ? ' sys' : ''), this.chatLineHTML(c));
    this.n.chatbox.appendChild(node);
    while (this.n.chatbox.children.length > 7) this.n.chatbox.removeChild(this.n.chatbox.firstChild);
    setTimeout(function () {
      node.classList.add('fade');
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 520);
    }, 11000);
    if (this.screen === 'lobby') this.renderLobbyChat();
  };

  UI.prototype.openChat = function (team) {
    this.chatMode = team ? 'team' : 'all';
    this.n.chatinput.className = 'on ' + this.chatMode;
    this.n.chatprefix.textContent = team ? 'Team →' : 'All →';
    this.n.chatfield.value = '';
    this.n.chatfield.focus();
  };
  UI.prototype.closeChat = function () {
    this.chatMode = null;
    this.n.chatinput.className = '';
    this.n.chatfield.blur();
  };
  UI.prototype.sendChat = function () {
    var text = (this.n.chatfield.value || '').trim().slice(0, 140);
    var mode = this.chatMode;
    this.closeChat();
    if (text) this.game.sendChat(text, mode === 'team');
  };

  UI.prototype.banner = function (big, small, mvp, color) {
    var n = this.n;
    n.bannerBig.textContent = big;
    n.bannerBig.style.color = color || '';
    n.bannerSmall.textContent = small || '';
    n.bannerMvp.textContent = mvp || '';
    n.banner.classList.add('show');
    clearTimeout(this._bannerT);
    var self = this;
    this._bannerT = setTimeout(function () { n.banner.classList.remove('show'); }, 4200);
  };
  UI.prototype.hideBanner = function () { this.n.banner.classList.remove('show'); };

  UI.prototype.toast = function (text, kind) {
    var node = mk('div', 'toast' + (kind ? ' ' + kind : ''), esc(text));
    this.n.toasts.appendChild(node);
    setTimeout(function () {
      node.style.transition = 'opacity .3s'; node.style.opacity = '0';
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 320);
    }, 2600);
  };

  UI.prototype.hitmarker = function (kill, headshot) {
    if (!this.settings.hud.hitmarker) return;
    var n = this.n.hitmark;
    n.innerHTML = '<svg width="34" height="34" viewBox="0 0 34 34">' +
      '<g stroke="' + (kill ? '#ff4d4d' : (headshot ? '#ffd23a' : '#ffffff')) + '" stroke-width="2.2" stroke-linecap="round">' +
      '<line x1="6" y1="6" x2="12" y2="12"/><line x1="28" y1="6" x2="22" y2="12"/>' +
      '<line x1="6" y1="28" x2="12" y2="22"/><line x1="28" y1="28" x2="22" y2="22"/></g></svg>';
    n.classList.remove('on');
    void n.offsetWidth;
    n.classList.add('on');
  };

  UI.prototype.damageNumber = function (screenX, screenY, amount, headshot) {
    if (!this.settings.hud.damageNumbers) return;
    var node = mk('div', 'dmgnum', String(Math.round(amount)));
    node.style.left = screenX + 'px';
    node.style.top = screenY + 'px';
    node.style.color = headshot ? '#ffd23a' : '#ffffff';
    this.n.dmgLayer.appendChild(node);
    setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1000);
  };

  UI.prototype.setOverlay = function (which, amount) {
    var node = this.n[which];
    if (node) node.style.opacity = amount;
  };

  UI.prototype.setScope = function (on, level) {
    this.n.scope.style.display = on ? 'block' : 'none';
  };

  UI.prototype.updatePerf = function (fps, ms, drawCalls, net) {
    if (!this.settings.showFps && !this.settings.showNetGraph) {
      this.n.perf.classList.add('hidden');
      return;
    }
    this.n.perf.classList.remove('hidden');
    var cls = fps >= 55 ? '' : (fps >= 32 ? 'mid' : 'bad');
    var html = '';
    if (this.settings.showFps) {
      html += '<b class="' + cls + '">' + Math.round(fps) + ' fps</b> · ' + ms.toFixed(1) + ' ms<br>' +
              '<span>' + drawCalls + ' draws</span>';
    }
    if (this.settings.showNetGraph && net) {
      html += '<br><span>' + Math.round(net.ping) + ' ms · ↓' + Math.round(net.in / 1024) +
              ' ↑' + Math.round(net.out / 1024) + ' KB/s</span>';
    }
    this.n.perf.innerHTML = html;
  };

  UI.prototype.showResults = function (m, localTeam) {
    var body = el('resultsBody');
    if (!body) return;
    var won = m.matchResult && m.matchResult.winner === localTeam;
    var draw = m.matchResult && !m.matchResult.winner;
    var infoA = C.TEAM_INFO[1], infoD = C.TEAM_INFO[2];
    var html = '<div class="hero"><div class="title" style="font-size:min(9vw,60px)">' +
      (draw ? 'Draw' : (won ? 'Victory' : 'Defeat')) + '</div>' +
      '<div class="sub">' + esc(infoA.name) + ' ' + m.score[1] + ' — ' + m.score[2] + ' ' + esc(infoD.name) + '</div></div>';

    var all = m.players.slice().sort(function (a, b) { return b.score - a.score || b.kills - a.kills; });
    html += '<div class="panel"><h3>Final scoreboard</h3><table class="sbt"><thead><tr>' +
      '<th>Player</th><th>Team</th><th>K</th><th>A</th><th>D</th><th>ADR</th><th>HS%</th><th>MVP</th></tr></thead><tbody>';
    for (var i = 0; i < all.length; i++) {
      var p = all[i];
      var adr = Math.round(p.damage / Math.max(1, m.round));
      var hs = p.kills ? Math.round(p.headshots / p.kills * 100) : 0;
      html += '<tr><td>' + esc(p.name) + '</td><td style="color:' + C.TEAM_INFO[p.team].color + '">' +
        C.TEAM_INFO[p.team].short + '</td><td>' + p.kills + '</td><td>' + p.assists + '</td><td>' + p.deaths +
        '</td><td>' + adr + '</td><td>' + hs + '</td><td>' + p.mvps + '</td></tr>';
    }
    html += '</tbody></table></div>';
    body.innerHTML = html;
    this.show('results');
  };

  UI.prototype.showAimStats = function (stats, time) {
    var acc = stats.shots ? Math.round(stats.hits / stats.shots * 100) : 0;
    var kpm = time > 0 ? (stats.kills / (time / 60)).toFixed(1) : '0.0';
    this.banner('Training complete', acc + '% accuracy · ' + stats.kills + ' targets · ' + kpm + ' per minute');
  };

  /* ===============================================================
   * Markup
   * =============================================================== */
  var TEMPLATE = [
    '<div id="hud" class="hidden nopointer">',
    '  <div id="topbar">',
    '    <div class="side att"><div class="sc" id="scoreA">0</div><div class="nm" id="nameA">SYN</div></div>',
    '    <div class="mid"><div class="clock" id="clock">0:00</div><div class="phase" id="phase"></div>',
    '      <div class="alive"><span id="aliveA" style="display:flex;gap:3px"></span>',
    '      <span style="width:8px"></span><span id="aliveD" style="display:flex;gap:3px"></span></div></div>',
    '    <div class="side def"><div class="sc" id="scoreD">0</div><div class="nm" id="nameD">VAN</div></div>',
    '  </div>',
    '  <div id="bombstrip" class="hidden"><span id="bombLabel">Bomb planted</span><span class="t" id="bombTime"></span></div>',
    '  <div id="radar"><canvas id="radarCanvas" width="190" height="190"></canvas><div class="callout" id="calloutText"></div></div>',
    '  <div id="mates"></div>',
    '  <div id="vitals">',
    '    <div class="vital hp" id="vitalsHp"><span class="ico">♥</span><span class="num" id="hpNum">100</span></div>',
    '    <div class="vital ar" id="armorWrap"><span class="ico">🛡</span><span class="num" id="armorNum">0</span>',
    '      <span id="kitbadge" class="hidden">KIT</span></div>',
    '    <div class="bars"><i id="hpBar" style="width:100%"></i></div>',
    '  </div>',
    '  <div id="teamecon"></div>',
    '  <div id="money"><span class="amt" id="moneyAmt">$800</span><span class="delta" id="moneyDelta"></span></div>',
    '  <div id="ammo"><div class="wname" id="wname">Knife</div><div class="count" id="ammoCount">—</div>',
    '    <div class="nades" id="nadeRow"></div></div>',
    '  <div id="killfeed"></div>',
    '  <div id="xhair"><canvas id="xhairCanvas"></canvas></div>',
    '  <div id="hitmark"></div>',
    '  <div id="dmgLayer" style="position:absolute;inset:0"></div>',
    '  <div id="banner"><div class="big" id="bannerBig"></div><div class="small" id="bannerSmall"></div>',
    '    <div class="mvp" id="bannerMvp"></div></div>',
    '  <div id="centertext"></div>',
    '  <div id="progress" class="hidden"><div class="lbl" id="progressLabel"></div>',
    '    <div class="track"><i id="progressBar"></i></div></div>',
    '  <div id="chatbox"></div>',
    '  <div id="spectate" class="hidden"><div class="who" id="specWho"></div>',
    '    <div class="hint">Left click / right click to change camera · Space for free look</div></div>',
    '  <div id="deadinfo" class="hidden"></div>',
    '  <div id="voicehud"><div id="pttstate"></div></div>',
    '  <div id="perf"></div>',
    '</div>',

    '<div id="chatinput"><span class="pfx" id="chatprefix">All →</span><input id="chatfield" type="text" maxlength="140" autocomplete="off"></div>',

    '<div id="flashoverlay"></div><div id="dmgoverlay"></div><div id="lowhp"></div><div id="burnoverlay"></div>',
    '<div id="scopeoverlay"><div class="lens"></div><div class="cross"><i class="h"></i><i class="v"></i></div></div>',

    /* ---------- main menu ---------- */
    '<div id="mainmenu" class="screen hidden">',
    '  <div class="screen-head"><div class="brand"><b>Breachpoint</b><span>tactical 5v5</span></div>',
    '    <div class="row"><div class="field" style="width:210px"><label>Player name</label>',
    '      <input id="nameInput" type="text" maxlength="18"></div>',
    '      <button class="btn ghost" data-act="goto" data-val="cosmetics">Inventory</button>',
    '      <button class="btn ghost" data-act="goto" data-val="settings">Settings</button></div></div>',
    '  <div class="screen-body"><div class="wrap">',
    '    <div class="hero"><div class="title">Breachpoint</div>',
    '      <div class="sub">Plant · Defuse · Out-aim them</div></div>',
    '    <div class="panel"><h3>Choose a mode</h3><div class="modes" id="modeList"></div></div>',
    '    <div class="panel"><h3>Join a friend</h3><div class="row">',
    '      <input id="joinCode" type="text" placeholder="ROOM CODE" maxlength="6" style="max-width:200px;',
    '        font-family:var(--mono);font-size:20px;letter-spacing:.2em;text-align:center">',
    '      <button class="btn primary" data-act="join-go">Join match</button>',
    '      <span class="dim" style="font-size:12.5px">Ask the host for their five-letter code.</span></div></div>',
    '    <div class="panel"><h3>How it plays</h3><div class="grid2" style="font-size:13px;line-height:1.7" class="muted">',
    '      <div><b>Attackers</b> carry the explosive to site A or B, plant it, and hold for forty seconds.<br>',
    '      <b>Defenders</b> stop the plant or defuse — ten seconds by hand, five with a kit.</div>',
    '      <div>Money is earned by winning rounds and getting kills. Standing still and crouching tightens your ',
    '      aim; running and jumping ruins it. Learn one spray pattern and you will win more duels than any setting will give you.</div>',
    '    </div></div>',
    '  </div></div>',
    '</div>',

    /* ---------- play / map select ---------- */
    '<div id="playscreen" class="screen hidden">',
    '  <div class="screen-head"><div class="brand"><b id="playTitle">Competitive</b><span id="playDesc"></span></div>',
    '    <button class="btn ghost" data-act="back" data-val="mainmenu">Back</button></div>',
    '  <div class="screen-body"><div class="wrap">',
    '    <div class="panel"><h3>Select a map</h3><div class="maps" id="mapList"></div></div>',
    '  </div></div>',
    '  <div class="screen-foot">',
    '    <button class="btn" id="soloBtn" data-act="solo">Play offline with bots</button>',
    '    <button class="btn primary" data-act="create">Create online match</button></div>',
    '</div>',

    /* ---------- lobby ---------- */
    '<div id="lobbyscreen" class="screen hidden">',
    '  <div class="screen-head"><div class="brand"><b>Lobby</b><span id="lobbyStatus"></span></div>',
    '    <button class="btn ghost" data-act="leave">Leave</button></div>',
    '  <div class="screen-body"><div class="wrap"><div class="lobby-grid">',
    '    <div>',
    '      <div class="panel"><h3>Teams</h3><div class="teams">',
    '        <div class="team-col att"><div class="th">Syndicate — attackers</div><div id="teamAtt"></div></div>',
    '        <div class="team-col def"><div class="th">Vanguard — defenders</div><div id="teamDef"></div></div>',
    '      </div><div class="row" style="margin-top:14px">',
    '        <button class="btn sm" data-act="switch-team" data-val="1">Join attackers</button>',
    '        <button class="btn sm" data-act="switch-team" data-val="2">Join defenders</button>',
    '        <span style="flex:1"></span>',
    '        <button class="btn sm host-only" data-act="add-bot" data-val="1">+ Bot ATT</button>',
    '        <button class="btn sm host-only" data-act="add-bot" data-val="2">+ Bot DEF</button>',
    '        <button class="btn sm host-only" data-act="kick-bot">− Bot</button>',
    '      </div></div>',
    '      <div class="panel host-only"><h3>Server settings</h3><div id="lobbyRules"></div></div>',
    '    </div>',
    '    <div>',
    '      <div class="panel"><h3>Room code</h3>',
    '        <div class="code-box"><span class="code" id="lobbyCode">—</span>',
    '        <button class="btn sm ghost" data-act="copy-code">Copy</button></div>',
    '        <div class="dim" style="font-size:12px;margin-top:8px;line-height:1.6">',
    '          Share this code. Peer-to-peer connections can be blocked on some school networks — ',
    '          if a friend cannot join, play offline with bots instead.</div></div>',
    '      <div class="panel"><h3>Match</h3>',
    '        <div class="lo-row"><span>Map</span><b id="lobbyMap">—</b></div>',
    '        <div class="lo-row"><span>Mode</span><b id="lobbyMode">—</b></div></div>',
    '      <div class="panel"><h3>Chat</h3><div class="chatlog" id="lobbyChat"></div></div>',
    '    </div>',
    '  </div></div></div>',
    '  <div class="screen-foot">',
    '    <button class="btn" id="readyBtn" data-act="ready">Ready up</button>',
    '    <button class="btn primary hidden" id="startBtn" data-act="start">Start match</button></div>',
    '</div>',

    /* ---------- settings ---------- */
    '<div id="settingsscreen" class="screen hidden">',
    '  <div class="screen-head"><div class="brand"><b>Settings</b><span>everything is saved locally</span></div>',
    '    <div class="row"><button class="btn ghost danger" data-act="reset-settings">Reset all</button>',
    '    <button class="btn" data-act="back" data-val="mainmenu">Done</button></div></div>',
    '  <div class="screen-body"><div class="wrap">',
    '    <div class="tabs" id="settingsTabs"></div><div id="settingsBody"></div></div></div>',
    '</div>',

    /* ---------- cosmetics ---------- */
    '<div id="cosmeticsscreen" class="screen hidden">',
    '  <div class="screen-head"><div class="brand"><b>Inventory</b><span>free, cosmetic only</span></div>',
    '    <button class="btn" data-act="back" data-val="mainmenu">Done</button></div>',
    '  <div class="screen-body"><div class="wrap" id="cosmeticsBody"></div></div>',
    '</div>',

    /* ---------- pause ---------- */
    '<div id="pausemenu" class="screen overlay hidden">',
    '  <div class="screen-body"><div class="wrap">',
    '    <div class="panel"><h3>Paused</h3>',
    '      <button class="btn primary wide" data-act="resume">Return to match</button>',
    '      <div style="height:8px"></div>',
    '      <button class="btn wide" data-act="goto" data-val="settings">Settings</button>',
    '      <div style="height:8px"></div>',
    '      <button class="btn wide ghost danger" data-act="quit">Leave match</button>',
    '    </div></div></div>',
    '</div>',

    /* ---------- results ---------- */
    '<div id="resultsscreen" class="screen hidden">',
    '  <div class="screen-head"><div class="brand"><b>Match over</b><span></span></div></div>',
    '  <div class="screen-body"><div class="wrap" id="resultsBody"></div></div>',
    '  <div class="screen-foot"><button class="btn" data-act="quit">Back to menu</button>',
    '    <button class="btn primary" data-act="again">Play again</button></div>',
    '</div>',

    /* ---------- buy menu ---------- */
    '<div id="buymenu" class="hidden">',
    '  <div class="bhead"><div class="row"><b style="font-size:17px;letter-spacing:.1em">BUY MENU</b>',
    '    <span class="tag" id="buyTime"></span></div>',
    '    <div class="row"><span class="money" id="buyMoney">$0</span>',
    '    <button class="btn sm ghost" data-act="close-buy">Close (B)</button></div></div>',
    '  <div class="bbody"><div id="buycats"></div><div id="buyitems"></div><div id="buyinfo"></div></div>',
    '</div>',

    /* ---------- scoreboard ---------- */
    '<div id="scoreboard" class="hidden"><div class="sb" id="sbBody"></div></div>',

    '<div id="toasts"></div>'
  ].join('\n');

  CS.UI = UI;
})(typeof window !== 'undefined' ? window : globalThis);
