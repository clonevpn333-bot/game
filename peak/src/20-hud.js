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
    drain: g('drain'), drainT: g('drain-t'), drainWhy: g('drain-why'),
    pack: g('pack'), packWt: g('pack-wt'),
    segs: g('bar-segs'), icons: g('bar-icons'), hp: g('bar-hp'),
    mates: g('mates'),
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
  var onWall = P.state === ST.CLIMB || P.state === ST.SLIP;
  var rate = Survive.drain, left = rate > 0.05 ? (P.st + P.extra) / rate : 99;
  e.bar.classList.toggle('warn', onWall && left < 6 && left >= 2.5);
  e.bar.classList.toggle('crit', onWall && (left < 2.5 || P.gripT > 0));
  e.bar.classList.toggle('low', onWall && left < 6);
  e.bar.classList.toggle('gone', P.stMax < 22);
  HUD.drainRead(onWall, rate, left);

  HUD.hurtT = Math.max(0, HUD.hurtT - dt * 1.5);
  e.hurt.style.opacity = HUD.hurtT * 0.85;
  var zn = zoneAt(P.pos.y);
  var cold = clamp(P.status.cold / 100, 0, 1), heat = clamp(P.status.heat / 100, 0, 1);
  e.vig.style.opacity = Math.max(cold, heat) * 0.7;
  e.vig.style.boxShadow = 'inset 0 0 150px 40px ' + (heat > cold ? 'rgba(255,110,40,.65)' : 'rgba(96,176,232,.6)');

  e.out.classList.toggle('hidden', P.state !== ST.OUT);
  if (P.state === ST.OUT) e.out.textContent = Math.ceil(P.outT) + '';

  HUD.pack();
  HUD.coach(dt);
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

// Seconds of wall left at the rate you are actually paying, plus the reason
// it is that rate.  Before this the only signal was the bar turning red with
// two seconds to go, which is not a warning, it is a notification.
var WHY_TXT = {
  wind: 'wind', ice: 'ice', kiln: 'hot rock', carrying: 'carrying',
  rope: 'on rope', piton: 'resting',
};
HUD.drainRead = function (onWall, rate, left) {
  var e = HUD.el;
  e.drain.classList.toggle('hidden', !onWall);
  if (!onWall) return;
  if (P.gripT > 0) {
    e.drainT.textContent = 'HOLD ON';
  } else {
    e.drainT.textContent = rate <= 0 ? 'resting' : (left > 60 ? '60s+' : Math.ceil(left) + 's');
  }
  var why = [];
  for (var i = 0; i < Survive.why.length; i++) why.push(WHY_TXT[Survive.why[i]] || Survive.why[i]);
  var txt = why.join(' · ');
  if (e._why !== txt) { e.drainWhy.textContent = txt; e._why = txt; }
  e.drain.classList.toggle('warn', left < 6 && left >= 2.5 && P.gripT <= 0);
  e.drain.classList.toggle('crit', left < 2.5 || P.gripT > 0);
};

// The pack, always on screen: three slots, what is in them, and what it all
// weighs, because weight is the one status you choose to carry.
HUD.pack = function () {
  var slots = HUD.el.pack.children, wt = 0;
  for (var i = 0; i < 3; i++) {
    var el = slots[i], s = P.inv[i], it = s ? ITEM[s.k] : null;
    if (it) wt += it.wt * s.n;
    var key = (s ? s.k : '-') + (i === P.sel ? '*' : '');
    el.classList.toggle('on', i === P.sel);
    el.classList.toggle('has', !!s);
    if (el._key === key) continue;
    el._key = key;
    el.children[1].textContent = it ? it.ic : '';
    el.children[2].textContent = it ? (it.nm + (s.n > 1 ? ' x' + s.n : '')) : 'empty';
  }
  if (HUD._wt !== wt) {
    HUD._wt = wt;
    HUD.el.packWt.children[1].textContent = wt;
    HUD.el.packWt.classList.toggle('heavy', wt >= 18);
  }
};

// ---------------------------------------------------------------- coaching
// One line at a time, each shown once, fired by what you are actually doing.
// There was nothing here at all: the game explained the grab key and then let
// you work out stamina, ledges, fires and fog walls by dying.
var COACH = [
  { id: 'move', col: '#dfe9f4', txt: 'WASD to move · mouse to look · Shift to run',
    when: function () { return true; } },
  { id: 'wall', col: '#a6f04e', txt: 'almost every rock face is climbable — hold the grab key and keep moving',
    when: function () { return P.state === ST.GROUND && P.wall.has; } },
  { id: 'climb', col: '#a6f04e', txt: 'the bar at the bottom is your grip — the number above it is seconds left',
    when: function () { return P.state === ST.CLIMB; } },
  { id: 'rest', col: '#ffc447', txt: 'grip only comes back on the ground — pull onto a ledge, or hammer a piton in',
    when: function () { return P.state === ST.CLIMB && P.st < P.stMax * 0.45; } },
  { id: 'top', col: '#a6f04e', txt: 'climb into a lip and the scout hauls over it — you do not need to jump',
    when: function () { return P.state === ST.GROUND && P.stats.climbed > 8; } },
  { id: 'fall', col: '#ff5b52', txt: 'a long drop hurts — let go low, or slide down rather than fall',
    when: function () { return P.status.injury > 4; } },
  { id: 'fire', col: '#ffd646', txt: 'fires are checkpoints: they warm you, mend you, cook food, and you wake up here',
    when: function () { return Survive.atFire; } },
  { id: 'fog', col: '#8fbfe0', txt: 'the fog is a ceiling until you light the fire below it',
    when: function () { return HUD.wallHint >= 0; } },
  { id: 'pack', col: '#c9a06a', txt: '1-3 picks a pack slot, C uses it, X drops it — everything you carry costs grip',
    when: function () { return !!(P.inv[0] || P.inv[1] || P.inv[2]); } },
  { id: 'rise', col: '#b06ad0', txt: 'the fog is rising from the sea now — do not be under it',
    when: function () { return Fog.level > 4; } },
];
HUD.coachDone = {};
HUD.coachT = 0;
HUD.coachHold = 0;
HUD.coach = function (dt) {
  HUD.coachT += dt;
  HUD.coachHold -= dt;
  if (HUD.coachT < 0.4 || HUD.coachHold > 0) return;
  HUD.coachT = 0;
  for (var i = 0; i < COACH.length; i++) {
    var c = COACH[i];
    if (HUD.coachDone[c.id]) continue;
    var ok = false;
    try { ok = c.when(); } catch (e) { ok = false; }
    if (!ok) continue;
    HUD.coachDone[c.id] = 1;
    HUD.toast(c.txt, c.col);
    HUD.coachHold = 4.2;                 // never stack two lessons at once
    return;
  }
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
    txt = 'fog — light the campfire below to climb into ' + Run.at(HUD.wallHint + 1).nm;
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
