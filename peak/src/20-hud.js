// ============================================================ HUD
var HUD = {
  blocked: true, el: {}, toasts: [], tagPool: [], tagUsed: 0,
  hurtT: 0, lastAlt: 0,
};

HUD.init = function () {
  var g = function (id) { return document.getElementById(id); };
  HUD.el = {
    hud: g('hud'), hp: g('b-hp'), st: g('b-st'), stcap: g('b-stcap'), hu: g('b-hu'), tp: g('b-tp'),
    mates: g('mates'), belt: g('belt'), alt: g('alt-n'), altYou: g('alt-you'),
    prompt: g('prompt'), ring: g('ring'), ringP: g('ring-p'), ringT: g('ring-t'),
    status: g('status'), toasts: g('toasts'), hurt: g('hurt'), cold: g('cold'),
    tags: g('tags'), room: g('room-chip'),
  };
  for (var i = 0; i < 4; i++) {
    var s = document.createElement('div');
    s.className = 'slot';
    s.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="ic"></span><span class="q"></span>';
    HUD.el.belt.appendChild(s);
  }
  HUD.beltSlots = HUD.el.belt.children;
};

HUD.show = function (on) { HUD.el.hud.classList.toggle('hidden', !on); };

HUD.toast = function (text, col) {
  var d = document.createElement('div');
  d.className = 'toast';
  d.textContent = text;
  d.style.color = col || '#f2efe6';
  HUD.el.toasts.appendChild(d);
  HUD.toasts.push({ el: d, t: 0 });
  while (HUD.toasts.length > 4) {
    var old = HUD.toasts.shift();
    if (old.el.parentNode) old.el.parentNode.removeChild(old.el);
  }
};

HUD.flashHurt = function (a) { HUD.hurtT = Math.max(HUD.hurtT, clamp(a, 0.15, 1)); };

// ---------------------------------------------------------------- per frame
var _pv = new THREE.Vector3();
HUD.tick = function (dt, cam) {
  var e = HUD.el;

  e.hp.style.width = clamp(P.hp / K.HP_MAX * 100, 0, 100) + '%';
  e.st.style.width = clamp(P.st / K.ST_MAX * 100, 0, 100) + '%';
  e.stcap.style.left = clamp(P.stMax / K.ST_MAX * 100, 0, 100) + '%';
  e.stcap.style.display = P.stMax < K.ST_MAX - 0.5 ? 'block' : 'none';
  e.hu.style.width = clamp(P.hunger / K.HU_MAX * 100, 0, 100) + '%';
  e.tp.style.width = clamp(P.temp / K.TP_MAX * 100, 0, 100) + '%';
  e.hud.classList.toggle('low-st', P.st < 22);
  e.hud.classList.toggle('low-hp', P.hp < 30);

  var alt = Math.max(0, Math.round(P.pos.y));
  e.alt.textContent = alt;
  e.altYou.style.bottom = clamp(P.pos.y / K.SUMMIT_H * 100, 0, 100) + '%';

  // vignettes
  HUD.hurtT = Math.max(0, HUD.hurtT - dt * 1.5);
  e.hurt.style.opacity = HUD.hurtT * 0.85;
  e.cold.style.opacity = clamp(1 - P.temp / 45, 0, 1) * 0.75;

  HUD.belt();
  HUD.mates();
  HUD.status();
  HUD.prompt();
  HUD.tags(cam);

  for (var i = HUD.toasts.length - 1; i >= 0; i--) {
    var t = HUD.toasts[i];
    t.t += dt;
    if (t.t > 4.2) {
      if (t.el.parentNode) t.el.parentNode.removeChild(t.el);
      HUD.toasts.splice(i, 1);
    } else if (t.t > 3.4) t.el.style.opacity = (4.2 - t.t) / 0.8;
  }
};

HUD.belt = function () {
  for (var i = 0; i < 4; i++) {
    var el = HUD.beltSlots[i], s = P.inv[i];
    el.classList.toggle('on', i === P.sel);
    var ic = el.children[1], q = el.children[2];
    if (s) {
      ic.textContent = ITEM[s.k].ic;
      q.textContent = s.n > 1 ? s.n : '';
      el.classList.toggle('eq', (s.k === 'parka' && P.parka) || (s.k === 'torch' && P.torchOn));
    } else { ic.textContent = ''; q.textContent = ''; el.classList.remove('eq'); }
  }
};

