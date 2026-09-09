/* ============================================================
   AMONG US 3D — MENUS, LOBBY & SETTINGS
   ============================================================ */
(function (AU) {
'use strict';

function $(id) { return document.getElementById(id); }
function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) {
  return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

var Menu = {
  screen: 'boot',
  lobby: null,          // { players:[], hostId, isHost, code, bots }
  settingsTab: 'game',
  onLookChanged: null
};

/* ---------------- routing ---------------- */
Menu.go = function (id) {
  document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
  var t = $(id);
  if (t) t.classList.add('active');
  Menu.screen = id;
  if (id === 'menu') { AU.Shop.refreshWallets(); startMenuCrew(); }
  else stopMenuCrew();
  if (id === 'shop') AU.Shop.render();
};
Menu.flash = function (text) {
  var ov = $('overlay-generic');
  ov.innerHTML = '<div class="ov-panel" style="text-align:center">' + esc(text) + '</div>';
  ov.classList.add('on');
  clearTimeout(Menu._flashT);
  Menu._flashT = setTimeout(function () { ov.classList.remove('on'); ov.innerHTML = ''; }, 1400);
};

/* ---------------- menu crewmate ---------------- */
var MC = { r: null, s: null, c: null, raf: 0, models: [] };
function startMenuCrew() {
  var host = $('menu-crew');
  if (!host) return;
  if (!MC.r) {
    try {
      MC.r = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      MC.s = new THREE.Scene();
      MC.c = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
      MC.s.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.0));
      var d = new THREE.DirectionalLight(0xffffff, 0.95); d.position.set(3, 5, 4); MC.s.add(d);
      host.appendChild(MC.r.domElement);
      MC.r.domElement.style.cssText = 'width:100%;height:100%;display:block;';
    } catch (e) { return; }
  }
  MC.models.forEach(function (m) { MC.s.remove(m); });
  MC.models = [];
  var p = AU.Save.p;
  var main = AU.Models.buildCrewmate({ color: p.color, hat: p.equipped.hat, visor: p.equipped.visor,
    skin: p.equipped.skin }, {});
  var pet = AU.Models.buildPet({ color: p.color, pet: p.equipped.pet });
  if (pet) { pet.position.set(-1.05, 0, 0.3); main.add(pet); }
  MC.s.add(main); MC.models.push(main);
  if (!MC.raf) loopMenuCrew();
}
function loopMenuCrew() {
  MC.raf = requestAnimationFrame(loopMenuCrew);
  var host = $('menu-crew');
  if (!host || Menu.screen !== 'menu' || !host.clientWidth) return;
  MC.r.setSize(host.clientWidth, host.clientHeight, false);
  MC.c.aspect = host.clientWidth / host.clientHeight;
  MC.c.updateProjectionMatrix();
  MC.c.position.set(0, 1.05, 6.6);
  MC.c.lookAt(0, 0.85, 0);
  var t = performance.now() / 1000;
  MC.models.forEach(function (m) {
    m.rotation.y = Math.sin(t * 0.4) * 0.5;
    m.position.y = Math.sin(t * 1.6) * 0.04;
  });
  MC.r.render(MC.s, MC.c);
}
function stopMenuCrew() { /* keep the loop cheap; it early-outs when off screen */ }

/* ============================================================
   SETTINGS UI
   ============================================================ */
