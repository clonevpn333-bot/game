/* ============================================================
   AMONG US 3D — HUD & MAP SCREENS
   Task list, task bar, ability buttons, the map overlay and its
   Admin / Cameras / Vitals / Door Log / Sabotage modes.
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
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

var HUD = {
  G: null,
  mapOpen: false,
  mapMode: 'normal',
  toastTimer: 0
};

HUD.init = function (G) {
  HUD.G = G;
  $('hud').classList.add('on');
  $('btn-map').onclick = function () { HUD.toggleMap('normal'); };
  $('btn-menu-ig').onclick = function () { G.togglePause(); };
  $('btn-mic').onclick = function () { G.toggleMic(); };
  $('btn-kill').onclick = function () { G.tryKill(); };
  $('btn-use').onclick = function () { G.tryUse(); };
  $('btn-report').onclick = function () { G.tryReport(); };
  $('btn-vent').onclick = function () { G.tryVent(); };
  $('btn-sabotage').onclick = function () { HUD.toggleMap('sabotage'); };
  $('btn-ability').onclick = function () { G.tryAbility(); };
  HUD.miniZoom = HUD.miniZoom || 'fit';
  $('minimap-zoom').onclick = function () {
    HUD.miniZoom = HUD.miniZoom === 'fit' ? 'near' : 'fit';
    AU.Audio.play('click');
  };
  $('minimap').classList.add('on');
  $('role-badge').classList.add('on');
  HUD.renderRoleBadge();

  var gi = $('ghost-chat-input');
  gi.onkeydown = function (e) {
    e.stopPropagation();
    if (e.key === 'Enter' && gi.value.trim()) { G.sendGhostChat(gi.value.trim()); gi.value = ''; }
  };
};

HUD.hide = function () {
  $('hud').classList.remove('on');
  $('minimap').classList.remove('on');
  $('role-badge').classList.remove('on');
  HUD.closeMap();
};

/* ---- the badge that always says what you are ---- */
var ROLE_ICON = {
  crewmate: '🧑‍🚀', engineer: '🔧', scientist: '🔬', noisemaker: '🔔', tracker: '📍',
  detective: '🔎', guardian: '👼', judge: '⚖️', impostor: '🔪', shapeshifter: '🎭',
  phantom: '👻', viper: '🧪'
};
HUD.renderRoleBadge = function () {
  var G = HUD.G, me = G && G.me();
  if (!me) return;
  var roleId = (!me.alive && me.ghostRole) ? me.ghostRole : me.role;
  var d = AU.Roles.def(roleId);
  var isImp = d.team === 'impostor';
  var sub = isImp ? 'IMPOSTOR' : 'CREWMATE';
  if (!me.alive) sub = 'GHOST · ' + sub;
  var badge = $('role-badge');
  badge.innerHTML =
    '<div class="rb-dot" style="background:' + (isImp ? '#5c1414' : '#123a52') + '">' +
      (ROLE_ICON[roleId] || '🧑‍🚀') + '</div>' +
    '<div class="rb-txt" style="color:' + d.color + '">' + d.name.toUpperCase() +
      '<div class="rb-sub">' + sub + '</div></div>';
  badge.style.borderColor = isImp ? '#7a2020' : '#2b3a5c';
};

/* ============================================================
   PER-FRAME
   ============================================================ */