HUD.mates = function () {
  var list = Remote.list, box = HUD.el.mates;
  while (box.children.length > list.length) box.removeChild(box.lastChild);
  while (box.children.length < list.length) {
    var d = document.createElement('div');
    d.className = 'mate';
    d.innerHTML = '<i class="chip"></i><div class="bars"><span class="nm"></span>' +
      '<div class="mb"><i></i></div><div class="mb"><i></i></div></div><span class="st"></span>';
    box.appendChild(d);
  }
  for (var i = 0; i < list.length; i++) {
    var a = list[i], el = box.children[i];
    el.children[0].style.background = SLOT_HEX[a.slot % 4];
    var bars = el.children[1];
    bars.children[0].textContent = a.name;
    bars.children[1].children[0].style.width = clamp(a.hp, 0, 100) + '%';
    bars.children[1].children[0].style.background = 'var(--hp)';
    bars.children[2].children[0].style.width = clamp(a.st, 0, 100) + '%';
    bars.children[2].children[0].style.background = 'var(--st)';
    var d = Math.round(Math.sqrt(Math.pow(a.pos.x - P.pos.x, 2) + Math.pow(a.pos.y - P.pos.y, 2) + Math.pow(a.pos.z - P.pos.z, 2)));
    el.children[2].textContent = a.state === ST.DOWN ? 'DOWN' : d + 'm';
    el.classList.toggle('dn', a.state === ST.DOWN);
    el.classList.toggle('off', !a.online);
  }
};

var _badges = [];
HUD.status = function () {
  var b = [];
  if (P.inj.leg) b.push(['ANKLE', 'warn']);
  if (P.inj.arm) b.push(['SHOULDER', 'warn']);
  if (P.temp < 45) b.push(['FREEZING', 'cold']);
  if (P.hunger < K.HU_CHOKE) b.push(['STARVING', 'warn']);
  if (P.carrying) b.push(['CARRYING', 'ok']);
  if (P.brace) b.push(['BRACED', 'ok']);
  if (P.tether) b.push(['ROPED', 'ok']);
  if (P.state === ST.DOWN) b.push(['DOWN ' + Math.ceil(P.downT) + 's', 'bad']);
  var key = b.map(function (x) { return x[0]; }).join('|');
  if (key === HUD._badgeKey) return;
  HUD._badgeKey = key;
  var box = HUD.el.status;
  box.innerHTML = '';
  for (var i = 0; i < b.length; i++) {
    var d = document.createElement('div');
    d.className = 'badge ' + b[i][1];
    d.textContent = b[i][0];
    box.appendChild(d);
  }
};

HUD.prompt = function () {
  var txt = '', ring = 0, ringTxt = '';
  var mate = Coop.nearestDown(2.6);
  if (P.state === ST.DOWN) {
    txt = 'you are down — hold on, someone can reach you';
  } else if (P.carrying) {
    var c = Remote.byId(P.carrying);
    txt = '<em>E</em> set ' + (c ? c.name : 'them') + ' down';
  } else if (mate) {
    txt = '<em>E</em> shoulder ' + mate.name + '  ·  <em>hold E</em> revive';
    if (P.reviveT > 0.05) { ring = P.reviveT / K.REVIVE_T; ringTxt = 'reviving ' + mate.name; }
  } else {
    var it = WI.nearest(P.pos.x, P.pos.y + 0.6, P.pos.z, 2.7);
    if (it) txt = '<em>E</em> take ' + ITEM[it.k].nm;
    else if (Survive.atFire) txt = 'camp ' + (Survive.camp.idx + 1) + ' — warm, and you respawn here';
    else if (Survive.restPt && P.state === ST.CLIMB) txt = 'resting on the piton';
    else if (P.state === ST.CLIMB && P.wall.surf === SF.VINE) txt = 'roots hold you for free';
    else if (P.state === ST.CLIMB && P.wall.surf === SF.LOOSE) txt = 'this rock is going — keep moving';
    else if (P.state === ST.CLIMB && P.wall.ny < 0.17) txt = 'overhang — double the burn';
  }
  var e = HUD.el.prompt;
  if (txt !== HUD._prompt) { e.innerHTML = txt; HUD._prompt = txt; }
  e.classList.toggle('on', !!txt);

  HUD.el.ring.classList.toggle('hidden', ring <= 0);
  if (ring > 0) {
    HUD.el.ringP.style.strokeDashoffset = (106.8 * (1 - clamp(ring, 0, 1))).toFixed(1);
    HUD.el.ringT.textContent = ringTxt;
  }
};

