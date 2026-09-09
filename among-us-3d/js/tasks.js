/* ============================================================
   AMONG US 3D — TASK MINIGAMES
   Each entry builds its own DOM widget and calls done(true)
   when the step is finished. Multi-step tasks reopen with a
   higher ctx.step.
   ============================================================ */
(function (AU) {
'use strict';

function el(tag, cls, html) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function rnd(n) { return Math.floor(Math.random() * n); }
function pick(a) { return a[rnd(a.length)]; }
function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) { var j = rnd(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}
var WIRE_COLORS = ['#C51111', '#132ED1', '#F5F557', '#ED54BA', '#50EF39', '#EF7D0D'];

/* --------------------------------------------------------
   Shared widget helpers
-------------------------------------------------------- */
function msg(host, text) {
  var m = host.querySelector('.tg-msg');
  if (!m) { m = el('div', 'tg-msg'); host.appendChild(m); }
  m.textContent = text || '';
  return m;
}
function bar(host) {
  var b = el('div', 'tg-bar'); var f = el('div');
  b.appendChild(f); host.appendChild(b);
  return f;
}
function grid(host, cols, gap) {
  var g = el('div', 'tg-grid');
  g.style.gridTemplateColumns = 'repeat(' + cols + ', auto)';
  if (gap) g.style.gap = gap + 'px';
  host.appendChild(g);
  return g;
}
function canvas(host, w, h) {
  var c = el('canvas', 'tg-canvas');
  c.width = w; c.height = h;
  c.style.width = w + 'px'; c.style.height = h + 'px';
  host.appendChild(c);
  return c;
}
function pointerPos(c, ev) {
  var r = c.getBoundingClientRect();
  var t = ev.touches ? ev.touches[0] : ev;
  return { x: (t.clientX - r.left) * (c.width / r.width), y: (t.clientY - r.top) * (c.height / r.height) };
}
function ok(done, host) {
  AU.Audio.play('taskDone');
  msg(host, 'COMPLETE');
  setTimeout(function () { done(true); }, 380);
}

/* ========================================================
   ENGINES
======================================================== */
var E = {};

/* 1. WIRES ------------------------------------------------ */
E.wires = function (host, ctx, done) {
  var order = shuffle([0, 1, 2, 3]);
  var right = shuffle([0, 1, 2, 3]);
  var wrap = el('div', 'tg-wires');
  var L = el('div', 'tg-wire-col'), R = el('div', 'tg-wire-col');
  wrap.appendChild(L); wrap.appendChild(R);
  host.appendChild(wrap);
  var cv = el('canvas'); cv.width = 420; cv.height = 260;
  cv.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;';
  host.style.position = 'relative';
  host.appendChild(cv);
  var g = cv.getContext('2d');
  var lEls = [], rEls = [], connected = {}, dragging = null, mouse = null;

  order.forEach(function (c, i) {
    var w = el('div', 'wire'); w.style.background = WIRE_COLORS[c];
    w.dataset.c = c; L.appendChild(w); lEls.push(w);
  });
  right.forEach(function (c, i) {
    var w = el('div', 'wire'); w.style.background = WIRE_COLORS[c];
    w.dataset.c = c; R.appendChild(w); rEls.push(w);
  });

  function center(node) {
    var hr = host.getBoundingClientRect(), r = node.getBoundingClientRect();
    return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height / 2 };
  }
  function draw() {
    cv.width = host.clientWidth; cv.height = host.clientHeight;
    g.clearRect(0, 0, cv.width, cv.height);
    g.lineWidth = 12; g.lineCap = 'round';
    for (var c in connected) {
      var a = center(lEls[connected[c].li]), b = center(rEls[connected[c].ri]);
      g.strokeStyle = WIRE_COLORS[c];
      g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    }
    if (dragging && mouse) {
      var s = center(lEls[dragging.li]);
      g.strokeStyle = WIRE_COLORS[dragging.c];
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(mouse.x, mouse.y); g.stroke();
    }
  }
  lEls.forEach(function (w, i) {
    w.addEventListener('pointerdown', function (e) {
      if (connected[w.dataset.c]) return;
      dragging = { li: i, c: +w.dataset.c }; e.preventDefault();
    });
  });
  host.addEventListener('pointermove', function (e) {
    var hr = host.getBoundingClientRect();
    mouse = { x: e.clientX - hr.left, y: e.clientY - hr.top };
    if (dragging) draw();
  });
  host.addEventListener('pointerup', function (e) {
    if (!dragging) return;
    var target = document.elementFromPoint(e.clientX, e.clientY);
    var ri = rEls.indexOf(target);
    if (ri >= 0 && +target.dataset.c === dragging.c) {
      connected[dragging.c] = { li: dragging.li, ri: ri };
      lEls[dragging.li].classList.add('done'); target.classList.add('done');
      AU.Audio.play('taskStep');
      if (Object.keys(connected).length === 4) { dragging = null; draw(); ok(done, host); return; }
    }
    dragging = null; draw();
  });
  msg(host, 'Drag each wire to its matching colour');
  setTimeout(draw, 30);
};

/* 2. KEYPAD ----------------------------------------------- */
E.keypad = function (host, ctx, done) {
  var len = ctx.mini === 'safe' ? 5 : 6;
  var code = '';
  for (var i = 0; i < len; i++) code += rnd(10);
  var label = el('div', 'tg-display', code.replace(/(\d{2})/g, '$1 ').trim());
  label.style.color = '#F5C842';
  host.appendChild(label);
  var out = el('div', 'tg-display', '');
  host.appendChild(out);
  var g = el('div', 'tg-keypad'); host.appendChild(g);
  var typed = '';
  ['1','2','3','4','5','6','7','8','9','⌫','0','✓'].forEach(function (k) {
    var b = el('button', null, k);
    b.onclick = function () {
      AU.Audio.play('click');
      if (k === '⌫') typed = typed.slice(0, -1);
      else if (k === '✓') {
        if (typed === code) { ok(done, host); }
        else { typed = ''; AU.Audio.play('deny'); msg(host, 'WRONG CODE — try again'); }
      } else if (typed.length < len) typed += k;
      out.textContent = typed;
      if (typed === code) { ok(done, host); }
    };
    g.appendChild(b);
  });
  msg(host, ctx.mini === 'safe' ? 'Enter the combination' : 'Enter the ID code shown above');
};

/* 3. SWIPE CARD ------------------------------------------- */
E.swipe = function (host, ctx, done) {
  var c = canvas(host, 380, 200);
  var g = c.getContext('2d');
  var cardX = 20, dragging = false, startT = 0, startX = 0;
  function draw(state) {
    g.fillStyle = '#0a1224'; g.fillRect(0, 0, 380, 200);
    g.fillStyle = '#2b3140'; g.fillRect(0, 60, 380, 50);
    g.fillStyle = '#7f92b8'; g.font = 'bold 13px Arial'; g.textAlign = 'center';
    g.fillText('SWIPE SLOWLY  →', 190, 40);
    g.fillStyle = '#F5C842'; g.fillRect(cardX, 118, 110, 66);
    g.fillStyle = '#2b3140'; g.fillRect(cardX + 8, 128, 40, 12);
    g.fillStyle = '#7f5f00'; g.fillRect(cardX + 8, 150, 90, 8);
    if (state) { g.fillStyle = state === 'ok' ? '#50EF39' : '#ff5555';
      g.font = 'bold 22px Arial'; g.fillText(state === 'ok' ? 'ACCEPTED' : (state === 'fast' ? 'TOO FAST' : 'TOO SLOW'), 190, 90); }
  }
  draw();
  c.addEventListener('pointerdown', function (e) {
    var p = pointerPos(c, e);
    if (p.y > 110 && p.x > cardX - 20 && p.x < cardX + 130) {
      dragging = true; startT = performance.now(); startX = p.x;
    }
  });
  c.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var p = pointerPos(c, e);
    cardX = Math.max(0, Math.min(300, p.x - 55));
    draw();
  });
  function up() {
    if (!dragging) return;
    dragging = false;
    var dt = (performance.now() - startT) / 1000;
    if (cardX < 250) { cardX = 20; draw(); return; }
    var speed = 260 / Math.max(0.01, dt);
    if (speed > 700) { draw('fast'); AU.Audio.play('deny'); setTimeout(function () { cardX = 20; draw(); }, 700); }
    else if (speed < 120) { draw('slow'); AU.Audio.play('deny'); setTimeout(function () { cardX = 20; draw(); }, 700); }
    else { draw('ok'); ok(done, host); }
  }
  c.addEventListener('pointerup', up);
  c.addEventListener('pointerleave', up);
  msg(host, ctx.mini === 'keys' ? 'Insert the keys — steady does it' : 'Swipe the card at a steady pace');
};

