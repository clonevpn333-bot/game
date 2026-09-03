// ============================================================ HUD
// The stamina bar, who is with you, and what is in your hand.  Nothing else.
var HUD = {
  blocked: true, el: {}, toasts: [], tagPool: [], tagUsed: 0,
  hurtT: 0, wallHint: -1, segs: [],
};

HUD.init = function () {
  var g = function (id) { return document.getElementById(id); };
  HUD.el = {
    hud: g('hud'), bar: g('bar'), fill: g('bar-fill'), extra: g('bar-extra'),
    segs: g('bar-segs'), icons: g('bar-icons'), hp: g('bar-hp'),
    mates: g('mates'), item: g('item'), itemIc: g('item-ic'), itemNm: g('item-nm'),
    prompt: g('prompt'), ring: g('ring'), ringP: g('ring-p'), ringT: g('ring-t'),
    toasts: g('toasts'), hurt: g('hurt'), vig: g('vig'),
    tags: g('tags'), room: g('room-chip'), out: g('out'),
  };
  for (var i = 0; i < STATUS.length; i++) {
    var d = document.createElement('i');
    d.style.background = STATUS[i].col;
    HUD.el.segs.appendChild(d);
    var ic = document.createElement('i');
    ic.textContent = STATUS[i].ic;
    ic.style.color = STATUS[i].col;
    HUD.el.icons.appendChild(ic);
    HUD.segs.push({ bar: d, icon: ic });
  }
};

HUD.show = function (on) { HUD.el.hud.classList.toggle('hidden', !on); };

HUD.toast = function (text, col) {
  var d = document.createElement('div');
  d.className = 'toast';
  d.textContent = text;
  d.style.color = col || '#f2efe6';
  HUD.el.toasts.appendChild(d);
  HUD.toasts.push({ el: d, t: 0 });
  while (HUD.toasts.length > 3) {
    var old = HUD.toasts.shift();
    if (old.el.parentNode) old.el.parentNode.removeChild(old.el);
  }
};

HUD.flashHurt = function (a) { HUD.hurtT = Math.max(HUD.hurtT, clamp(a, 0.15, 1)); };

var _pv = new THREE.Vector3();
HUD.tick = function (dt, cam) {
  var e = HUD.el;

  // ---- the bar: green is what is left, everything else has eaten into it
  var full = K.ST_MAX;
  var stPct = clamp(P.st / full * 100, 0, 100);
  var exPct = clamp(P.extra / full * 100, 0, 100);
  var maxPct = clamp(P.stMax / full * 100, 0, 100);
  e.fill.style.width = stPct + '%';
  e.extra.style.left = stPct + '%';
  e.extra.style.width = Math.max(0, Math.min(exPct, maxPct - stPct)) + '%';
  e.hp.style.width = clamp(P.hp / K.HP_MAX * 100, 0, 100) + '%';

  var right = 0;
  for (var i = STATUS.length - 1; i >= 0; i--) {
    var v = P.status[STATUS[i].k], w = clamp(v / full * 100, 0, 100);
    var seg = HUD.segs[i];
    seg.bar.style.width = w + '%';
    seg.bar.style.right = right + '%';
    seg.bar.style.display = w > 0.4 ? 'block' : 'none';
    seg.icon.style.display = w > 5 ? 'block' : 'none';
    seg.icon.style.right = (right + w / 2) + '%';
    right += w;
  }
  e.bar.classList.toggle('low', P.st < 18 && P.state === ST.CLIMB);
  e.bar.classList.toggle('gone', P.stMax < 22);

  HUD.hurtT = Math.max(0, HUD.hurtT - dt * 1.5);
  e.hurt.style.opacity = HUD.hurtT * 0.85;
  var zn = zoneAt(P.pos.y);
  var cold = clamp(P.status.cold / 100, 0, 1), heat = clamp(P.status.heat / 100, 0, 1);
  e.vig.style.opacity = Math.max(cold, heat) * 0.7;
  e.vig.style.boxShadow = 'inset 0 0 150px 40px ' + (heat > cold ? 'rgba(255,110,40,.65)' : 'rgba(96,176,232,.6)');

  e.out.classList.toggle('hidden', P.state !== ST.OUT);
  if (P.state === ST.OUT) e.out.textContent = Math.ceil(P.outT) + '';

  HUD.item();
  HUD.mates();
  HUD.prompt();
  HUD.tags(cam);

  for (var t = HUD.toasts.length - 1; t >= 0; t--) {
    var to = HUD.toasts[t];
    to.t += dt;
    if (to.t > 4.0) {
      if (to.el.parentNode) to.el.parentNode.removeChild(to.el);
      HUD.toasts.splice(t, 1);
    } else if (to.t > 3.2) to.el.style.opacity = (4.0 - to.t) / 0.8;
  }
};

HUD.item = function () {
  var s = P.inv[P.sel];
  HUD.el.item.classList.toggle('hidden', !s);
  if (!s) { HUD._item = null; return; }
  if (HUD._item === s.k) return;
  HUD._item = s.k;
  HUD.el.itemIc.textContent = ITEM[s.k].ic;
  HUD.el.itemNm.textContent = ITEM[s.k].nm;
};