// ---- projected world tags --------------------------------------------
HUD.getTag = function () {
  var t;
  if (HUD.tagUsed < HUD.tagPool.length) t = HUD.tagPool[HUD.tagUsed];
  else {
    t = document.createElement('div');
    t.className = 'tag3';
    t.innerHTML = '<span class="pin"></span><span class="lb"></span><span class="d"></span>';
    HUD.el.tags.appendChild(t);
    HUD.tagPool.push(t);
  }
  HUD.tagUsed++;
  return t;
};

HUD.place = function (t, x, y, z, cam, label, dist, col, cls) {
  _pv.set(x, y, z).project(cam);
  if (_pv.z > 1 || _pv.z < -1) { t.style.display = 'none'; return false; }
  var w = window.innerWidth, h = window.innerHeight;
  var sx = (_pv.x * 0.5 + 0.5) * w, sy = (-_pv.y * 0.5 + 0.5) * h;
  var m = 26;
  var off = sx < m || sx > w - m || sy < m || sy > h - m;
  t.style.display = 'block';
  t.style.left = clamp(sx, m, w - m) + 'px';
  t.style.top = clamp(sy, m, h - m) + 'px';
  t.style.color = col;
  t.style.opacity = off ? 0.55 : 1;
  t.className = 'tag3' + (cls ? ' ' + cls : '');
  t.children[0].style.background = col;
  t.children[1].textContent = label;
  t.children[2].textContent = dist;
  return true;
};

HUD.tags = function (cam) {
  HUD.tagUsed = 0;
  var i, a, d;
  for (i = 0; i < Remote.list.length; i++) {
    a = Remote.list[i];
    d = Math.sqrt(Math.pow(a.pos.x - P.pos.x, 2) + Math.pow(a.pos.y - P.pos.y, 2) + Math.pow(a.pos.z - P.pos.z, 2));
    HUD.place(HUD.getTag(), a.pos.x, a.pos.y + 2.15, a.pos.z, cam,
      a.name, d > 6 ? Math.round(d) + 'm' : '', SLOT_HEX[a.slot % 4],
      a.state === ST.DOWN ? 'down' : '');
  }
  for (i = 0; i < Coop.pings.length; i++) {
    var p = Coop.pings[i];
    d = Math.sqrt(Math.pow(p.x - P.pos.x, 2) + Math.pow(p.y - P.pos.y, 2) + Math.pow(p.z - P.pos.z, 2));
    HUD.place(HUD.getTag(), p.x, p.y + 1.6, p.z, cam,
      p.danger ? 'danger' : p.who, Math.round(d) + 'm',
      p.danger ? '#ff5b52' : SLOT_HEX[p.slot % 4], 'pingt');
  }
  // the summit itself, once it is in view
  if (Summit.pos && P.pos.y > 40) {
    d = Math.sqrt(Math.pow(Summit.pos.x - P.pos.x, 2) + Math.pow(Summit.pos.z - P.pos.z, 2) + Math.pow(Summit.pos.y - P.pos.y, 2));
    HUD.place(HUD.getTag(), Summit.pos.x, Summit.pos.y + 11, Summit.pos.z, cam, 'SUMMIT', Math.round(d) + 'm', '#ffd646', 'pingt');
  }
  for (i = HUD.tagUsed; i < HUD.tagPool.length; i++) HUD.tagPool[i].style.display = 'none';
};

// ---- end of run -------------------------------------------------------
HUD.summit = function () {
  var t = Game.runT;
  var box = document.getElementById('over-stats');
  var rows = [
    ['time on the mountain', fmtTime(t)],
    ['metres climbed', Math.round(P.stats.climbed) + ' m'],
    ['falls survived', P.stats.falls],
    ['mates put back together', P.stats.revives],
    ['climbers on the summit', 1 + Remote.list.filter(function (a) { return a.summited; }).length],
  ];
  box.innerHTML = '';
  for (var i = 0; i < rows.length; i++) {
    var d = document.createElement('div');
    d.className = 'stat';
    d.innerHTML = '<span>' + rows[i][0] + '</span><b>' + rows[i][1] + '</b>';
    box.appendChild(d);
  }
  document.getElementById('over-h').textContent = 'SUMMIT';
  document.getElementById('over').classList.remove('hidden');
  HUD.blocked = true;
  IN.unlock();
};