/* 4. HOLD TO FILL ----------------------------------------- */
E.holdFill = function (host, ctx, done) {
  var f = bar(host);
  var p = 0, holding = false;
  var b = el('button', 'au-btn green big', ctx.holdLabel || 'HOLD');
  b.style.marginTop = '14px';
  host.appendChild(b);
  function on() { holding = true; } function off() { holding = false; }
  b.addEventListener('pointerdown', on);
  window.addEventListener('pointerup', off);
  b.addEventListener('pointerleave', off);
  var iv = setInterval(function () {
    if (holding) { p = Math.min(1, p + 0.022); if (Math.random() < 0.2) AU.Audio.play('taskStep'); }
    else p = Math.max(0, p - 0.012);
    f.style.width = (p * 100) + '%';
    if (p >= 1) { clearInterval(iv); window.removeEventListener('pointerup', off); ok(done, host); }
  }, 30);
  ctx.cleanup = function () { clearInterval(iv); window.removeEventListener('pointerup', off); };
  msg(host, ctx.holdHint || 'Press and hold to fill');
};

/* 5. SLIDERS ---------------------------------------------- */
E.sliders = function (host, ctx, done) {
  var n = ctx.sliderCount || 3;
  var targets = [], vals = [];
  var wrap = el('div'); host.appendChild(wrap);
  var rows = [];
  for (var i = 0; i < n; i++) {
    targets.push(20 + rnd(60));
    vals.push(rnd(100));
    var row = el('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;margin:10px 0;';
    var track = el('div');
    track.style.cssText = 'position:relative;width:280px;height:26px;background:#08101f;border:3px solid #0b1226;border-radius:8px;';
    var zone = el('div');
    zone.style.cssText = 'position:absolute;top:0;bottom:0;background:rgba(80,239,57,.28);border-left:2px solid #50EF39;border-right:2px solid #50EF39;';
    zone.style.left = (targets[i] - 5) + '%'; zone.style.width = '10%';
    var knob = el('div');
    knob.style.cssText = 'position:absolute;top:-3px;width:20px;height:30px;background:#F5C842;border:3px solid #0b1226;border-radius:5px;cursor:grab;';
    knob.style.left = 'calc(' + vals[i] + '% - 10px)';
    track.appendChild(zone); track.appendChild(knob);
    row.appendChild(track);
    var tick = el('span', null, '✕'); tick.style.color = '#ff6b6b';
    row.appendChild(tick);
    wrap.appendChild(row);
    rows.push({ track: track, knob: knob, tick: tick, i: i });
  }
  function check() {
    var all = true;
    rows.forEach(function (r) {
      var good = Math.abs(vals[r.i] - targets[r.i]) < 5;
      r.tick.textContent = good ? '✓' : '✕';
      r.tick.style.color = good ? '#50EF39' : '#ff6b6b';
      if (!good) all = false;
    });
    if (all) ok(done, host);
  }
  rows.forEach(function (r) {
    var drag = false;
    function move(e) {
      if (!drag) return;
      var rect = r.track.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      var v = Math.max(0, Math.min(100, (t.clientX - rect.left) / rect.width * 100));
      vals[r.i] = v;
      r.knob.style.left = 'calc(' + v + '% - 10px)';
      check();
    }
    r.knob.addEventListener('pointerdown', function (e) { drag = true; e.preventDefault(); });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', function () { drag = false; });
    ctx.cleanupExtra = function () { window.removeEventListener('pointermove', move); };
  });
  check();
  msg(host, ctx.sliderHint || 'Align every slider with the green zone');
};

/* 6. SIMON ------------------------------------------------ */
E.simon = function (host, ctx, done) {
  var cols = ['#C51111', '#F5C842', '#2E6BE6', '#50EF39', '#ED54BA'];
  var g = grid(host, 5, 10);
  var cells = [];
  cols.forEach(function (c, i) {
    var cell = el('div', 'tg-cell');
    cell.style.background = c; cell.style.filter = 'brightness(.45)';
    cell.dataset.i = i;
    g.appendChild(cell); cells.push(cell);
  });
  var seq = [], step = 0, round = 0, accepting = false;
  function flash(i, t) {
    cells[i].style.filter = 'brightness(1.6)';
    AU.Audio.play('taskStep');
    setTimeout(function () { cells[i].style.filter = 'brightness(.45)'; }, t || 320);
  }
  function nextRound() {
    round++;
    if (round > 5) { ok(done, host); return; }
    seq.push(rnd(5)); step = 0; accepting = false;
    msg(host, 'Watch the sequence… (' + round + '/5)');
    seq.forEach(function (v, i) { setTimeout(function () { flash(v); }, 420 * i + 400); });
    setTimeout(function () { accepting = true; msg(host, 'Repeat the sequence'); }, 420 * seq.length + 500);
  }
  cells.forEach(function (cell, i) {
    cell.onclick = function () {
      if (!accepting) return;
      flash(i, 160);
      if (seq[step] === i) {
        step++;
        if (step >= seq.length) { accepting = false; setTimeout(nextRound, 520); }
      } else { AU.Audio.play('deny'); seq = []; round = 0; msg(host, 'Wrong! Restarting…'); setTimeout(nextRound, 700); }
    };
  });
  nextRound();
};

/* 7. CLICK IN ORDER --------------------------------------- */
E.clickOrder = function (host, ctx, done) {
  var n = ctx.count || 10;
  var c = canvas(host, 380, 300);
  var g = c.getContext('2d');
  var pts = [], next = 1;
  for (var i = 1; i <= n; i++) {
    for (var t = 0; t < 60; t++) {
      var p = { n: i, x: 34 + Math.random() * 312, y: 34 + Math.random() * 232, r: 22 };
      var okp = true;
      for (var j = 0; j < pts.length; j++)
        if (Math.hypot(pts[j].x - p.x, pts[j].y - p.y) < 54) { okp = false; break; }
      if (okp) { pts.push(p); break; }
      if (t === 59) pts.push(p);
    }
  }
  function draw() {
    g.fillStyle = '#08101f'; g.fillRect(0, 0, 380, 300);
    pts.forEach(function (p) {
      g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7);
      g.fillStyle = p.n < next ? '#1FA84A' : '#33415f'; g.fill();
      g.strokeStyle = '#0b1226'; g.lineWidth = 3; g.stroke();
      g.fillStyle = '#fff'; g.font = 'bold 18px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(p.n, p.x, p.y);
    });
  }
  draw();
  c.onclick = function (e) {
    var p = pointerPos(c, e);
    for (var i = 0; i < pts.length; i++) {
      if (Math.hypot(pts[i].x - p.x, pts[i].y - p.y) < pts[i].r + 4) {
        if (pts[i].n === next) { next++; AU.Audio.play('taskStep'); draw();
          if (next > n) ok(done, host); }
        else AU.Audio.play('deny');
        return;
      }
    }
  };
  msg(host, ctx.orderHint || 'Click the numbers in order');
};

