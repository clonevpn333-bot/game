// ============================================================ MENUS
var Menu = { el: {}, state: 'main' };

function $(id) { return document.getElementById(id); }

Menu.init = function () {
  var e = Menu.el = {
    menu: $('menu'), main: $('menu-main'), net: $('menu-net'), state: $('net-state'),
    code: $('net-code'), roster: $('net-roster'), start: $('btn-start'),
    name: $('in-name'), joinCode: $('in-code'),
  };

  try {
    var saved = localStorage.getItem('crux.name');
    if (saved) e.name.value = saved;
    var s = localStorage.getItem('crux.sens'); if (s) $('in-sens').value = s;
    var f = localStorage.getItem('crux.fov'); if (f) $('in-fov').value = f;
    var iv = localStorage.getItem('crux.inv'); if (iv === '1') $('in-inv').checked = true;
    var dt = localStorage.getItem('crux.detail'); if (dt !== null) $('in-detail').value = dt;
  } catch (err) { }

  function readOpts() {
    IN.sens = parseFloat($('in-sens').value) / 10000;
    IN.invert = $('in-inv').checked;
    CAM.fovBase = parseFloat($('in-fov').value);
    $('sens-v').textContent = (parseFloat($('in-sens').value) / 10).toFixed(1);
    $('fov-v').textContent = $('in-fov').value;
    try {
      localStorage.setItem('crux.sens', $('in-sens').value);
      localStorage.setItem('crux.fov', $('in-fov').value);
      localStorage.setItem('crux.inv', $('in-inv').checked ? '1' : '0');
      localStorage.setItem('crux.detail', $('in-detail').value);
    } catch (err) { }
  }
  var bindBtn = $('btn-grab');
  function showBind() {
    bindBtn.textContent = IN.keyLabel(IN.grabKey);
    $('k-grab').textContent = IN.keyLabel(IN.grabKey);
  }
  showBind();
  bindBtn.addEventListener('click', function () {
    bindBtn.classList.add('arm');
    bindBtn.textContent = 'press a key';
    IN.capture = function (code) {
      IN.setGrabKey(code);
      bindBtn.classList.remove('arm');
      showBind();
    };
  });

  ['in-sens', 'in-fov', 'in-inv', 'in-detail'].forEach(function (id) {
    $(id).addEventListener('input', readOpts);
    $(id).addEventListener('change', readOpts);
  });
  readOpts();

  e.name.addEventListener('change', function () {
    try { localStorage.setItem('crux.name', e.name.value); } catch (err) { }
  });
  e.joinCode.addEventListener('input', function () {
    e.joinCode.value = e.joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  });
  e.joinCode.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') Menu.join(); });

  $('btn-solo').addEventListener('click', Menu.solo);
  $('btn-host').addEventListener('click', Menu.host);
  $('btn-join').addEventListener('click', Menu.join);
  $('btn-start').addEventListener('click', Menu.start);
  $('btn-back').addEventListener('click', function () { Net.reset(); Menu.reset(); });
  $('btn-resume').addEventListener('click', function () { IN.lock(); });
  $('btn-quit').addEventListener('click', function () { Game.quit(); });
  $('btn-again').addEventListener('click', function () { Game.quit(); });

  Net.onRoster = Menu.drawRoster;
  Net.onStart = Menu.onGo;
};

Menu.name = function () { return (Menu.el.name.value || 'climber').slice(0, 12) || 'climber'; };
Menu.detail = function () { return $('in-detail').value === '1' ? 1 : 0; };

Menu.reset = function () {
  Menu.state = 'main';
  Menu.el.main.classList.remove('hidden');
  Menu.el.net.classList.add('hidden');
  Menu.el.code.classList.add('hidden');
  Menu.el.start.classList.add('hidden');
  Menu.el.state.classList.remove('err');
  Menu.el.state.textContent = '';
};

Menu.toNet = function (msg) {
  Menu.state = 'net';
  Menu.el.main.classList.add('hidden');
  Menu.el.net.classList.remove('hidden');
  Menu.el.state.textContent = msg;
  Menu.el.state.classList.remove('err');
  Menu.el.roster.innerHTML = '';
};

Menu.err = function (msg) {
  Menu.el.state.textContent = msg;
  Menu.el.state.classList.add('err');
  Menu.el.code.classList.add('hidden');
  Menu.el.start.classList.add('hidden');
};

Menu.solo = function () {
  P.name = Menu.name();
  P.slot = 0; P.id = 'solo';
  Net.reset(); Net.solo = true; Net.code = '';
  Game.runT = 0;
  // the island is the same for everyone today; the loot is not
  Game.buildWorld(dailySeed(), (Math.random() * 4294967295) >>> 0, Menu.detail(), function () { Game.begin(0); });
};

Menu.host = function () {
  P.name = Menu.name();
  Menu.toNet('opening a room…');
  Net.host(P.name, function (err, code) {
    if (err) { Menu.err(err); return; }
    Menu.el.state.textContent = 'room open — carving the mountain…';
    Menu.el.code.classList.remove('hidden');
    Menu.el.code.querySelector('b').textContent = code;
    Game.runT = 0;
    Game.buildWorld(Net.seed, Net.loot, Menu.detail(), function () {
      Menu.el.state.textContent = 'waiting for friends — you can start whenever';
      Menu.el.start.classList.remove('hidden');
      Menu.drawRoster();
    });
  });
};

Menu.join = function () {
  var code = Menu.el.joinCode.value.toUpperCase();
  if (code.length < 4) { Menu.el.joinCode.focus(); return; }
  P.name = Menu.name();
  Menu.toNet('dialling ' + code + '…');
  Net.join(code, P.name, function (err) {
    if (err) { Menu.err(err); return; }
    Menu.el.state.textContent = 'connected — carving the mountain…';
  });
};

Menu.onGo = function (m) {
  // host said go, or our welcome arrived
  if (Net.isHost) return;
  if (!Game.built) {
    Game.buildWorld(Net.seed, Net.loot, Menu.detail(), function () {
      Net.applySnapshot(Net.pendingSnap);
      Menu.drawRoster();
      if (m && m.started) Game.begin(Net.spawnCamp || 0);
      else Menu.el.state.textContent = 'in the room — waiting for the host to start';
    });
  } else {
    Game.begin(Net.spawnCamp || 0);
  }
};

Menu.start = function () {
  Net.started = true;
  Net.broadcast({ t: 'go', started: 1 });
  Game.begin(0);
};

Menu.drawRoster = function () {
  var box = Menu.el.roster;
  if (!box) return;
  box.innerHTML = '';
  var ids = Object.keys(Net.roster);
  if (!ids.length && Net.solo) return;
  for (var i = 0; i < ids.length; i++) {
    var r = Net.roster[ids[i]];
    var d = document.createElement('div');
    d.className = 'rost';
    d.innerHTML = '<i style="background:' + SLOT_HEX[r.slot % 4] + '"></i><span>' + r.name + '</span>' +
      '<small>' + (ids[i] === Net.selfId ? 'you' : SLOT_NAME[r.slot % 4]) + '</small>';
    box.appendChild(d);
  }
};