HUD.update = function (dt) {
  var G = HUD.G, me = G.me();
  if (!me) return;

  /* task list */
  var tl = $('task-list'), html = '';
  if (me.team === 'impostor') {
    html += '<div class="th">FAKE TASKS</div>';
  } else {
    html += '<div class="th">TASKS</div>';
  }
  me.tasks.forEach(function (t) {
    var done = t.progress >= t.steps.length;
    var step = done ? null : t.steps[t.progress];
    var near = step && G.nearConsole && G.nearConsole.key === step.key;
    var roomName = step ? (AU.roomOf(G.map, step.room) || {}).name : '';
    html += '<div class="ti' + (done ? ' done' : (near ? ' near' : '')) + '">' +
      esc(roomName ? roomName + ': ' : '') + esc(t.name) +
      (t.steps.length > 1 ? ' (' + Math.min(t.progress + 1, t.steps.length) + '/' + t.steps.length + ')' : '') +
      '</div>';
  });
  if (G.sabotage) {
    html += '<div class="th" style="color:#ff6b6b;margin-top:6px">SABOTAGE</div>' +
      '<div class="ti" style="color:#ff9d9d">' + esc(G.sabotage.def.name) + '</div>';
  }
  tl.innerHTML = html;

  /* task bar */
  $('taskbar-fill').style.width = (G.taskBarValue() * 100) + '%';

  /* buttons */
  var canKill = AU.Roles.canKill(me) && !me.venting;
  $('btn-kill').classList.toggle('on', canKill);
  $('btn-kill').disabled = !(canKill && me.killCd <= 0 && G.killTarget);
  $('kill-cd').textContent = me.killCd > 0 ? Math.ceil(me.killCd) : '';

  var use = G.useTarget;
  $('btn-use').classList.toggle('on', me.alive || me.ghostRole === 'guardian');
  $('btn-use').disabled = !use;

  $('btn-report').classList.toggle('on', me.alive);
  $('btn-report').disabled = !G.reportTarget;

  $('btn-sabotage').classList.toggle('on', AU.Roles.canSabotage(me));
  $('btn-sabotage').disabled = !!G.sabotage || G.sabotageCd > 0;

  var canVent = AU.Roles.canVent(me);
  $('btn-vent').classList.toggle('on', canVent);
  $('btn-vent').disabled = !(G.ventTarget || me.venting) ||
    (me.role === 'engineer' && me.abilityCd > 0 && !me.venting);

  var ab = AU.Roles.abilityOf(me);
  $('btn-ability').classList.toggle('on', !!ab && ab !== 'Vent');
  if (ab && ab !== 'Vent') {
    $('btn-ability').querySelector('span').textContent = ab.toUpperCase();
    $('btn-ability').disabled = me.abilityCd > 0 || (me.role === 'shapeshifter' && !G.shiftTarget && !me.shifted);
    $('ability-cd').textContent = me.abilityCd > 0 ? Math.ceil(me.abilityCd) : '';
  }

  /* mic button */
  $('btn-mic').classList.toggle('off', !AU.Net.micEnabled);

  /* the role badge only changes on death / promotion */
  var badgeKey = me.role + '|' + (me.ghostRole || '') + '|' + (me.alive ? 1 : 0);
  if (HUD.badgeKey !== badgeKey) { HUD.badgeKey = badgeKey; HUD.renderRoleBadge(); }

  /* ghost chat visibility */
  $('ghost-chat').classList.toggle('on', !me.alive && !AU.Meeting.open);

  /* proximity / voice list */
  var pl = $('proximity-list'), ph = '';
  G.players.forEach(function (p) {
    if (p === me || !p.netId) return;
    var speaking = AU.Net.peerSpeaking(p.netId);
    var d = Math.hypot(p.x - me.x, p.z - me.z);
    if (!speaking && d > 12) return;
    ph += '<div class="vchip' + (speaking ? ' speaking' : '') + '"><span class="dot"></span>' + esc(p.name) + '</div>';
  });
  pl.innerHTML = ph;

  /* vent arrows */
  if (me.venting) {
    var v = G.world.ventById(me.ventId);
    var box = $('vent-arrows');
    if (box.dataset.vent !== me.ventId) {
      box.dataset.vent = me.ventId;
      box.innerHTML = '';
      (v ? v.links : []).forEach(function (lid, i) {
        var target = G.world.ventById(lid);
        if (!target) return;
        var a = el('div', 'vent-arrow', '➤');
        var ang = Math.atan2(target.x - v.x, target.z - v.z);
        var sx = window.innerWidth / 2 + Math.sin(ang - G.yaw) * 190;
        var sy = window.innerHeight / 2 - Math.cos(ang - G.yaw) * 120;
        a.style.left = (sx - 28) + 'px';
        a.style.top = (sy - 28) + 'px';
        a.style.transform = 'rotate(' + (ang - G.yaw) + 'rad)';
        a.onclick = function () { G.moveThroughVent(me, lid); box.dataset.vent = ''; };
        box.appendChild(a);
      });
    }
  } else {
    var b2 = $('vent-arrows');
    if (b2.dataset.vent) { b2.dataset.vent = ''; b2.innerHTML = ''; }
  }

  HUD.drawMinimap();

  if (HUD.mapOpen && (HUD.mapMode === 'normal' || HUD.mapMode === 'admin' ||
      HUD.mapMode === 'sabotage' || HUD.mapMode === 'vitals')) HUD.drawMap();

  /* FPS readout */
  if (AU.Save.p.client.showFps) {
    if (!HUD.fpsEl) {
      HUD.fpsEl = document.createElement('div');
      HUD.fpsEl.style.cssText = 'position:absolute;right:12px;bottom:12px;font-size:12px;' +
        'color:#7dffb0;text-shadow:0 1px 2px #000;pointer-events:none;';
      $('hud').appendChild(HUD.fpsEl);
    }
    HUD.fpsFrames = (HUD.fpsFrames || 0) + 1;
    HUD.fpsAccum = (HUD.fpsAccum || 0) + dt;
    if (HUD.fpsAccum >= 0.5) {
      HUD.fpsEl.textContent = Math.round(HUD.fpsFrames / HUD.fpsAccum) + ' FPS';
      HUD.fpsFrames = 0; HUD.fpsAccum = 0;
    }
  } else if (HUD.fpsEl) { HUD.fpsEl.remove(); HUD.fpsEl = null; }

  if (HUD.toastTimer > 0) {
    HUD.toastTimer -= dt;
    if (HUD.toastTimer <= 0) $('hud-toast').classList.remove('on');
  }
};