function defsFor(tab) {
  return tab === 'game' ? AU.SETTING_DEFS : tab === 'roles' ? AU.ROLE_SETTING_DEFS : AU.CLIENT_SETTING_DEFS;
}
function storeFor(tab) {
  var p = AU.Save.p;
  return tab === 'game' ? p.settings : tab === 'roles' ? p.roleSettings : p.client;
}
Menu.renderSettings = function (tab) {
  Menu.settingsTab = tab || Menu.settingsTab;
  document.querySelectorAll('#settings-tabs .tab').forEach(function (t) {
    t.classList.toggle('active', t.dataset.tab === Menu.settingsTab);
  });
  var body = $('settings-body');
  body.innerHTML = '';
  var defs = defsFor(Menu.settingsTab), store = storeFor(Menu.settingsTab);
  var editable = Menu.settingsTab === 'client' || !Menu.lobby || Menu.lobby.isHost;

  defs.forEach(function (d) {
    if (d.group) { body.appendChild(el('div', 'set-group', d.group)); return; }
    var row = el('div', 'set-row');
    var lbl = el('div', 'lbl', esc(d.name.trim()) + (d.sub ? '' : ''));
    if (d.sub) lbl.style.paddingLeft = '18px';
    row.appendChild(lbl);
    var ctl = el('div', 'set-ctl');

    if (d.type === 'bool') {
      var tg = el('button', 'toggle' + (store[d.key] ? ' on' : ''), '<span class="knob"></span>');
      tg.onclick = function () {
        if (!editable) { AU.Audio.play('deny'); return; }
        store[d.key] = !store[d.key];
        tg.classList.toggle('on', store[d.key]);
        AU.Save.save(); AU.Audio.play('click');
        afterChange(d);
      };
      ctl.appendChild(tg);
    } else if (d.type === 'enum') {
      var minus = el('button', 'stepper', '‹');
      var val = el('div', 'val', d.labels[d.values.indexOf(store[d.key])] || store[d.key]);
      var plus = el('button', 'stepper', '›');
      function shift(n) {
        if (!editable) { AU.Audio.play('deny'); return; }
        var i = d.values.indexOf(store[d.key]);
        i = (i + n + d.values.length) % d.values.length;
        store[d.key] = d.values[i];
        val.textContent = d.labels[i];
        AU.Save.save(); AU.Audio.play('click');
        afterChange(d);
      }
      minus.onclick = function () { shift(-1); };
      plus.onclick = function () { shift(1); };
      ctl.appendChild(minus); ctl.appendChild(val); ctl.appendChild(plus);
    } else {
      var m2 = el('button', 'stepper', '−');
      var v2 = el('div', 'val', fmt(store[d.key], d));
      var p2 = el('button', 'stepper', '+');
      function bump(n) {
        if (!editable) { AU.Audio.play('deny'); return; }
        var v = store[d.key] + n * d.step;
        v = Math.max(d.min, Math.min(d.max, Math.round(v * 100) / 100));
        store[d.key] = v;
        v2.textContent = fmt(v, d);
        AU.Save.save(); AU.Audio.play('click');
        afterChange(d);
      }
      m2.onclick = function () { bump(-1); };
      p2.onclick = function () { bump(1); };
      ctl.appendChild(m2); ctl.appendChild(v2); ctl.appendChild(p2);
    }
    row.appendChild(ctl);
    body.appendChild(row);
  });

  if (!editable) {
    var note = el('div', 'hint', 'Only the host can change game settings.');
    body.insertBefore(note, body.firstChild);
  }
};
function fmt(v, d) {
  var s = (d.type === 'float') ? (Math.round(v * 100) / 100).toFixed(2).replace(/\.00$/, '') : String(v);
  return s + (d.unit || '');
}
function afterChange(d) {
  AU.Audio.applyVolumes();
  if (AU.Game && AU.Game.applyClientSettings) AU.Game.applyClientSettings();
  if (Menu.lobby && Menu.lobby.isHost && AU.Net.mode === 'host') Menu.broadcastLobby();
  if (d && d.key === 'map' && Menu.lobby) Menu.renderLobby();
}

/* ============================================================
   LOBBY
   ============================================================ */
Menu.myLook = function () {
  var p = AU.Save.p;
  return { color: p.color, hat: p.equipped.hat, visor: p.equipped.visor,
           skin: p.equipped.skin, pet: p.equipped.pet, nameplate: p.equipped.nameplate };
};

Menu.colorTaken = function (colorId) {
  if (!Menu.lobby) return false;
  return Menu.lobby.players.some(function (p) {
    return p.look.color === colorId && p.id !== Menu.lobby.selfId;
  });
};

