// ============================================================ MENUS
var Menu = { el: {}, state: 'main' };

function $(id) { return document.getElementById(id); }

Menu.init = function () {
  var e = Menu.el = {
    menu: $('menu'), main: $('menu-main'), net: $('menu-net'), state: $('net-state'),
    code: $('net-code'), roster: $('net-roster'), start: $('btn-start'),
    name: $('in-name'), joinCode: $('in-code'),
  };

  // One options panel, borrowed by whichever screen is up.
  var opts = $('opts');
  $('opts-host').appendChild(opts);
  Menu.optsToMenu = function () { $('opts-host').appendChild(opts); opts.open = false; };
  Menu.optsToPause = function () { $('pause-opts').appendChild(opts); opts.open = false; };

  var SET = [
    ['sens', 'in-sens'], ['sensy', 'in-sensy'], ['fov', 'in-fov'], ['cfov', 'in-cfov'],
    ['invx', 'in-invx'], ['invy', 'in-invy'], ['bob', 'in-bob'], ['photo', 'in-photo'],
    ['detail', 'in-detail'],
  ];
  try {
    var saved = localStorage.getItem('crux.name');
    if (saved) e.name.value = saved;
    SET.forEach(function (row) {
      var v = localStorage.getItem('crux.' + row[0]);
      if (v === null) return;
      var el = $(row[1]);
      if (el.type === 'checkbox') el.checked = v === '1'; else el.value = v;
    });
  } catch (err) { }

  function readOpts() {
    // Sensitivity is radians of turn per pixel of mouse travel.  The base is
    // deliberately low so one trackpad flick is not a full spin; the slider
    // scales it, and the vertical gets its own multiplier on top.
    var sx = parseFloat($('in-sens').value) / 100;
    var sy = parseFloat($('in-sensy').value) / 100;
    IN.sensX = 0.0022 * sx;
    IN.sensY = 0.0022 * sx * sy;
    IN.invX = $('in-invx').checked;
    IN.invY = $('in-invy').checked;
    CAM.fovBase = parseFloat($('in-fov').value);
    CAM.fovClimb = parseFloat($('in-cfov').value);
    CAM.bobAmt = $('in-bob').checked ? 0 : 1;
    CAM.shakeScale = $('in-photo').checked ? 0.15 : 1;
    $('sens-v').textContent = sx.toFixed(2);
    $('sensy-v').textContent = sy.toFixed(2);
    $('fov-v').textContent = $('in-fov').value;
    $('cfov-v').textContent = $('in-cfov').value;
    try {
      SET.forEach(function (row) {
        var el = $(row[1]);
        localStorage.setItem('crux.' + row[0], el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value);
      });
    } catch (err) { }
  }
  Menu.readOpts = readOpts;

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

  SET.forEach(function (row) {
    $(row[1]).addEventListener('input', readOpts);
    $(row[1]).addEventListener('change', readOpts);
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