/* ============================================================
   ALWAYS-ON MINIMAP
   Fit mode shows the whole deck; near mode zooms to your room.
   ============================================================ */
HUD.drawMinimap = function () {
  var G = HUD.G, me = G && G.me();
  var cv = $('minimap-cv');
  if (!cv || !me || !G.layout) return;
  var g = cv.getContext('2d');
  var grid = G.layout.grid;
  var W = cv.width, H = cv.height;

  /* view window in world units */
  var vx0, vx1, vz0, vz1;
  if (HUD.miniZoom === 'near') {
    var half = 26;
    var aspect = W / H;
    vx0 = me.x - half * aspect / 2; vx1 = me.x + half * aspect / 2;
    vz0 = me.z - half / 2;          vz1 = me.z + half / 2;
  } else {
    vx0 = grid.minX; vx1 = grid.maxX; vz0 = grid.minZ; vz1 = grid.maxZ;
    /* letterbox so the map keeps its proportions */
    var wantAspect = W / H, haveAspect = (vx1 - vx0) / (vz1 - vz0);
    if (haveAspect < wantAspect) {
      var need = (vz1 - vz0) * wantAspect, pad = (need - (vx1 - vx0)) / 2;
      vx0 -= pad; vx1 += pad;
    } else {
      var need2 = (vx1 - vx0) / wantAspect, pad2 = (need2 - (vz1 - vz0)) / 2;
      vz0 -= pad2; vz1 += pad2;
    }
  }
  var sx = W / (vx1 - vx0), sz = H / (vz1 - vz0);
  function px(x) { return (x - vx0) * sx; }
  function pz(z) { return (z - vz0) * sz; }

  g.clearRect(0, 0, W, H);
  g.fillStyle = '#060d1c'; g.fillRect(0, 0, W, H);

  var dark = G.sabotage && G.sabotage.def.id === 'lights' && me.team !== 'impostor' && me.alive;

  G.layout.rects.forEach(function (R) {
    g.fillStyle = R.kind === 'hall' ? '#14263b' : (dark ? '#152436' : '#1c3a57');
    g.fillRect(px(R.x0), pz(R.z0), (R.x1 - R.x0) * sx, (R.z1 - R.z0) * sz);
  });
  g.strokeStyle = '#3a76b0'; g.lineWidth = 1;
  G.layout.rects.forEach(function (R) {
    if (R.kind !== 'room') return;
    g.strokeRect(px(R.x0), pz(R.z0), (R.x1 - R.x0) * sx, (R.z1 - R.z0) * sz);
  });

  if (HUD.miniZoom === 'near') {
    g.fillStyle = '#79b6e8';
    g.font = 'bold 9px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
    G.layout.roomRects.forEach(function (R) {
      if (R.room.x < vx0 - 6 || R.room.x > vx1 + 6) return;
      g.fillText(R.room.name.toUpperCase(), px(R.room.x), pz(R.room.z));
    });
  }

  /* closed doors */
  G.world.doors.forEach(function (D) {
    if (!D.closed) return;
    g.fillStyle = '#ff5252';
    g.fillRect(px(D.x) - 2, pz(D.z) - 2, 4, 4);
  });

  /* your task markers */
  me.tasks.forEach(function (t) {
    if (t.progress >= t.steps.length) return;
    var c = G.world.consoles[t.steps[t.progress].key];
    if (!c) return;
    var bob = 2.2 + Math.sin(performance.now() / 260) * 0.7;
    g.beginPath(); g.arc(px(c.x), pz(c.z), bob + 1.6, 0, 7);
    g.fillStyle = 'rgba(245,200,66,.35)'; g.fill();
    g.beginPath(); g.arc(px(c.x), pz(c.z), bob, 0, 7);
    g.fillStyle = '#F5C842'; g.fill();
  });

  /* sabotage markers */
  if (G.sabotage) {
    (G.sabotage.def.rooms || []).forEach(function (rid) {
      var R = AU.roomOf(G.map, rid);
      if (!R) return;
      var fixed = G.sabotage.fixedRooms && G.sabotage.fixedRooms[rid];
      g.strokeStyle = fixed ? '#50EF39' : (Math.floor(performance.now() / 350) % 2 ? '#ff3b3b' : '#8a1414');
      g.lineWidth = 2;
      g.strokeRect(px(R.x - R.w / 2), pz(R.z - R.d / 2), R.w * sx, R.d * sz);
    });
  }

  /* vents, for those who can use them */
  if (AU.Roles.canVent(me)) {
    g.fillStyle = '#7fd0ff';
    G.world.vents.forEach(function (v) {
      g.beginPath(); g.arc(px(v.x), pz(v.z), 1.9, 0, 7); g.fill();
    });
  }

  /* the tracked player */
  if (me.trackTargetId && me.trackTimer > 0) {
    var tp = G.byId(me.trackTargetId);
    if (tp) {
      g.fillStyle = '#50EF39';
      g.beginPath(); g.arc(px(tp.lastKnownX != null ? tp.lastKnownX : tp.x),
        pz(tp.lastKnownZ != null ? tp.lastKnownZ : tp.z), 3.4, 0, 7); g.fill();
    }
  }

  /* ghosts see the whole crew */
  if (!me.alive) {
    G.players.forEach(function (p) {
      if (p === me || !p.alive) return;
      g.globalAlpha = 0.7;
      g.fillStyle = '#' + AU.colorById(p.look.color).hex.toString(16).padStart(6, '0');
      g.beginPath(); g.arc(px(p.x), pz(p.z), 2.8, 0, 7); g.fill();
      g.globalAlpha = 1;
    });
  }

  /* unreported bodies you have already seen */
  G.bodies.forEach(function (b) {
    if (b.reported || b.dissolved || b.skinOnly) return;
    if (me.alive && Math.hypot(b.x - me.x, b.z - me.z) > 9) return;
    g.fillStyle = '#ff4d4d'; g.font = 'bold 10px Arial'; g.textAlign = 'center';
    g.fillText('✖', px(b.x), pz(b.z) + 3);
  });

  /* you: a dot with a facing wedge */
  var mx = px(me.x), my = pz(me.z);
  var col = '#' + AU.colorById(me.look.color).hex.toString(16).padStart(6, '0');
  g.save();
  g.translate(mx, my);
  g.rotate(-G.yaw);
  g.beginPath();
  g.moveTo(0, -3);
  g.arc(0, 0, 13, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
  g.closePath();
  var wedge = g.createRadialGradient(0, 0, 2, 0, 0, 13);
  wedge.addColorStop(0, 'rgba(255,255,255,.45)');
  wedge.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = wedge; g.fill();
  g.restore();
  g.beginPath(); g.arc(mx, my, 4.6, 0, 7);
  g.fillStyle = col; g.fill();
  g.lineWidth = 1.6; g.strokeStyle = '#fff'; g.stroke();

  /* the room you are standing in */
  var rm = G.layout.roomAt(me.x, me.z);
  $('minimap-room').textContent = rm ? rm.name.toUpperCase() : 'HALLWAY';
};

/* ============================================================
   BANNERS
   ============================================================ */
HUD.showRole = function (player, cb) {
  HUD.renderRoleBadge();
  AU.Intro.show(HUD.G, player, cb);
};

HUD.toast = function (text, dur) {
  var t = $('hud-toast');
  t.innerHTML = text;
  t.classList.add('on');
  HUD.toastTimer = dur || 3;
};
HUD.alert = function (text) {
  var a = $('alert-banner');
  if (!text) { a.classList.remove('on'); return; }
  a.innerHTML = text;
  a.classList.add('on');
};

/* ============================================================
   MAP OVERLAY
   ============================================================ */
HUD.toggleMap = function (mode) {
  if (HUD.mapOpen && HUD.mapMode === mode) { HUD.closeMap(); return; }
  HUD.openMap(mode);
};
HUD.closeMap = function () {
  HUD.mapOpen = false;
  $('overlay-map').classList.remove('on');
  $('overlay-map').innerHTML = '';
};

HUD.openMap = function (mode) {
  var G = HUD.G, me = G.me();
  HUD.mapMode = mode || 'normal';
  HUD.mapOpen = true;
  var ov = $('overlay-map');
  ov.innerHTML = '';
  var panel = el('div', 'ov-panel');
  var tabs = el('div', 'map-tabs');

  function tab(id, label, avail) {
    var b = el('button', 'tab' + (HUD.mapMode === id ? ' active' : ''), label);
    if (!avail) { b.disabled = true; b.style.opacity = .4; }
    else b.onclick = function () { AU.Audio.play('click'); HUD.openMap(id); };
    tabs.appendChild(b);
  }
  var f = G.map.features || {};
  var st = G.world.stations || {};
  tab('normal', 'MAP', true);
  tab('admin', 'ADMIN', !!st.admin && G.nearStation('admin') && !G.commsDown());
  tab('cams', 'CAMERAS', !!st.cams && G.nearStation('cams') && !G.commsDown());
  tab('vitals', 'VITALS', (!!st.vitals && G.nearStation('vitals')) ||
      (me && me.role === 'scientist' && me.scientistBattery > 0));
  tab('doorlog', 'DOOR LOG', !!st.doorlog && G.nearStation('doorlog') && !G.commsDown());
  if (AU.Roles.canSabotage(me)) tab('sabotage', 'SABOTAGE', true);
  panel.appendChild(tabs);

  var wrap = el('div', 'mapwrap');
  panel.appendChild(wrap);

  if (HUD.mapMode === 'cams') buildCams(wrap);
  else if (HUD.mapMode === 'doorlog') buildDoorLog(wrap);
  else {
    var cv = el('canvas'); cv.id = 'map-canvas';
    var g = G.layout.grid;
    var aspect = (g.maxZ - g.minZ) / (g.maxX - g.minX);
    var maxW = Math.min(window.innerWidth * 0.86, 1100);
    var maxH = window.innerHeight * 0.62;
    if (maxW * aspect > maxH) maxW = maxH / aspect;
    cv.width = Math.round(maxW); cv.height = Math.round(maxW * aspect);
    cv.style.width = cv.width + 'px'; cv.style.height = cv.height + 'px';
    wrap.appendChild(cv);
    if (HUD.mapMode === 'sabotage') buildSabotageButtons(wrap, cv);
    if (HUD.mapMode === 'vitals') { wrap.innerHTML = ''; buildVitals(wrap); }
  }

  var legend = el('div', 'map-legend');
  legend.innerHTML = HUD.mapMode === 'admin'
    ? 'Admin table — live crew counts per room'
    : HUD.mapMode === 'sabotage' ? 'Choose a system to sabotage'
    : HUD.mapMode === 'vitals' ? 'Vitals — life signs of every crewmate'
    : 'You are the pulsing marker · yellow consoles are your tasks';
  panel.appendChild(legend);

  var close = el('button', 'au-btn small grey', 'CLOSE');
  close.style.marginTop = '10px';
  close.onclick = function () { AU.Audio.play('back'); HUD.closeMap(); };
  panel.appendChild(close);

  ov.appendChild(panel);
  ov.classList.add('on');
  if (HUD.mapMode !== 'cams' && HUD.mapMode !== 'doorlog' && HUD.mapMode !== 'vitals') HUD.drawMap();
};

HUD.drawMap = function () {
  var cv = document.getElementById('map-canvas');
  if (!cv) return;
  var G = HUD.G, me = G.me(), g = cv.getContext('2d');
  var grid = G.layout.grid;
  var W = cv.width, H = cv.height;
  var sx = W / (grid.maxX - grid.minX), sz = H / (grid.maxZ - grid.minZ);
  function px(x) { return (x - grid.minX) * sx; }
  function pz(z) { return (z - grid.minZ) * sz; }

  g.fillStyle = '#050b18'; g.fillRect(0, 0, W, H);

  /* halls then rooms */
  G.layout.rects.forEach(function (R) {
    g.fillStyle = R.kind === 'hall' ? '#16293f' : '#1d3a57';
    g.fillRect(px(R.x0), pz(R.z0), (R.x1 - R.x0) * sx, (R.z1 - R.z0) * sz);
  });
  G.layout.rects.forEach(function (R) {
    if (R.kind !== 'room') return;
    g.strokeStyle = '#3f7fbf'; g.lineWidth = 2;
    g.strokeRect(px(R.x0), pz(R.z0), (R.x1 - R.x0) * sx, (R.z1 - R.z0) * sz);
    g.fillStyle = '#9fd0ff';
    g.font = 'bold ' + Math.max(9, Math.min(15, W / 78)) + 'px Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(R.room.name.toUpperCase(), px(R.room.x), pz(R.room.z));
  });

  /* vents (impostor + engineer only) */
  if (me && AU.Roles.canVent(me)) {
    G.world.vents.forEach(function (v) {
      g.fillStyle = '#7fd0ff';
      g.beginPath(); g.arc(px(v.x), pz(v.z), 4, 0, 7); g.fill();
    });
  }

  /* task consoles */
  if (me) {
    me.tasks.forEach(function (t) {
      if (t.progress >= t.steps.length) return;
      var step = t.steps[t.progress];
      var c = G.world.consoles[step.key];
      if (!c) return;
      g.fillStyle = '#F5C842';
      g.beginPath(); g.arc(px(c.x), pz(c.z), 6, 0, 7); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke();
    });
  }

  /* admin: crew counts */
  if (HUD.mapMode === 'admin') {
    var counts = {};
    G.players.forEach(function (p) {
      if (!p.alive || p.venting) return;
      var r = G.layout.roomAt(p.x, p.z);
      if (r) counts[r.id] = (counts[r.id] || 0) + 1;
    });
    G.bodies.forEach(function (b) {
      if (b.reported || b.dissolved) return;
      counts[b.room] = (counts[b.room] || 0) + 1;
    });
    for (var rid in counts) {
      var R = AU.roomOf(G.map, rid);
      if (!R) continue;
      for (var i = 0; i < counts[rid]; i++) {
        g.fillStyle = '#ffffff';
        g.beginPath();
        g.arc(px(R.x) + (i % 4) * 10 - 15, pz(R.z) + 14 + Math.floor(i / 4) * 10, 4, 0, 7);
        g.fill();
      }
    }
  }

  /* sabotage highlights */
  if (G.sabotage) {
    (G.sabotage.def.rooms || []).forEach(function (rid) {
      var R = AU.roomOf(G.map, rid);
      if (!R) return;
      var fixed = G.sabotage.fixedRooms && G.sabotage.fixedRooms[rid];
      g.strokeStyle = fixed ? '#50EF39' : '#ff3b3b';
      g.lineWidth = 4;
      g.strokeRect(px(R.x - R.w / 2), pz(R.z - R.d / 2), R.w * sx, R.d * sz);
    });
  }

  /* tracker */
  if (me && me.trackTargetId && me.trackTimer > 0) {
    var tp = G.byId(me.trackTargetId);
    if (tp) {
      g.fillStyle = '#50EF39';
      g.beginPath(); g.arc(px(tp.lastKnownX != null ? tp.lastKnownX : tp.x),
        pz(tp.lastKnownZ != null ? tp.lastKnownZ : tp.z), 7, 0, 7); g.fill();
      g.strokeStyle = '#0a0'; g.lineWidth = 2; g.stroke();
    }
  }

  /* self */
  if (me) {
    var pulse = 5 + Math.sin(performance.now() / 220) * 2;
    g.fillStyle = '#' + AU.colorById(me.look.color).hex.toString(16).padStart(6, '0');
    g.beginPath(); g.arc(px(me.x), pz(me.z), pulse + 3, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  }

  /* ghosts see everyone */
  if (me && !me.alive) {
    G.players.forEach(function (p) {
      if (p === me || !p.alive) return;
      g.fillStyle = '#' + AU.colorById(p.look.color).hex.toString(16).padStart(6, '0');
      g.globalAlpha = 0.65;
      g.beginPath(); g.arc(px(p.x), pz(p.z), 5, 0, 7); g.fill();
      g.globalAlpha = 1;
    });
  }
};

/* ---- sabotage buttons ---- */
function buildSabotageButtons(wrap, cv) {
  var G = HUD.G;
  wrap.style.position = 'relative';
  var grid = G.layout.grid;
  var sx = cv.width / (grid.maxX - grid.minX), sz = cv.height / (grid.maxZ - grid.minZ);
  (G.map.sabotages || []).forEach(function (s) {
    var x, z;
    if (s.doors) { x = grid.minX + (grid.maxX - grid.minX) * 0.5; z = grid.minZ + 3; }
    else {
      var R = AU.roomOf(G.map, s.rooms[0]);
      if (!R) return;
      x = R.x; z = R.z;
    }
    var b = el('button', 'sab-btn', s.doors ? '🚪' : (s.id === 'lights' ? '💡' :
      s.id === 'comms' ? '📡' : s.id === 'o2' ? 'O₂' : s.id === 'mushroom' ? '🍄' : '☢'));
    b.title = s.name;
    b.style.left = ((x - grid.minX) * sx - 23) + 'px';
    b.style.top = ((z - grid.minZ) * sz - 23) + 'px';
    b.disabled = !!G.sabotage || G.sabotageCd > 0;
    b.onclick = function () {
      G.startSabotage(s.id);
      HUD.closeMap();
    };
    wrap.appendChild(b);
  });
  if (G.sabotageCd > 0) {
    var note = el('div', 'hint', 'Sabotage cooldown: ' + Math.ceil(G.sabotageCd) + 's');
    note.style.textAlign = 'center';
    wrap.appendChild(note);
  }
}

/* ---- vitals ---- */
function buildVitals(wrap) {
  var G = HUD.G;
  var box = el('div');
  box.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;width:min(800px,86vw);';
  G.players.forEach(function (p) {
    var card = el('div');
    var dead = !p.alive;
    var disconnected = p.disconnected;
    card.style.cssText = 'background:#0e1730;border:3px solid ' +
      (disconnected ? '#54627f' : dead ? '#D01F1F' : '#1FA84A') + ';border-radius:12px;padding:8px;text-align:center;';
    card.innerHTML = AU.Models.avatarImg(p.look, 64, 74, 'av') +
      '<div style="font-size:12px;letter-spacing:1px">' + esc(p.name) + '</div>' +
      '<div style="font-size:11px;color:' + (disconnected ? '#8397A7' : dead ? '#ff8a8a' : '#7dffb0') + '">' +
      (disconnected ? 'DISCONNECTED' : dead ? 'DEAD' : 'ALIVE') + '</div>' +
      '<canvas width="120" height="28" class="ekg"></canvas>';
    box.appendChild(card);
    setTimeout(function () {
      var cv = card.querySelector('.ekg');
      if (!cv) return;
      var g = cv.getContext('2d');
      var t = 0;
      var iv = setInterval(function () {
        if (!document.body.contains(cv)) { clearInterval(iv); return; }
        g.fillStyle = '#050b18'; g.fillRect(0, 0, 120, 28);
        g.strokeStyle = dead || disconnected ? '#883' : '#50EF39';
        g.lineWidth = 2; g.beginPath();
        for (var x = 0; x < 120; x++) {
          var ph = (x + t) % 40;
          var y = 14;
          if (!dead && !disconnected) {
            if (ph === 12) y = 4; else if (ph === 14) y = 26; else if (ph === 16) y = 10;
          }
          g[x ? 'lineTo' : 'moveTo'](x, y);
        }
        g.stroke();
        t += 2;
      }, 60);
    }, 10);
  });
  wrap.appendChild(box);
}

/* ---- cameras ---- */
function buildCams(wrap) {
  var G = HUD.G;
  var views = G.map.camViews || [];
  var box = el('div');
  box.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:8px;width:min(760px,88vw);';
  views.slice(0, 4).forEach(function (roomId) {
    var R = AU.roomOf(G.map, roomId);
    var cell = el('div');
    cell.style.cssText = 'background:#050b18;border:3px solid #2b3a5c;border-radius:10px;position:relative;height:190px;overflow:hidden;';
    var cv = el('canvas'); cv.width = 360; cv.height = 186;
    cv.style.cssText = 'width:100%;height:100%;';
    cell.appendChild(cv);
    var lbl = el('div', null, (R ? R.name : roomId).toUpperCase());
    lbl.style.cssText = 'position:absolute;left:8px;top:6px;font-size:11px;color:#7dffb0;letter-spacing:2px;text-shadow:0 0 6px #000;';
    cell.appendChild(lbl);
    box.appendChild(cell);
    var g = cv.getContext('2d');
    var iv = setInterval(function () {
      if (!document.body.contains(cv)) { clearInterval(iv); return; }
      g.fillStyle = '#0a1a12'; g.fillRect(0, 0, 360, 186);
      /* scanlines + noise */
      for (var y = 0; y < 186; y += 3) {
        g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y, 360, 1);
      }
      if (!R) return;
      var scale = Math.min(340 / R.w, 170 / R.d);
      g.save();
      g.translate(180, 93);
      g.strokeStyle = '#1f6b46'; g.lineWidth = 2;
      g.strokeRect(-R.w * scale / 2, -R.d * scale / 2, R.w * scale, R.d * scale);
      G.players.forEach(function (p) {
        if (!p.alive || p.venting || p.invisible) return;
        var r = G.layout.roomAt(p.x, p.z);
        if (!r || r.id !== roomId) return;
        g.fillStyle = '#' + AU.colorById(p.look.color).hex.toString(16).padStart(6, '0');
        g.beginPath();
        g.ellipse((p.x - R.x) * scale, (p.z - R.z) * scale, 7, 9, 0, 0, 7);
        g.fill();
        g.fillStyle = '#A9D6EE';
        g.beginPath(); g.arc((p.x - R.x) * scale + 2, (p.z - R.z) * scale - 3, 3, 0, 7); g.fill();
      });
      G.bodies.forEach(function (b) {
        if (b.reported || b.dissolved || b.room !== roomId) return;
        g.fillStyle = '#' + AU.colorById(b.look.color).hex.toString(16).padStart(6, '0');
        g.beginPath(); g.ellipse((b.x - R.x) * scale, (b.z - R.z) * scale, 9, 5, 0, 0, 7); g.fill();
      });
      g.restore();
      if (Math.random() < 0.06) { g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(0, Math.random() * 186, 360, 8); }
    }, 100);
  });
  wrap.appendChild(box);
  var note = el('div', 'hint', 'While cameras are live, a red light shows on them for everyone in that room.');
  note.style.textAlign = 'center';
  wrap.appendChild(note);
  G.camsActive = true;
}

/* ---- door log (MIRA) ---- */
function buildDoorLog(wrap) {
  var G = HUD.G;
  var box = el('div');
  box.style.cssText = 'width:min(620px,88vw);max-height:56vh;overflow:auto;background:#050b18;border:3px solid #2b3a5c;border-radius:12px;padding:12px;font-size:13px;';
  var rows = G.doorLog.slice(-40).reverse();
  if (!rows.length) box.innerHTML = '<div class="hint">No entries logged yet.</div>';
  rows.forEach(function (r) {
    var d = el('div');
    d.style.cssText = 'padding:4px 0;border-bottom:1px solid #1d2a47;display:flex;gap:10px;';
    d.innerHTML = '<span style="color:#7f92b8;width:52px">' + r.t.toFixed(0) + 's</span>' +
      '<span style="color:#' + AU.colorById(r.color).hex.toString(16).padStart(6, '0') + '">' + esc(r.name) + '</span>' +
      '<span style="color:#cfe0ff">entered ' + esc(r.room) + '</span>';
    box.appendChild(d);
  });
  wrap.appendChild(box);
}

AU.HUD = HUD;

})(window.AU);