Menu.startFreeplay = function () {
  var bots = 9;
  var players = [{ id: 'me', name: AU.Save.p.name, look: Menu.myLook(), isBot: false, isHost: true }];
  var used = [Menu.myLook().color];
  var names = uniqueNames(bots, [AU.Save.p.name]);
  for (var i = 0; i < bots; i++) {
    var c = AU.COLORS.filter(function (x) { return used.indexOf(x.id) < 0; });
    var col = c[Math.floor(Math.random() * c.length)];
    used.push(col.id);
    players.push({ id: 'bot' + i, isBot: true, isHost: false,
      name: names[i], look: randomLook(col.id) });
  }
  Menu.lobby = { players: players, selfId: 'me', isHost: true, code: 'LOCAL', online: false };
  Menu.go('lobby');
  Menu.renderLobby();
};
/* Bot names never collide with each other or with a human player. */
function uniqueNames(count, taken) {
  var pool = AU.BOT_NAMES.map(function (n) { return n.toUpperCase(); })
    .filter(function (n) { return taken.indexOf(n) < 0; });
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  var out = [];
  for (var k = 0; k < count; k++) out.push(pool[k] || ('BOT' + (k + 1)));
  return out;
}
Menu.uniqueNames = uniqueNames;

function randomLook(colorId) {
  function maybe(list, chance) {
    if (Math.random() > chance) return 'none';
    var pool = list.filter(function (i) { return i.id !== 'none'; });
    return pool[Math.floor(Math.random() * pool.length)].id;
  }
  return { color: colorId, hat: maybe(AU.HATS, 0.75), visor: maybe(AU.VISORS, 0.3),
           skin: maybe(AU.SKINS, 0.45), pet: maybe(AU.PETS, 0.25), nameplate: 'none' };
}
Menu.randomLook = randomLook;

Menu.renderLobby = function () {
  var L = Menu.lobby;
  if (!L) return;
  $('lobby-code').textContent = L.code;
  var map = AU.getMap(AU.Save.p.settings.map);
  $('lobby-count').textContent = L.players.length + '/' + (L.max || 15) + ' · ' + map.name +
    ' · ' + AU.Save.p.settings.impostors + ' Impostor' + (AU.Save.p.settings.impostors > 1 ? 's' : '');
  var box = $('lobby-players');
  box.innerHTML = '';
  L.players.forEach(function (p) {
    var d = el('div', 'lp' + (p.isHost ? ' host' : ''));
    var np = AU.cosmetic('nameplate', p.look.nameplate || 'none');
    d.innerHTML = AU.Models.avatarImg(p.look, 118, 128) +
      '<div class="nm" style="' + (np.css !== 'transparent' ? 'background:' + np.css + ';border-radius:6px;padding:1px 4px;' : '') + '">' +
      esc(p.name) + '</div>' +
      '<div class="tag">' + (p.isBot ? 'AI BOT' : (p.id === L.selfId ? 'YOU' : 'PLAYER')) + '</div>';
    box.appendChild(d);
  });
  $('btn-start').disabled = !L.isHost || L.players.length < 4;
  $('btn-start').textContent = L.players.length < 4 ? 'NEED 4+' : 'START';
};

Menu.addChatLine = function (name, text, color) {
  var log = $('lobby-chat-log');
  if (!log) return;
  log.innerHTML += '<div><span class="who" style="color:' + (color || '#cfe0ff') + '">' +
    esc(name) + ':</span> ' + esc(text) + '</div>';
  log.scrollTop = log.scrollHeight;
};

/* ---- host: keep everyone's lobby in sync ---- */
Menu.broadcastLobby = function () {
  if (!Menu.lobby || AU.Net.mode !== 'host') return;
  AU.Net.broadcast({ t: 'lobby', players: Menu.lobby.players, code: Menu.lobby.code,
    settings: AU.Save.p.settings, roleSettings: AU.Save.p.roleSettings });
};

Menu.fillBots = function (target) {
  var L = Menu.lobby;
  if (!L) return;
  var used = L.players.map(function (p) { return p.look.color; });
  var taken = L.players.map(function (p) { return p.name; });
  var names = uniqueNames(Math.max(0, target - L.players.length), taken);
  var i = 0;
  while (L.players.length < target) {
    var avail = AU.COLORS.filter(function (x) { return used.indexOf(x.id) < 0; });
    if (!avail.length) break;
    var col = avail[Math.floor(Math.random() * avail.length)];
    used.push(col.id);
    L.players.push({ id: 'bot' + (i) + '_' + Date.now().toString(36).slice(-3), isBot: true,
      name: names[i++] || ('BOT' + i), look: randomLook(col.id) });
  }
};

