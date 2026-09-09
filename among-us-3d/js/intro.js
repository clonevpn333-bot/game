/* ============================================================
   AMONG US 3D — ROLE REVEAL
   The start-of-round cinematic: starfield, your crew lined up,
   the big role word, and the "N Impostors among us" line.
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

var Intro = { open: false };

/* Starfield that streaks past behind the reveal. */
function starfield(host) {
  var cv = el('canvas', 'intro-stars');
  cv.width = window.innerWidth; cv.height = window.innerHeight;
  host.appendChild(cv);
  var g = cv.getContext('2d');
  var stars = [];
  for (var i = 0; i < 220; i++)
    stars.push({ x: Math.random() * cv.width, y: Math.random() * cv.height,
                 r: Math.random() * 1.9 + 0.3, s: 6 + Math.random() * 46 });
  var raf, last = performance.now();
  function loop(t) {
    var dt = (t - last) / 1000; last = t;
    g.fillStyle = '#03050c'; g.fillRect(0, 0, cv.width, cv.height);
    var grd = g.createRadialGradient(cv.width * 0.5, cv.height * 0.55, 40,
                                     cv.width * 0.5, cv.height * 0.55, cv.height * 0.9);
    grd.addColorStop(0, 'rgba(30,50,95,.55)');
    grd.addColorStop(1, 'rgba(3,5,12,0)');
    g.fillStyle = grd; g.fillRect(0, 0, cv.width, cv.height);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.x -= s.s * dt;
      if (s.x < -2) { s.x = cv.width + 2; s.y = Math.random() * cv.height; }
      g.fillStyle = 'rgba(255,255,255,' + (0.25 + s.r / 3) + ')';
      g.fillRect(s.x, s.y, s.r, s.r);
    }
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  return function () { cancelAnimationFrame(raf); };
}

/* players: the line-up to show. me: the local player. */
Intro.show = function (G, me, done) {
  var ov = $('overlay-intro');
  ov.innerHTML = '';
  ov.classList.add('on');
  Intro.open = true;

  var stopStars = starfield(ov);
  var wrap = el('div', 'intro-wrap');
  ov.appendChild(wrap);

  var isImp = me.team === 'impostor';
  var roleDef = AU.Roles.def(me.role);
  var impostors = G.players.filter(function (p) { return p.team === 'impostor'; });
  var impCount = impostors.length;

  /* --- the line-up: you in front, your team (or the crew) behind --- */
  var lineup = el('div', 'intro-lineup');
  var crew;
  if (isImp) {
    crew = impostors.filter(function (p) { return p.id !== me.id; }).slice(0, 4);
  } else {
    crew = G.players.filter(function (p) { return p.id !== me.id; });
    /* a handful of shipmates, shuffled, so the line-up feels like a crew photo */
    for (var i = crew.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = crew[i]; crew[i] = crew[j]; crew[j] = t;
    }
    crew = crew.slice(0, 4);
  }
  var left = crew.slice(0, Math.ceil(crew.length / 2));
  var right = crew.slice(Math.ceil(crew.length / 2));

  function figure(p, cls, delay) {
    var d = el('div', 'intro-fig ' + cls);
    d.style.animationDelay = delay + 'ms';
    d.innerHTML = AU.Models.avatarImg(p.look, 150, 174) +
      '<div class="intro-nm">' + esc(p.name) + '</div>';
    return d;
  }
  left.forEach(function (p, i) { lineup.appendChild(figure(p, 'side', 260 + i * 110)); });
  var mine = el('div', 'intro-fig me' + (isImp ? ' imp' : ''));
  mine.innerHTML = AU.Models.avatarImg(me.look, 230, 268) +
    '<div class="intro-nm you">' + esc(me.name) + '</div>';
  lineup.appendChild(mine);
  right.forEach(function (p, i) { lineup.appendChild(figure(p, 'side', 320 + i * 110)); });
  wrap.appendChild(lineup);

  /* --- the big word --- */
  var title = el('div', 'intro-title ' + (isImp ? 'imp' : 'crew'),
    isImp ? 'IMPOSTOR' : 'CREWMATE');
  wrap.appendChild(title);

  /* --- the count line --- */
  var count = el('div', 'intro-count');
  count.innerHTML = impCount === 1
    ? 'There is <b>1 Impostor</b> among us'
    : 'There are <b>' + impCount + ' Impostors</b> among us';
  wrap.appendChild(count);

  /* --- role card for specialists --- */
  if (me.role !== 'crewmate' && me.role !== 'impostor') {
    var card = el('div', 'intro-role');
    card.innerHTML =
      '<div class="ir-name" style="color:' + roleDef.color + '">' + roleDef.name.toUpperCase() + '</div>' +
      '<div class="ir-desc">' + esc(roleDef.desc) + '</div>' +
      (roleDef.ability ? '<div class="ir-key">Ability: <b>' + esc(roleDef.ability) +
        '</b> &mdash; press <kbd>C</kbd></div>' : '');
    wrap.appendChild(card);
  } else if (isImp) {
    wrap.appendChild(el('div', 'intro-role',
      '<div class="ir-desc">Sabotage the ship and eliminate the Crew.</div>' +
      '<div class="ir-key">Kill with <kbd>Q</kbd> &middot; vent with <kbd>F</kbd> &middot; sabotage with <kbd>M</kbd></div>'));
  } else {
    wrap.appendChild(el('div', 'intro-role',
      '<div class="ir-desc">Finish your tasks and find the Impostors.</div>' +
      '<div class="ir-key">Use with <kbd>E</kbd> &middot; report with <kbd>R</kbd> &middot; map with <kbd>Tab</kbd></div>'));
  }

  if (isImp && impCount > 1) {
    wrap.appendChild(el('div', 'intro-shh', 'Shhh&hellip; no more talking now.'));
  }

  var skip = el('div', 'intro-skip', 'click to continue');
  wrap.appendChild(skip);

  AU.Audio.play(isImp ? 'impostorReveal' : 'crewReveal');

  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    Intro.open = false;
    clearTimeout(timer);
    ov.removeEventListener('click', finish);
    stopStars();
    ov.classList.remove('on');
    ov.innerHTML = '';
    if (done) done();
  }
  var timer = setTimeout(finish, isImp ? 6200 : 5400);
  setTimeout(function () { ov.addEventListener('click', finish); }, 900);
};

AU.Intro = Intro;

})(window.AU);