/* 8. TOGGLES ---------------------------------------------- */
E.toggles = function (host, ctx, done) {
  var n = ctx.toggleCount || 6;
  var g = grid(host, Math.min(n, 6), 10);
  var state = [], cells = [];
  for (var i = 0; i < n; i++) {
    state.push(Math.random() < 0.5);
    var cell = el('div', 'tg-cell', state[i] ? '⬆' : '⬇');
    if (state[i]) cell.classList.add('on');
    (function (i, cell) {
      cell.onclick = function () {
        state[i] = !state[i];
        cell.textContent = state[i] ? '⬆' : '⬇';
        cell.classList.toggle('on', state[i]);
        AU.Audio.play('taskStep');
        if (state.every(function (s) { return s; })) ok(done, host);
      };
    })(i, cell);
    g.appendChild(cell); cells.push(cell);
  }
  if (state.every(function (s) { return s; })) state[0] = false, cells[0].classList.remove('on'), cells[0].textContent = '⬇';
  msg(host, ctx.toggleHint || 'Flip every switch up');
};

/* 9. TARGETS ---------------------------------------------- */
E.targets = function (host, ctx, done) {
  var need = ctx.targetCount || 20;
  var c = canvas(host, 420, 300);
  var g = c.getContext('2d');
  var objs = [], hit = 0, raf;
  function spawn() {
    objs.push({ x: Math.random() * 380 + 20, y: -20, vx: (Math.random() - 0.5) * 60,
                vy: 40 + Math.random() * 70, r: 12 + Math.random() * 10, a: Math.random() * 7 });
  }
  for (var i = 0; i < 5; i++) spawn();
  var last = performance.now();
  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    g.fillStyle = ctx.targetBg || '#050a16'; g.fillRect(0, 0, 420, 300);
    if (ctx.mini === 'fish') { g.fillStyle = '#0d3350'; g.fillRect(0, 0, 420, 300); }
    for (var i = objs.length - 1; i >= 0; i--) {
      var o = objs[i];
      o.x += o.vx * dt; o.y += o.vy * dt; o.a += dt * 2;
      if (o.y > 320 || o.x < -30 || o.x > 450) { objs.splice(i, 1); spawn(); continue; }
      g.save(); g.translate(o.x, o.y); g.rotate(o.a);
      g.fillStyle = ctx.targetColor || '#8a7f6a';
      g.beginPath();
      for (var k = 0; k < 7; k++) {
        var ang = k / 7 * Math.PI * 2, rr = o.r * (0.75 + ((k * 37) % 10) / 30);
        g[k ? 'lineTo' : 'moveTo'](Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      g.closePath(); g.fill();
      g.strokeStyle = '#00000066'; g.lineWidth = 2; g.stroke();
      g.restore();
    }
    g.fillStyle = '#fff'; g.font = 'bold 16px Arial'; g.textAlign = 'left';
    g.fillText(hit + ' / ' + need, 12, 24);
    /* crosshair */
    if (mouse) {
      g.strokeStyle = '#50EF39'; g.lineWidth = 2;
      g.beginPath(); g.arc(mouse.x, mouse.y, 16, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(mouse.x - 22, mouse.y); g.lineTo(mouse.x + 22, mouse.y);
      g.moveTo(mouse.x, mouse.y - 22); g.lineTo(mouse.x, mouse.y + 22); g.stroke();
    }
    if (hit < need) raf = requestAnimationFrame(loop);
  }
  var mouse = null;
  c.addEventListener('pointermove', function (e) { mouse = pointerPos(c, e); });
  c.addEventListener('pointerdown', function (e) {
    var p = pointerPos(c, e);
    for (var i = objs.length - 1; i >= 0; i--) {
      if (Math.hypot(objs[i].x - p.x, objs[i].y - p.y) < objs[i].r + 8) {
        objs.splice(i, 1); spawn(); hit++;
        AU.Audio.play('taskStep');
        if (hit >= need) { cancelAnimationFrame(raf); ok(done, host); }
        return;
      }
    }
  });
  raf = requestAnimationFrame(loop);
  ctx.cleanup = function () { cancelAnimationFrame(raf); };
  msg(host, ctx.targetHint || 'Shoot down the asteroids');
};

/* 10. SCANNER (visual) ------------------------------------ */
E.scan = function (host, ctx, done) {
  var c = canvas(host, 300, 320);
  var g = c.getContext('2d');
  var t0 = performance.now(), raf, DUR = 8000;
  var img = new Image();
  img.src = AU.Models.snapshot(ctx.look || { color: 'red' }, 200, 240);
  function loop(t) {
    var p = Math.min(1, (t - t0) / DUR);
    g.fillStyle = '#071426'; g.fillRect(0, 0, 300, 320);
    g.strokeStyle = '#1c3a5c'; g.lineWidth = 2;
    for (var i = 0; i < 8; i++) { g.beginPath(); g.moveTo(0, i * 40); g.lineTo(300, i * 40); g.stroke(); }
    if (img.complete) g.drawImage(img, 50, 40, 200, 240);
    var y = 40 + 240 * ((t / 900) % 1);
    var grd = g.createLinearGradient(0, y - 30, 0, y + 30);
    grd.addColorStop(0, 'rgba(56,254,220,0)'); grd.addColorStop(0.5, 'rgba(56,254,220,.6)');
    grd.addColorStop(1, 'rgba(56,254,220,0)');
    g.fillStyle = grd; g.fillRect(0, y - 30, 300, 60);
    g.fillStyle = '#7dffb0'; g.font = 'bold 15px Arial'; g.textAlign = 'center';
    g.fillText('SCANNING… ' + Math.round(p * 100) + '%', 150, 305);
    if (p < 1) raf = requestAnimationFrame(loop);
    else ok(done, host);
  }
  AU.Audio.play('scan');
  raf = requestAnimationFrame(loop);
  ctx.cleanup = function () { cancelAnimationFrame(raf); };
  msg(host, 'Hold still — MedScan in progress');
};

/* 11. UPLOAD / PROGRESS ----------------------------------- */
E.progress = function (host, ctx, done) {
  var f = bar(host);
  var label = el('div', 'tg-msg', ''); host.appendChild(label);
  var b = el('button', 'au-btn blue', ctx.progressLabel || 'START');
  b.style.marginTop = '12px'; host.appendChild(b);
  var running = false, p = 0;
  b.onclick = function () {
    if (running) return;
    running = true; b.disabled = true;
    AU.Audio.play('click');
    var iv = setInterval(function () {
      p += 0.012 + Math.random() * 0.01;
      f.style.width = Math.min(100, p * 100) + '%';
      label.textContent = Math.round(Math.min(1, p) * 100) + '%';
      if (p >= 1) { clearInterval(iv); ok(done, host); }
    }, 40);
    ctx.cleanup = function () { clearInterval(iv); };
  };
  msg(host, ctx.progressHint || 'Press start and wait for the transfer');
};

/* 12. SORT INTO BINS -------------------------------------- */
E.sort = function (host, ctx, done) {
  var kinds = ctx.sortKinds || [{ n: 'A', c: '#C51111' }, { n: 'B', c: '#2E6BE6' }, { n: 'C', c: '#F5C842' }];
  var items = [];
  for (var i = 0; i < 6; i++) items.push(rnd(kinds.length));
  var wrap = el('div'); wrap.style.cssText = 'display:flex;flex-direction:column;gap:14px;align-items:center;';
  var tray = el('div'); tray.style.cssText = 'display:flex;gap:8px;min-height:60px;';
  var bins = el('div'); bins.style.cssText = 'display:flex;gap:14px;';
  wrap.appendChild(tray); wrap.appendChild(bins); host.appendChild(wrap);
  var left = items.length;
  var binEls = kinds.map(function (k, i) {
    var b = el('div', null, k.n);
    b.style.cssText = 'width:86px;height:76px;border:4px dashed ' + k.c + ';border-radius:10px;display:flex;align-items:center;justify-content:center;color:' + k.c + ';font-size:22px;';
    b.dataset.k = i; bins.appendChild(b); return b;
  });
  items.forEach(function (k, idx) {
    var it = el('div', null, kinds[k].n);
    it.style.cssText = 'width:50px;height:50px;background:' + kinds[k].c + ';border:3px solid #0b1226;border-radius:8px;cursor:grab;display:flex;align-items:center;justify-content:center;color:#fff;';
    it.draggable = false; it.dataset.k = k;
    var drag = false, ox = 0, oy = 0;
    it.addEventListener('pointerdown', function (e) {
      drag = true; it.style.position = 'fixed'; it.style.zIndex = 99; it.style.pointerEvents = 'none';
      ox = e.clientX; oy = e.clientY; move(e); e.preventDefault();
    });
    function move(e) {
      if (!drag) return;
      it.style.left = (e.clientX - 25) + 'px'; it.style.top = (e.clientY - 25) + 'px';
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', function (e) {
      if (!drag) return;
      drag = false; it.style.pointerEvents = '';
      var target = document.elementFromPoint(e.clientX, e.clientY);
      if (target && target.dataset && target.dataset.k === it.dataset.k) {
        it.remove(); left--; AU.Audio.play('taskStep');
        if (left === 0) ok(done, host);
      } else { it.style.position = ''; it.style.left = ''; it.style.top = ''; AU.Audio.play('deny'); }
    });
    tray.appendChild(it);
  });
  msg(host, ctx.sortHint || 'Drag each item into the matching bin');
};

/* 13. DIAL ------------------------------------------------ */
E.dial = function (host, ctx, done) {
  var need = ctx.dialCount || 1, doneN = 0;
  var c = canvas(host, 300, 300);
  var g = c.getContext('2d');
  var target = Math.random() * Math.PI * 2, ang = target + 1.6 + Math.random() * 3;
  var drag = false;
  function draw() {
    g.fillStyle = '#08101f'; g.fillRect(0, 0, 300, 300);
    g.strokeStyle = '#33415f'; g.lineWidth = 14;
    g.beginPath(); g.arc(150, 150, 100, 0, 7); g.stroke();
    g.strokeStyle = '#50EF39'; g.lineWidth = 16;
    g.beginPath(); g.arc(150, 150, 100, target - 0.18, target + 0.18); g.stroke();
    g.strokeStyle = '#F5C842'; g.lineWidth = 8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(150, 150);
    g.lineTo(150 + Math.cos(ang) * 92, 150 + Math.sin(ang) * 92); g.stroke();
    g.fillStyle = '#9AA5B4'; g.beginPath(); g.arc(150, 150, 18, 0, 7); g.fill();
    g.fillStyle = '#cfe0ff'; g.font = 'bold 14px Arial'; g.textAlign = 'center';
    g.fillText(doneN + ' / ' + need, 150, 285);
  }
  draw();
  function setAng(e) {
    var p = pointerPos(c, e);
    ang = Math.atan2(p.y - 150, p.x - 150);
    draw();
    var d = Math.abs(((ang - target + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    if (d > Math.PI - 0.18) {
      doneN++; AU.Audio.play('taskStep');
      if (doneN >= need) { ok(done, host); return; }
      target = Math.random() * Math.PI * 2; draw();
    }
  }
  c.addEventListener('pointerdown', function (e) { drag = true; setAng(e); });
  c.addEventListener('pointermove', function (e) { if (drag) setAng(e); });
  window.addEventListener('pointerup', function () { drag = false; });
  msg(host, ctx.dialHint || 'Turn the valve to the green mark');
};

/* 14. LEAVES / DEBRIS ------------------------------------- */
E.leaves = function (host, ctx, done) {
  var c = canvas(host, 380, 300);
  var g = c.getContext('2d');
  var leaves = [];
  for (var i = 0; i < 8; i++)
    leaves.push({ x: 60 + Math.random() * 260, y: 60 + Math.random() * 180,
                  a: Math.random() * 7, s: 18 + Math.random() * 10, held: false });
  var held = null;
  function draw() {
    g.fillStyle = '#0b1a24'; g.fillRect(0, 0, 380, 300);
    g.fillStyle = '#123'; g.fillRect(0, 250, 380, 50);
    g.fillStyle = '#1c3a4c'; g.beginPath(); g.ellipse(190, 150, 140, 110, 0, 0, 7); g.fill();
    g.strokeStyle = '#2b5a72'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#50EF39'; g.font = 'bold 13px Arial'; g.textAlign = 'center';
    g.fillText('DRAG THE LEAVES DOWN OUT OF THE FILTER', 190, 275);
    leaves.forEach(function (L) {
      g.save(); g.translate(L.x, L.y); g.rotate(L.a);
      g.fillStyle = ctx.leafColor || '#3f7d2f';
      g.beginPath(); g.ellipse(0, 0, L.s, L.s * 0.5, 0, 0, 7); g.fill();
      g.strokeStyle = '#26521d'; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.moveTo(-L.s, 0); g.lineTo(L.s, 0); g.stroke();
      g.restore();
    });
  }
  draw();
  c.addEventListener('pointerdown', function (e) {
    var p = pointerPos(c, e);
    for (var i = leaves.length - 1; i >= 0; i--)
      if (Math.hypot(leaves[i].x - p.x, leaves[i].y - p.y) < leaves[i].s) { held = leaves[i]; return; }
  });
  c.addEventListener('pointermove', function (e) {
    if (!held) return;
    var p = pointerPos(c, e); held.x = p.x; held.y = p.y; draw();
  });
  c.addEventListener('pointerup', function () {
    if (held && held.y > 252) {
      leaves.splice(leaves.indexOf(held), 1);
      AU.Audio.play('taskStep');
      if (!leaves.length) { held = null; draw(); ok(done, host); return; }
    }
    held = null; draw();
  });
  msg(host, ctx.leafHint || 'Drag every leaf into the chute below');
};

/* 15. TIMING BAR ------------------------------------------ */
E.timing = function (host, ctx, done) {
  var need = ctx.timingCount || 3, hits = 0;
  var c = canvas(host, 380, 140);
  var g = c.getContext('2d');
  var x = 0, dir = 1, speed = 230, raf, zone = 150 + Math.random() * 100, zw = 60;
  var last = performance.now();
  function loop(t) {
    var dt = (t - last) / 1000; last = t;
    x += dir * speed * dt;
    if (x > 360) { x = 360; dir = -1; } if (x < 20) { x = 20; dir = 1; }
    g.fillStyle = '#08101f'; g.fillRect(0, 0, 380, 140);
    g.fillStyle = 'rgba(80,239,57,.3)'; g.fillRect(zone, 30, zw, 60);
    g.strokeStyle = '#50EF39'; g.lineWidth = 3; g.strokeRect(zone, 30, zw, 60);
    g.fillStyle = '#F5C842'; g.fillRect(x - 4, 20, 8, 80);
    g.fillStyle = '#cfe0ff'; g.font = 'bold 14px Arial'; g.textAlign = 'center';
    g.fillText(hits + ' / ' + need, 190, 125);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  var b = el('button', 'au-btn yellow', ctx.timingLabel || 'LOCK');
  b.style.marginTop = '12px'; host.appendChild(b);
  b.onclick = function () {
    if (x > zone && x < zone + zw) {
      hits++; AU.Audio.play('taskStep');
      zone = 60 + Math.random() * 250; zw = Math.max(34, zw - 6); speed += 30;
      if (hits >= need) { cancelAnimationFrame(raf); ok(done, host); }
    } else { AU.Audio.play('deny'); hits = Math.max(0, hits - 1); }
  };
  ctx.cleanup = function () { cancelAnimationFrame(raf); };
  msg(host, ctx.timingHint || 'Lock the marker inside the green band');
};

/* 16. INSPECT SAMPLE -------------------------------------- */
E.sample = function (host, ctx, done) {
  var g = grid(host, 5, 8);
  var cells = [], bad = rnd(5), phase = 0;
  for (var i = 0; i < 5; i++) {
    var c = el('div', 'tg-cell', '');
    c.style.background = '#33415f';
    (function (i, c) {
      c.onclick = function () {
        if (phase !== 2) return;
        if (i === bad) { c.classList.add('hot'); ok(done, host); }
        else { AU.Audio.play('deny'); msg(host, 'Wrong sample'); }
      };
    })(i, c);
    g.appendChild(c); cells.push(c);
  }
  var b = el('button', 'au-btn green', 'START ANALYSIS');
  b.style.marginTop = '12px'; host.appendChild(b);
  b.onclick = function () {
    if (phase) return;
    phase = 1; b.disabled = true;
    msg(host, 'Analysing…');
    var i = 0;
    var iv = setInterval(function () {
      cells[i % 5].style.background = '#1FA84A';
      AU.Audio.play('taskStep');
      i++;
      if (i > 14) {
        clearInterval(iv);
        cells.forEach(function (c, k) { c.style.background = k === bad ? '#D01F1F' : '#1FA84A'; });
        phase = 2; msg(host, 'Report the anomalous sample');
      }
    }, 260);
    ctx.cleanup = function () { clearInterval(iv); };
  };
  msg(host, 'Start the analysis, then report the odd sample');
};

/* 17. CHART / PATH ---------------------------------------- */
E.chart = function (host, ctx, done) {
  var c = canvas(host, 400, 300);
  var g = c.getContext('2d');
  var pts = [], n = ctx.chartPts || 5;
  for (var i = 0; i < n; i++)
    pts.push({ x: 40 + (320 / (n - 1)) * i + (Math.random() - 0.5) * 40,
               y: 60 + Math.random() * 180, hit: i === 0 });
  var next = 1, drawing = false, trail = [];
  function draw() {
    g.fillStyle = '#050c1c'; g.fillRect(0, 0, 400, 300);
    for (var s = 0; s < 40; s++) {
      g.fillStyle = 'rgba(255,255,255,' + (0.15 + Math.random() * 0.1) + ')';
      g.fillRect((s * 97) % 400, (s * 61) % 300, 1.5, 1.5);
    }
    g.strokeStyle = '#2b5a72'; g.lineWidth = 2; g.setLineDash([6, 6]);
    g.beginPath();
    pts.forEach(function (p, i) { g[i ? 'lineTo' : 'moveTo'](p.x, p.y); });
    g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#F5C842'; g.lineWidth = 4; g.beginPath();
    trail.forEach(function (p, i) { g[i ? 'lineTo' : 'moveTo'](p.x, p.y); });
    g.stroke();
    pts.forEach(function (p, i) {
      g.beginPath(); g.arc(p.x, p.y, 14, 0, 7);
      g.fillStyle = p.hit ? '#1FA84A' : (i === next ? '#F5C842' : '#33415f'); g.fill();
      g.strokeStyle = '#0b1226'; g.lineWidth = 3; g.stroke();
    });
  }
  draw();
  c.addEventListener('pointerdown', function (e) {
    var p = pointerPos(c, e);
    if (Math.hypot(p.x - pts[0].x, p.y - pts[0].y) < 20) { drawing = true; trail = [p]; }
  });
  c.addEventListener('pointermove', function (e) {
    if (!drawing) return;
    var p = pointerPos(c, e); trail.push(p);
    if (next < pts.length && Math.hypot(p.x - pts[next].x, p.y - pts[next].y) < 20) {
      pts[next].hit = true; next++; AU.Audio.play('taskStep');
      if (next >= pts.length) { drawing = false; draw(); ok(done, host); return; }
    }
    draw();
  });
  c.addEventListener('pointerup', function () {
    if (drawing && next < pts.length) { drawing = false; trail = []; draw(); }
  });
  msg(host, ctx.chartHint || 'Drag from the first node through every waypoint');
};

/* 18. STACK / ASSEMBLY ------------------------------------ */
E.stack = function (host, ctx, done) {
  var order = ctx.stackOrder || ['Bottom Bun', 'Patty', 'Cheese', 'Lettuce', 'Top Bun'];
  var colors = ctx.stackColors || ['#C89B5C', '#6B4226', '#F5C842', '#50EF39', '#D9A55C'];
  var next = 0;
  var view = el('div');
  view.style.cssText = 'width:220px;min-height:180px;display:flex;flex-direction:column-reverse;align-items:center;justify-content:flex-start;gap:3px;background:#08101f;border:3px solid #0b1226;border-radius:10px;padding:10px;';
  host.appendChild(view);
  var btns = el('div');
  btns.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin-top:12px;';
  host.appendChild(btns);
  shuffle(order.map(function (o, i) { return i; })).forEach(function (i) {
    var b = el('button', 'au-btn small', order[i]);
    b.style.background = colors[i]; b.style.color = '#1a1a1a';
    b.onclick = function () {
      if (i === next) {
        var layer = el('div');
        layer.style.cssText = 'width:170px;height:24px;border-radius:8px;background:' + colors[i] + ';border:2px solid #00000055;';
        view.appendChild(layer);
        b.disabled = true; next++;
        AU.Audio.play('taskStep');
        if (next >= order.length) ok(done, host);
      } else { AU.Audio.play('deny'); msg(host, 'Wrong layer — start with ' + order[next]); }
    };
    btns.appendChild(b);
  });
  msg(host, ctx.stackHint || 'Assemble in the right order, bottom first');
};

/* 19. CLICK ALL ------------------------------------------- */
E.clickAll = function (host, ctx, done) {
  var n = ctx.allCount || 7, left = n;
  var c = canvas(host, 380, 280);
  var g = c.getContext('2d');
  var items = [];
  for (var i = 0; i < n; i++)
    items.push({ x: 40 + Math.random() * 300, y: 40 + Math.random() * 200, r: 20 + Math.random() * 8, a: Math.random() * 7 });
  function draw() {
    g.fillStyle = ctx.allBg || '#0e1a2c'; g.fillRect(0, 0, 380, 280);
    items.forEach(function (o) {
      g.save(); g.translate(o.x, o.y); g.rotate(o.a);
      g.fillStyle = ctx.allColor || '#D6E0F0';
      g.fillRect(-o.r, -o.r * 0.6, o.r * 2, o.r * 1.2);
      g.strokeStyle = '#00000055'; g.lineWidth = 2;
      g.strokeRect(-o.r, -o.r * 0.6, o.r * 2, o.r * 1.2);
      g.restore();
    });
    g.fillStyle = '#cfe0ff'; g.font = 'bold 14px Arial'; g.textAlign = 'left';
    g.fillText(ctx.allLabel || 'Remaining: ' + left, 12, 22);
  }
  draw();
  c.onclick = function (e) {
    var p = pointerPos(c, e);
    for (var i = items.length - 1; i >= 0; i--) {
      if (Math.abs(items[i].x - p.x) < items[i].r + 4 && Math.abs(items[i].y - p.y) < items[i].r) {
        items.splice(i, 1); left--; AU.Audio.play('taskStep'); draw();
        if (!left) ok(done, host);
        return;
      }
    }
  };
  msg(host, ctx.allHint || 'Click every item to collect it');
};

/* 20. SHIELDS (hex grid, visual) --------------------------- */
E.shields = function (host, ctx, done) {
  var c = canvas(host, 340, 320);
  var g = c.getContext('2d');
  var cells = [], R = 34;
  for (var q = -2; q <= 2; q++) for (var r = -2; r <= 2; r++) {
    if (Math.abs(q + r) > 2) continue;
    cells.push({ q: q, r: r, on: Math.random() < 0.45 });
  }
  function pos(cl) {
    return { x: 170 + R * 1.5 * cl.q, y: 160 + R * Math.sqrt(3) * (cl.r + cl.q / 2) };
  }
  function draw() {
    g.fillStyle = '#061423'; g.fillRect(0, 0, 340, 320);
    cells.forEach(function (cl) {
      var p = pos(cl);
      g.beginPath();
      for (var i = 0; i < 6; i++) {
        var a = i / 6 * Math.PI * 2;
        g[i ? 'lineTo' : 'moveTo'](p.x + Math.cos(a) * (R - 3), p.y + Math.sin(a) * (R - 3));
      }
      g.closePath();
      g.fillStyle = cl.on ? '#38FEDC' : '#22354a'; g.fill();
      g.strokeStyle = '#0b1226'; g.lineWidth = 3; g.stroke();
    });
  }
  draw();
  c.onclick = function (e) {
    var p = pointerPos(c, e);
    for (var i = 0; i < cells.length; i++) {
      var cp = pos(cells[i]);
      if (Math.hypot(cp.x - p.x, cp.y - p.y) < R - 4) {
        if (!cells[i].on) { cells[i].on = true; AU.Audio.play('taskStep'); draw(); }
        break;
      }
    }
    if (cells.every(function (cl) { return cl.on; })) ok(done, host);
  };
  if (cells.every(function (cl) { return cl.on; })) cells[0].on = false, draw();
  msg(host, 'Tap every shield segment to prime it');
};

/* 21. TEMPERATURE ----------------------------------------- */
E.temperature = function (host, ctx, done) {
  var target = ctx.tempTarget != null ? ctx.tempTarget : (Math.random() < 0.5 ? -93.3 : 21.5);
  var cur = target + (Math.random() * 40 - 20);
  var readout = el('div', 'tg-display', cur.toFixed(1) + '°');
  host.appendChild(readout);
  var row = el('div'); row.style.cssText = 'display:flex;gap:10px;justify-content:center;margin-top:8px;';
  host.appendChild(row);
  [['−', -1], ['+', 1]].forEach(function (p) {
    var b = el('button', 'au-btn', p[0]);
    b.style.width = '90px';
    var iv = null;
    function step() { cur += p[1] * 0.4; update(); }
    b.addEventListener('pointerdown', function () { step(); iv = setInterval(step, 60); });
    ['pointerup', 'pointerleave'].forEach(function (ev) {
      b.addEventListener(ev, function () { clearInterval(iv); });
    });
    row.appendChild(b);
  });
  function update() {
    readout.textContent = cur.toFixed(1) + '°';
    var d = Math.abs(cur - target);
    readout.style.color = d < 0.5 ? '#50EF39' : (d < 4 ? '#F5C842' : '#7dffb0');
    if (d < 0.35) ok(done, host);
  }
  update();
  msg(host, 'Set the gauge to ' + target.toFixed(1) + '°');
};

/* 22. DIVERT POWER ---------------------------------------- */
E.divert = function (host, ctx, done) {
  if (ctx.step === 1 || ctx.acceptStep) {
    /* accepting end: pull the lever */
    var f = bar(host);
    var b = el('button', 'au-btn yellow big', 'ACCEPT POWER');
    b.style.marginTop = '14px'; host.appendChild(b);
    var p = 0, hold = false;
    b.addEventListener('pointerdown', function () { hold = true; });
    window.addEventListener('pointerup', function () { hold = false; });
    var iv = setInterval(function () {
      p = hold ? Math.min(1, p + 0.03) : Math.max(0, p - 0.02);
      f.style.width = p * 100 + '%';
      if (p >= 1) { clearInterval(iv); ok(done, host); }
    }, 30);
    ctx.cleanup = function () { clearInterval(iv); };
    msg(host, 'Hold the lever to accept diverted power');
    return;
  }
  var target = ctx.divertRoom || 'Reactor';
  var rooms = ctx.divertList || ['Reactor', 'Navigation', 'Security', 'O2', 'Shields', 'Weapons', 'Comms'];
  var g = grid(host, 2, 8);
  rooms.forEach(function (rn) {
    var cell = el('div', 'tg-cell', '');
    cell.style.cssText += 'width:150px;font-size:12px;letter-spacing:1px;';
    cell.textContent = rn.toUpperCase();
    cell.onclick = function () {
      if (rn === target) { cell.classList.add('on'); ok(done, host); }
      else { AU.Audio.play('deny'); msg(host, 'Wrong breaker'); }
    };
    g.appendChild(cell);
  });
  msg(host, 'Divert power to ' + target.toUpperCase());
};

/* 23. MANNEQUIN ------------------------------------------- */
E.mannequin = function (host, ctx, done) {
  var slots = ['HAT', 'TOP', 'LEGS'];
  var placed = {};
  var wrap = el('div'); wrap.style.cssText = 'display:flex;gap:22px;align-items:center;';
  host.appendChild(wrap);
  var fig = el('div');
  fig.style.cssText = 'width:130px;height:220px;background:#0d1526;border:3px solid #0b1226;border-radius:12px;position:relative;';
  wrap.appendChild(fig);
  var body = el('div');
  body.style.cssText = 'position:absolute;left:25px;top:60px;width:80px;height:110px;background:#6b7280;border-radius:38px 38px 16px 16px;';
  fig.appendChild(body);
  var zones = {};
  slots.forEach(function (s, i) {
    var z = el('div', null, s);
    z.style.cssText = 'position:absolute;left:25px;width:80px;height:44px;border:3px dashed #4a5566;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#7f92b8;font-size:11px;top:' + (16 + i * 66) + 'px;';
    z.dataset.slot = s; fig.appendChild(z); zones[s] = z;
  });
  var tray = el('div');
  tray.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
  wrap.appendChild(tray);
  shuffle(slots.slice()).forEach(function (s) {
    var it = el('div', null, s);
    it.style.cssText = 'width:96px;height:44px;background:#2E6BE6;border:3px solid #0b1226;border-radius:8px;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:grab;';
    it.dataset.slot = s;
    var drag = false;
    it.addEventListener('pointerdown', function (e) {
      drag = true; it.style.position = 'fixed'; it.style.zIndex = 99; it.style.pointerEvents = 'none';
      it.style.left = (e.clientX - 48) + 'px'; it.style.top = (e.clientY - 22) + 'px';
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      it.style.left = (e.clientX - 48) + 'px'; it.style.top = (e.clientY - 22) + 'px';
    });
    window.addEventListener('pointerup', function (e) {
      if (!drag) return;
      drag = false; it.style.pointerEvents = '';
      var t = document.elementFromPoint(e.clientX, e.clientY);
      if (t && t.dataset && t.dataset.slot === s) {
        t.style.background = '#2E6BE6'; t.style.borderStyle = 'solid'; t.style.color = '#fff';
        it.remove(); placed[s] = 1; AU.Audio.play('taskStep');
        if (Object.keys(placed).length === slots.length) ok(done, host);
      } else { it.style.position = ''; it.style.left = ''; it.style.top = ''; AU.Audio.play('deny'); }
    });
    tray.appendChild(it);
  });
  msg(host, 'Drag each garment onto the mannequin');
};

/* 24. PHOTOS (timed 3-phase) ------------------------------ */
E.photos = function (host, ctx, done) {
  var phases = ctx.photoPhases || ['DIP IN DEVELOPER', 'WAIT FOR DEVELOP', 'HANG TO DRY'];
  var i = 0;
  var f = bar(host);
  var b = el('button', 'au-btn blue big', phases[0]);
  b.style.marginTop = '14px'; host.appendChild(b);
  b.onclick = function () {
    b.disabled = true;
    var p = 0;
    AU.Audio.play('click');
    var iv = setInterval(function () {
      p += 0.03; f.style.width = p * 100 + '%';
      if (p >= 1) {
        clearInterval(iv); i++;
        if (i >= phases.length) { ok(done, host); return; }
        f.style.width = '0%'; b.textContent = phases[i]; b.disabled = false;
      }
    }, 40);
    ctx.cleanup = function () { clearInterval(iv); };
  };
  msg(host, 'Follow the steps in order');
};

/* 25. CRITTER / CATCH ------------------------------------- */
E.critter = function (host, ctx, done) {
  var c = canvas(host, 380, 280);
  var g = c.getContext('2d');
  var x = 190, y = 140, vx = 90, vy = 70, caught = 0, need = 3, raf;
  var last = performance.now();
  function loop(t) {
    var dt = Math.min(0.05, (t - last) / 1000); last = t;
    x += vx * dt; y += vy * dt;
    if (x < 24 || x > 356) vx *= -1;
    if (y < 24 || y > 256) vy *= -1;
    g.fillStyle = '#16301f'; g.fillRect(0, 0, 380, 280);
    for (var i = 0; i < 12; i++) {
      g.fillStyle = '#1f4429';
      g.beginPath(); g.ellipse((i * 89) % 380, (i * 53) % 280, 22, 10, i, 0, 7); g.fill();
    }
    g.fillStyle = '#F5C842';
    g.beginPath(); g.ellipse(x, y, 20, 15, 0, 0, 7); g.fill();
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.arc(x + 7, y - 4, 3.5, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 14px Arial'; g.textAlign = 'left';
    g.fillText(caught + ' / ' + need, 12, 22);
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);
  c.onclick = function (e) {
    var p = pointerPos(c, e);
    if (Math.hypot(p.x - x, p.y - y) < 24) {
      caught++; AU.Audio.play('taskStep');
      vx *= 1.28; vy *= 1.28;
      x = 40 + Math.random() * 300; y = 40 + Math.random() * 200;
      if (caught >= need) { cancelAnimationFrame(raf); ok(done, host); }
    }
  };
  ctx.cleanup = function () { cancelAnimationFrame(raf); };
  msg(host, ctx.critterHint || 'Catch the critter — it gets faster');
};

/* ========================================================
   TASK → ENGINE MAP (with per-task flavour)
======================================================== */
var MINI = {
  wires:      { title: 'Fix Wiring', engine: 'wires' },
  keypad:     { title: 'Enter ID Code', engine: 'keypad' },
  safe:       { title: 'Unlock Safe', engine: 'keypad', opts: { mini: 'safe' } },
  swipe:      { title: 'Swipe Card', engine: 'swipe' },
  keys:       { title: 'Insert Keys', engine: 'swipe', opts: { mini: 'keys' } },
  align:      { title: 'Align Engine Output', engine: 'sliders', opts: { sliderCount: 1, sliderHint: 'Centre the engine output' } },
  calibrate:  { title: 'Calibrate Distributor', engine: 'timing', opts: { timingCount: 3, timingLabel: 'CALIBRATE' } },
  steering:   { title: 'Stabilize Steering', engine: 'chart', opts: { chartPts: 4, chartHint: 'Steer through the course markers' } },
  chart:      { title: 'Chart Course', engine: 'chart', opts: { chartPts: 6 } },
  manifolds:  { title: 'Unlock Manifolds', engine: 'clickOrder', opts: { count: 10 } },
  artifact:   { title: 'Assemble Artifact', engine: 'clickOrder', opts: { count: 6, orderHint: 'Fit the fragments together in order' } },
  simon:      { title: 'Start Reactor', engine: 'simon' },
  breakers:   { title: 'Reset Breakers', engine: 'toggles', opts: { toggleCount: 5, toggleHint: 'Reset every breaker' } },
  divert:     { title: 'Divert Power', engine: 'divert' },
  wifi:       { title: 'Reboot Wifi', engine: 'toggles', opts: { toggleCount: 4, toggleHint: 'Bring every node online' } },
  fans:       { title: 'Start Fans', engine: 'toggles', opts: { toggleCount: 4, toggleHint: 'Spin up the ventilation fans' } },
  parts:      { title: 'Replace Parts', engine: 'toggles', opts: { toggleCount: 6, toggleHint: 'Seat every replacement part' } },
  asteroids:  { title: 'Clear Asteroids', engine: 'targets', opts: { targetCount: 20 } },
  fish:       { title: 'Catch Fish', engine: 'targets',
                opts: { targetCount: 8, targetColor: '#7FE8FF', targetHint: 'Net the fish as they swim past', mini: 'fish' } },
  scan:       { title: 'Submit Scan', engine: 'scan' },
  upload:     { title: 'Download Data', engine: 'progress', opts: { progressLabel: 'DOWNLOAD', progressHint: 'Download the data, then take it to Admin' } },
  process:    { title: 'Process Data', engine: 'progress', opts: { progressLabel: 'PROCESS' } },
  diagnostics:{ title: 'Run Diagnostics', engine: 'progress', opts: { progressLabel: 'RUN DIAGNOSTIC' } },
  antenna:    { title: 'Fix Antenna', engine: 'progress', opts: { progressLabel: 'REALIGN DISH' } },
  sort:       { title: 'Sort Samples', engine: 'sort' },
  waterways:  { title: 'Open Waterways', engine: 'dial', opts: { dialCount: 2, dialHint: 'Open the waterway valve' } },
  drill:      { title: 'Repair Drill', engine: 'dial', opts: { dialCount: 3, dialHint: 'Tighten every drill bolt' } },
  leaves:     { title: 'Clean O2 Filter', engine: 'leaves' },
  garbage:    { title: 'Empty Garbage', engine: 'holdFill', opts: { holdLabel: 'PULL LEVER', holdHint: 'Hold the lever to dump the garbage' } },
  fuel:       { title: 'Fuel Engines', engine: 'holdFill', opts: { holdLabel: 'HOLD NOZZLE', holdHint: 'Hold to transfer fuel' } },
  water:      { title: 'Water Plants', engine: 'holdFill', opts: { holdLabel: 'POUR', holdHint: 'Hold to water the plants' } },
  waterjug:   { title: 'Replace Water Jug', engine: 'holdFill', opts: { holdLabel: 'LIFT JUG', holdHint: 'Hold to swap the jug' } },
  canisters:  { title: 'Fill Canisters', engine: 'holdFill', opts: { holdLabel: 'FILL', holdHint: 'Hold to fill the canisters' } },
  chop:       { title: 'Chop Wood', engine: 'holdFill', opts: { holdLabel: 'CHOP', holdHint: 'Hold to chop the log' } },
  winch:      { title: 'Hoist Supplies', engine: 'holdFill', opts: { holdLabel: 'CRANK', holdHint: 'Hold to hoist the crate' } },
  toilet:     { title: 'Clean Toilet', engine: 'holdFill', opts: { holdLabel: 'SCRUB', holdHint: 'Hold to scrub' } },
  shower:     { title: 'Fix Shower', engine: 'sliders', opts: { sliderCount: 2, sliderHint: 'Balance hot and cold' } },
  tapes:      { title: 'Rewind Tapes', engine: 'holdFill', opts: { holdLabel: 'REWIND', holdHint: 'Hold to rewind the tape' } },
  marshmallow:{ title: 'Roast Marshmallow', engine: 'timing', opts: { timingCount: 2, timingLabel: 'PULL OUT', timingHint: 'Pull it out while it is golden' } },
  tree:       { title: 'Monitor Tree', engine: 'timing', opts: { timingCount: 3, timingLabel: 'LOG READING' } },
  weather:    { title: 'Measure Weather', engine: 'timing', opts: { timingCount: 2, timingLabel: 'RECORD' } },
  temperature:{ title: 'Record Temperature', engine: 'temperature' },
  sample:     { title: 'Inspect Sample', engine: 'sample' },
  photos:     { title: 'Develop Photos', engine: 'photos' },
  shields:    { title: 'Prime Shields', engine: 'shields' },
  towels:     { title: 'Pick Up Towels', engine: 'clickAll', opts: { allCount: 7, allColor: '#EDE3D0', allBg: '#1d2b3a', allHint: 'Pick up every towel' } },
  sandcastle: { title: 'Build Sandcastle', engine: 'clickAll', opts: { allCount: 6, allColor: '#E7CFA1', allBg: '#2b3a4a', allHint: 'Pat every tower into shape' } },
  mannequin:  { title: 'Dress Mannequin', engine: 'mannequin' },
  burger:     { title: 'Make Burger', engine: 'stack' },
  ruby:       { title: 'Polish Ruby', engine: 'holdFill', opts: { holdLabel: 'POLISH', holdHint: 'Hold to buff the gem' } },
  critter:    { title: 'Help Critter', engine: 'critter' },
  vending:    { title: 'Buy Beverage', engine: 'clickOrder', opts: { count: 4, orderHint: 'Punch in the drink code' } }
};

/* ========================================================
   PUBLIC API
======================================================== */
var current = null;

AU.Tasks = {
  MINI: MINI,
  titleOf: function (mini) { return (MINI[mini] || {}).title || 'Task'; },

  /* Open a task step. ctx: { mini, name, step, steps, look, divertRoom, ... } */
  open: function (ctx, onDone, onCancel) {
    var ov = document.getElementById('overlay-task');
    ov.innerHTML = '';
    var def = MINI[ctx.mini] || MINI.wires;
    if (def.opts) for (var k in def.opts) if (ctx[k] == null) ctx[k] = def.opts[k];
    var panel = el('div', 'task-panel');
    var title = el('div', 'task-title', (ctx.name || def.title).toUpperCase() +
      (ctx.steps > 1 ? '  (' + (ctx.step + 1) + '/' + ctx.steps + ')' : ''));
    panel.appendChild(title);
    var body = el('div', 'task-body');
    var inner = el('div');
    inner.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
    body.appendChild(inner);
    panel.appendChild(body);
    var foot = el('div', 'task-foot');
    var close = el('button', 'au-btn small grey', 'CLOSE');
    foot.appendChild(close);
    panel.appendChild(foot);
    ov.appendChild(panel);
    ov.classList.add('on');
    current = ctx;

    function cleanup() {
      if (ctx.cleanup) try { ctx.cleanup(); } catch (e) {}
      if (ctx.cleanupExtra) try { ctx.cleanupExtra(); } catch (e) {}
      ov.classList.remove('on');
      ov.innerHTML = '';
      current = null;
    }
    close.onclick = function () { AU.Audio.play('back'); cleanup(); if (onCancel) onCancel(); };
    ctx.close = cleanup;

    E[def.engine](inner, ctx, function (success) {
      cleanup();
      if (success && onDone) onDone();
    });
  },

  isOpen: function () { return !!current; },
  closeCurrent: function () { if (current && current.close) current.close(); }
};

})(window.AU);