/* ============================================================
   ONLINE WIRING
   ============================================================ */
function setupOnline() {
  $('host-name').value = AU.Save.p.name;
  $('join-name').value = AU.Save.p.name;

  $('btn-host').onclick = function () {
    AU.Audio.play('click');
    AU.Save.p.name = ($('host-name').value || 'PLAYER').toUpperCase().slice(0, 10);
    AU.Save.save();
    var max = Math.max(4, Math.min(15, parseInt($('host-max').value, 10) || 10));
    $('btn-host').disabled = true;
    AU.Net.host(AU.Save.p.name, max, function (code) {
      $('host-code').textContent = code;
      $('host-code-box').hidden = false;
      Menu.lobby = {
        players: [{ id: 'host', name: AU.Save.p.name, look: Menu.myLook(), isBot: false,
                    isHost: true, netId: AU.Net.hostKey() }],
        selfId: 'host', isHost: true, code: code, online: true, max: max,
        fillBots: $('host-bots').checked
      };
      AU.Net.requestMic(function () {});
      Menu.go('lobby');
      Menu.renderLobby();
      $('btn-host').disabled = false;
    }, function (err) {
      $('btn-host').disabled = false;
      Menu.flash('Could not open a room (' + err + '). Try Direct Connect.');
    });
  };
  $('btn-copy-code').onclick = function () {
    var c = $('host-code').textContent;
    if (navigator.clipboard) navigator.clipboard.writeText(c);
    Menu.flash('Copied ' + c);
  };
  $('btn-join').onclick = function () {
    AU.Audio.play('click');
    AU.Save.p.name = ($('join-name').value || 'PLAYER').toUpperCase().slice(0, 10);
    AU.Save.save();
    var code = ($('join-code').value || '').toUpperCase().trim();
    if (code.length !== 6) { setJoinStatus('Room codes are 6 characters', 'err'); return; }
    setJoinStatus('Connecting…');
    $('btn-join').disabled = true;
    AU.Net.join(code, AU.Save.p.name, function (myId) {
      $('btn-join').disabled = false;
      setJoinStatus('Connected!', 'ok');
      AU.Net.requestMic(function () {});
      AU.Net.toHost({ t: 'hello', name: AU.Save.p.name, look: Menu.myLook() });
      Menu.lobby = { players: [], selfId: myId, isHost: false, code: code, online: true };
      Menu.go('lobby');
      Menu.renderLobby();
    }, function (err) {
      $('btn-join').disabled = false;
      setJoinStatus('Failed: ' + err, 'err');
    });
  };
  function setJoinStatus(t, k) {
    var e = $('join-status');
    e.textContent = t;
    e.className = 'netstatus' + (k ? ' ' + k : '');
  }

  /* manual, broker-free connect — one offer per guest, so a direct room fills up */
  $('btn-manual-offer').onclick = function () {
    AU.Net.requestMic(function () {
      if (!Menu.lobby || !Menu.lobby.isHost) {
        Menu.lobby = {
          players: [{ id: 'host', name: AU.Save.p.name, look: Menu.myLook(), isBot: false,
                      isHost: true, netId: 'host' }],
          selfId: 'host', isHost: true, code: 'DIRECT', online: true, max: 10, fillBots: true
        };
      }
      AU.Net.manualOffer(function (blob, slot) {
        $('manual-blob').value = blob;
        $('manual-blob').select();
        Menu.flash('Offer for ' + slot.toUpperCase() + ' created — send this blob to that player.' +
          ' Press CREATE OFFER again for the next one.');
      });
    });
  };
  $('btn-manual-answer').onclick = function () {
    var blob = $('manual-blob').value.trim();
    if (!blob) { Menu.flash('Paste the host\'s offer blob first'); return; }
    AU.Net.requestMic(function () {
      AU.Net.manualAnswer(blob, function (ans) {
        if (!ans) { Menu.flash('That offer blob was not valid'); return; }
        $('manual-blob').value = ans;
        $('manual-blob').select();
        Menu.flash('Answer created — send it back to the host');
        Menu.lobby = { players: [], selfId: AU.Net.selfId, isHost: false, code: 'DIRECT', online: true };
      });
    });
  };
  $('btn-manual-accept').onclick = function () {
    AU.Net.manualAccept($('manual-blob').value.trim(), function (okv, slot) {
      if (!okv) { Menu.flash('That answer was not valid'); return; }
      Menu.flash(slot.toUpperCase() + ' connected!');
      $('manual-blob').value = '';
      Menu.go('lobby');
      Menu.renderLobby();
    });
  };
}