HUD.mates = function () {
  var list = Remote.list, box = HUD.el.mates;
  while (box.children.length > list.length) box.removeChild(box.lastChild);
  while (box.children.length < list.length) {
    var d = document.createElement('div');
    d.className = 'mate';
    d.innerHTML = '<i class="chip"></i><span class="nm"></span><div class="mb"><i></i></div>';
    box.appendChild(d);
  }
  for (var i = 0; i < list.length; i++) {
    var a = list[i], el = box.children[i];
    el.children[0].style.background = SLOT_HEX[a.slot % 4];
    el.children[1].textContent = a.name;
    el.children[2].children[0].style.width = clamp(a.st / K.ST_MAX * 100, 0, 100) + '%';
    el.classList.toggle('dn', a.state === ST.OUT);
    el.classList.toggle('off', !a.online);
  }
};

HUD.prompt = function () {
  var txt = '', ring = 0, ringTxt = '';
  var mate = Coop.nearestDown(2.8);
  if (P.state === ST.OUT) {
    txt = 'you are down — hold on';
  } else if (HUD.wallHint >= 0) {
    txt = 'fog — light the campfire below to open ' + ZONES[HUD.wallHint + 1].name;
  } else if (P.carrying) {
    var c = Remote.byId(P.carrying);
    txt = '<em>F</em> set ' + (c ? c.name : 'them') + ' down';
  } else if (mate) {
    txt = '<em>F</em> carry ' + mate.name + '  ·  <em>hold F</em> revive';
    if (P.reviveT > 0.05) { ring = P.reviveT / K.REVIVE_T; ringTxt = 'reviving ' + mate.name; }
  } else if (P.onPiton) {
    txt = 'resting on the piton';
  } else if (P.rope) {
    txt = 'on the rope';
  } else if (P.state === ST.SLIP) {
    txt = 'sliding';
  } else {
    var box = WI.nearestCase(P.pos.x, P.pos.y + 0.4, P.pos.z, 2.6);
    var it = WI.nearest(P.pos.x, P.pos.y + 0.6, P.pos.z, 2.6);
    if (box) txt = '<em>F</em> open the suitcase';
    else if (it) txt = '<em>F</em> take ' + ITEM[it.k].nm;
    else if (Survive.atFire) txt = 'a fire — rest, cook, and wake up here';
  }
  HUD.wallHint = -1;
  var e = HUD.el.prompt;
  if (txt !== HUD._prompt) { e.innerHTML = txt; HUD._prompt = txt; }
  e.classList.toggle('on', !!txt);

  HUD.el.ring.classList.toggle('hidden', ring <= 0);
  if (ring > 0) {
    HUD.el.ringP.style.strokeDashoffset = (106.8 * (1 - clamp(ring, 0, 1))).toFixed(1);
    HUD.el.ringT.textContent = ringTxt;
  }
};

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
  var w = window.innerWidth, h = window.innerHeight, m = 26;
  var sx = (_pv.x * 0.5 + 0.5) * w, sy = (-_pv.y * 0.5 + 0.5) * h;
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
    HUD.place(HUD.getTag(), a.pos.x, a.pos.y + 2.2, a.pos.z, cam,
      a.name, d > 6 ? Math.round(d) + 'm' : '', SLOT_HEX[a.slot % 4],
      a.state === ST.OUT ? 'down' : '');
  }
  for (i = 0; i < Coop.pings.length; i++) {
    var p = Coop.pings[i];
    d = Math.sqrt(Math.pow(p.x - P.pos.x, 2) + Math.pow(p.y - P.pos.y, 2) + Math.pow(p.z - P.pos.z, 2));
    HUD.place(HUD.getTag(), p.x, p.y + 1.6, p.z, cam,
      p.danger ? 'danger' : p.who, Math.round(d) + 'm',
      p.danger ? '#ff5b52' : SLOT_HEX[p.slot % 4], 'pingt');
  }
  for (i = HUD.tagUsed; i < HUD.tagPool.length; i++) HUD.tagPool[i].style.display = 'none';
};

HUD.summit = function () {
  var box = document.getElementById('over-stats');
  var rows = [
    ['time on the island', fmtTime(Game.runT)],
    ['metres climbed', Math.round(P.stats.climbed) + ' m'],
    ['falls survived', P.stats.falls],
    ['times you went down', Survive.deaths],
    ['scouts rescued', 1 + Remote.list.filter(function (a) { return a.summited; }).length],
  ];
  box.innerHTML = '';
  for (var i = 0; i < rows.length; i++) {
    var d = document.createElement('div');
    d.className = 'stat';
    d.innerHTML = '<span>' + rows[i][0] + '</span><b>' + rows[i][1] + '</b>';
    box.appendChild(d);
  }
  document.getElementById('over-h').textContent = 'RESCUED';
  document.getElementById('over').classList.remove('hidden');
  HUD.blocked = true;
  IN.unlock();
};