/* ============================================================
   HOW TO PLAY
   ============================================================ */
function howToHTML() {
  var rows = '';
  ['crewmate','engineer','scientist','noisemaker','tracker','detective','guardian','judge',
   'impostor','shapeshifter','phantom','viper'].forEach(function (id) {
    var r = AU.ROLES[id];
    rows += '<div class="set-row"><div class="lbl" style="color:' + r.color + '">' + r.name +
      '<small>' + r.desc + '</small></div><div class="set-ctl" style="min-width:110px;color:#7f92b8">' +
      (r.team === 'impostor' ? 'IMPOSTOR' : 'CREWMATE') + '</div></div>';
  });
  return '<h2>HOW TO PLAY</h2>' +
    '<p class="hint">Crewmates finish every task or eject all Impostors. Impostors kill and sabotage ' +
    'until they equal the Crew, or until a sabotage runs out the clock.</p>' +
    '<div class="set-group">CONTROLS</div>' +
    '<div class="hint">' +
    '<b>W A S D</b> move · <b>Mouse</b> look (click the view to capture the pointer) · <b>Shift</b> sprint-ish lean<br>' +
    '<b>E</b> use / do task · <b>Q</b> kill · <b>R</b> report body · <b>F</b> vent · <b>C</b> role ability<br>' +
    '<b>Tab</b> map · <b>M</b> sabotage map · <b>V</b> mic (or push-to-talk) · <b>T</b> chat · <b>Esc</b> menu' +
    '</div>' +
    '<div class="set-group">ROLES</div>' + rows +
    '<div class="set-group">SABOTAGES</div>' +
    '<div class="hint">Reactor / Seismic and Oxygen are timed — fail them and the Crew loses. ' +
    'Lights shrink Crewmate vision, Comms hides the task list and Admin, and Doors lock a room shut. ' +
    'On The Airship, Avert Crash Course needs two people entering codes at opposite ends. ' +
    'On The Fungle, Mushroom Mixup scrambles everyone\'s appearance.</div>' +
    '<div class="set-group">MULTIPLAYER</div>' +
    '<div class="hint">Online play is peer-to-peer: one player hosts, everyone else joins with the ' +
    'six-character room code. There is no game server. Voice chat is proximity-based by default — you hear ' +
    'people near you, ghosts hear ghosts, and everyone hears everyone in meetings. Empty slots can be ' +
    'filled with AI bots.</div>';
}

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  AU.Save.load();
  AU.Audio.applyVolumes();
  var steps = ['Loading cosmetics…', 'Building crewmates…', 'Charting maps…', 'Calibrating tasks…', 'Ready'];
  var i = 0;
  var iv = setInterval(function () {
    $('boot-fill').style.width = ((i + 1) / steps.length * 100) + '%';
    $('boot-msg').textContent = steps[i];
    i++;
    if (i >= steps.length) {
      clearInterval(iv);
      setTimeout(function () { Menu.go('menu'); }, 320);
    }
  }, 260);
}

function wire() {
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () {
      AU.Audio.resume();
      AU.Audio.play('click');
      var t = b.dataset.go;
      if (t === 'local') { Menu.startFreeplay(); return; }
      if (t === 'customize') { AU.Shop.openCustomize(); return; }
      if (t === 'settings') { Menu.lobby = Menu.lobby && Menu.lobby.online ? Menu.lobby : null;
        $('settings-title').textContent = 'SETTINGS'; Menu.renderSettings('client'); Menu.go('settings'); return; }
      if (t === 'howto') { $('howto-body').innerHTML = howToHTML(); Menu.go('howto'); return; }
      Menu.go(t);
    });
    b.addEventListener('mouseenter', function () { AU.Audio.play('hover'); });
  });

  document.querySelectorAll('#settings-tabs .tab').forEach(function (t) {
    t.onclick = function () { AU.Audio.play('click'); Menu.renderSettings(t.dataset.tab); };
  });
  $('btn-settings-back').onclick = function () {
    AU.Audio.play('back');
    Menu.go(Menu.lobby ? 'lobby' : 'menu');
    if (Menu.lobby) Menu.renderLobby();
  };
  document.querySelectorAll('#cz-tabs .tab').forEach(function (t) {
    t.onclick = function () { AU.Audio.play('click'); AU.Shop.renderCz(t.dataset.cz); };
  });
  $('btn-cz-back').onclick = function () {
    AU.Audio.play('back');
    if (Menu.lobby) { Menu.go('lobby'); Menu.renderLobby(); if (Menu.onLookChanged) Menu.onLookChanged(); }
    else Menu.go('menu');
  };
  document.querySelectorAll('#shop-tabs .tab').forEach(function (t) {
    t.onclick = function () { AU.Audio.play('click'); AU.Shop.render(t.dataset.shop); };
  });
  $('btn-shop-back').onclick = function () { AU.Audio.play('back'); Menu.go('menu'); };
  $('btn-cube-back').onclick = function () { AU.Audio.play('back'); Menu.go('shop'); AU.Shop.render('cosmicubes'); };

  $('btn-lobby-customize').onclick = function () { AU.Audio.play('click'); AU.Shop.openCustomize(); };
  $('btn-lobby-settings').onclick = function () {
    AU.Audio.play('click');
    $('settings-title').textContent = 'GAME SETTINGS';
    Menu.renderSettings('game');
    Menu.go('settings');
  };
  $('btn-leave-lobby').onclick = function () {
    AU.Audio.play('back');
    AU.Net.leave();
    Menu.lobby = null;
    Menu.go('menu');
  };
  $('btn-start').onclick = function () {
    if (!Menu.lobby || !Menu.lobby.isHost) return;
    AU.Audio.play('click');
    if (Menu.lobby.online && Menu.lobby.fillBots) Menu.fillBots(Math.max(6, Menu.lobby.players.length));
    AU.Game.start(Menu.lobby);
  };
  $('lobby-chat-send').onclick = sendLobbyChat;
  $('lobby-chat-input').onkeydown = function (e) {
    e.stopPropagation();
    if (e.key === 'Enter') sendLobbyChat();
  };
  function sendLobbyChat() {
    var inp = $('lobby-chat-input');
    var v = inp.value.trim();
    if (!v) return;
    inp.value = '';
    var c = '#' + AU.colorById(AU.Save.p.color).hex.toString(16).padStart(6, '0');
    Menu.addChatLine(AU.Save.p.name, v, c);
    if (AU.Net.mode === 'host') AU.Net.broadcast({ t: 'lobbychat', name: AU.Save.p.name, text: v, color: c });
    else if (AU.Net.mode === 'client') AU.Net.toHost({ t: 'lobbychat', name: AU.Save.p.name, text: v, color: c });
  }

  Menu.onLookChanged = function () {
    if (!Menu.lobby) return;
    var me = Menu.lobby.players.filter(function (p) { return p.id === Menu.lobby.selfId; })[0];
    if (me) { me.look = Menu.myLook(); me.name = AU.Save.p.name; }
    if (AU.Net.mode === 'host') Menu.broadcastLobby();
    else if (AU.Net.mode === 'client') AU.Net.toHost({ t: 'look', look: Menu.myLook(), name: AU.Save.p.name });
    Menu.renderLobby();
  };

  setupOnline();
  AU.Net.setStatusCb(function (m, k) {
    var e = $('join-status');
    if (e) { e.textContent = m; e.className = 'netstatus' + (k ? ' ' + k : ''); }
  });

  window.addEventListener('pointerdown', function () { AU.Audio.resume(); }, { once: true });
}

Menu.boot = function () { wire(); boot(); };
AU.Menu = Menu;

})(window.AU);
