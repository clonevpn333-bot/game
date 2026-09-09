/* ============================================================
   AMONG US 3D — MEETINGS
   Discussion timer, voting grid, text + quick chat, the Judge's
   Overrule, the Detective's Interrogate, and the ejection scene.
   ============================================================ */
(function (AU) {
'use strict';

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
function censor(s) {
  if (!AU.Save.p.client.censorChat) return s;
  var out = s;
  AU.CENSOR.forEach(function (w) {
    out = out.replace(new RegExp(w, 'gi'), function (m) { return m[0] + new Array(m.length).join('*'); });
  });
  return out;
}

var M = {
  open: false,
  phase: 'discussion',
  timer: 0,
  G: null,
  info: null,
  selected: null,
  voted: false,
  votes: {},           // voterId -> targetId | 'skip'
  chatLog: [],
  onVote: null,
  interrogationsLeft: 0,
  overruleUsed: false
};

/* ============================================================ */
M.start = function (G, info, opts) {
  M.G = G; M.info = info || {};
  M.open = true;
  M.phase = 'discussion';
  M.timer = G.settings.discussionTime;
  M.selected = null;
  M.voted = false;
  M.votes = {};
  M.chatLog = [];
  M.accusedId = null;
  var me = G.me();
  M.interrogationsLeft = (me && me.role === 'detective') ? (me.roleOpts.interrogations || 2) : 0;
  M.overruleUsed = false;
  render();
  document.getElementById('overlay-meeting').classList.add('on');
  AU.Audio.play('meeting');
};

M.stop = function () {
  M.open = false;
  document.getElementById('overlay-meeting').classList.remove('on');
  document.getElementById('overlay-meeting').innerHTML = '';
};

M.tick = function (dt) {
  if (!M.open) return;
  M.timer -= dt;
  var t = document.getElementById('meet-timer');
  if (t) t.textContent = (M.phase === 'discussion' ? 'Discuss ' : 'Vote ') + Math.max(0, Math.ceil(M.timer)) + 's';
  if (M.timer <= 0) {
    if (M.phase === 'discussion') {
      M.phase = 'voting';
      M.timer = M.G.settings.votingTime;
      render();
    } else if (!M.G.online || M.G.isHost) {
      M.finish();
    } else {
      M.timer = 1;   /* clients wait for the host's ruling */
    }
  }
};

M.finish = function () {
  if (M.onComplete) M.onComplete(M.votes);
};

/* ============================================================
   RENDER
   ============================================================ */
function render() {
  var G = M.G, ov = document.getElementById('overlay-meeting');
  ov.innerHTML = '';
  var panel = el('div', 'meet');

  /* header */
  var head = el('div', 'meet-head');
  var reporter = M.info.reporterId ? G.byId(M.info.reporterId) : null;
  if (reporter) {
    head.innerHTML = AU.Models.avatarImg(reporter.look, 58, 66, 'av') +
      '<div class="who">' + esc(reporter.name) + (M.info.isEmergency ? ' called a meeting' : ' found a body') + '</div>';
  } else {
    head.innerHTML = '<div class="who">EMERGENCY MEETING</div>';
  }
  var timer = el('div', 'meet-timer');
  timer.id = 'meet-timer';
  timer.textContent = (M.phase === 'discussion' ? 'Discuss ' : 'Vote ') + Math.ceil(M.timer) + 's';
  head.appendChild(timer);
  panel.appendChild(head);

  /* grid */
  var grid = el('div', 'meet-grid');
  var me = G.me();
  G.players.forEach(function (p) {
    var card = el('div', 'pcard' + (p.alive ? '' : ' dead') + (M.selected === p.id ? ' sel' : ''));
    var np = AU.cosmetic('nameplate', p.look.nameplate || 'none');
    card.innerHTML =
      AU.Models.avatarImg(p.look, 52, 60, 'av') +
      '<div class="nm">' + esc(p.name) +
        (p.id === (me && me.id) ? ' <span style="color:#7dffb0">(you)</span>' : '') +
        (p.alive ? '' : ' <span style="color:#ff8a8a">☠</span>') +
        '<div class="np" style="background:' + (np.css === 'transparent' ? 'none' : np.css) + ';">' +
        (np.id === 'none' ? '' : esc(np.name)) + '</div>' +
      '</div>';
    var votes = el('div', 'votes');
    votes.id = 'votes-' + p.id;
    card.appendChild(votes);

    if (M.phase === 'voting' && me && me.alive && !M.voted && p.alive) {
      var b = el('button', null, M.selected === p.id ? 'CONFIRM' : 'VOTE');
      if (M.selected === p.id) b.className = 'confirm';
      b.onclick = function () {
        AU.Audio.play('vote');
        if (M.selected === p.id) { castVote(p.id); }
        else { M.selected = p.id; render(); }
      };
      card.appendChild(b);
    }
    if (M.phase === 'discussion' && M.interrogationsLeft > 0 && p.alive && me && p.id !== me.id) {
      var ib = el('button', null, 'INTERROGATE');
      ib.style.background = '#7A3FD0';
      ib.onclick = function () { interrogate(p); };
      card.appendChild(ib);
    }
    grid.appendChild(card);
  });
  panel.appendChild(grid);

  /* foot: skip / judge overrule */
  var foot = el('div', 'meet-foot');
  if (M.phase === 'voting' && me && me.alive && !M.voted) {
    var skip = el('button', 'au-btn small grey', M.selected === 'skip' ? 'CONFIRM SKIP' : 'SKIP VOTE');
    skip.onclick = function () {
      AU.Audio.play('vote');
      if (M.selected === 'skip') castVote('skip');
      else { M.selected = 'skip'; render(); }
    };
    foot.appendChild(skip);
    if (me.role === 'judge' && !M.overruleUsed && M.selected && M.selected !== 'skip') {
      var ob = el('button', 'au-btn small yellow', 'OVERRULE');
      ob.title = 'Ignore all votes and eject this player. If they are innocent, you are ejected instead.';
      ob.onclick = function () { overrule(M.selected); };
      foot.appendChild(ob);
    }
  }
  if (M.voted) foot.appendChild(el('div', 'hint', 'Vote cast — waiting for the rest of the crew…'));
  panel.appendChild(foot);

  /* chat */
  var chat = el('div', 'meet-chat');
  var log = el('div', 'chat-log'); log.id = 'meet-chat-log';
  chat.appendChild(log);
  var row = el('div', 'chat-in');
  var input = el('input');
  input.id = 'meet-chat-input';
  input.maxLength = 120;
  input.placeholder = (me && me.alive) ? 'Type a message…' : 'Ghost chat (living players cannot see this)';
  input.onkeydown = function (e) {
    if (e.key === 'Enter' && input.value.trim()) {
      M.sendChat(input.value.trim());
      input.value = '';
    }
    e.stopPropagation();
  };
  var send = el('button', 'au-btn small blue', 'SEND');
  send.onclick = function () { if (input.value.trim()) { M.sendChat(input.value.trim()); input.value = ''; } };
  row.appendChild(input); row.appendChild(send);
  chat.appendChild(row);
  var qc = el('div', 'quickchat');
  var opts = (AU.Chat && AU.Chat.quickOptions) ? AU.Chat.quickOptions(G, M.info) : AU.QUICKCHAT;
  opts.forEach(function (q) {
    var b = el('button', null, q);
    b.onclick = function () { M.sendChat(q); };
    qc.appendChild(b);
  });
  chat.appendChild(qc);
  panel.appendChild(chat);

  ov.appendChild(panel);
  redrawChat();
  redrawVotes();
}

function castVote(target) {
  var me = M.G.me();
  M.voted = true;
  M.votes[me.id] = target;
  if (M.onVote) M.onVote(me.id, target);
  render();
}

function overrule(targetId) {
  var me = M.G.me();
  M.overruleUsed = true;
  M.voted = true;
  if (M.onOverrule) M.onOverrule(me.id, targetId);
}

function interrogate(p) {
  M.interrogationsLeft--;
  var G = M.G;
  var where = G.locationAt(p.id, M.info.killTime || (G.time - 5));
  M.addChat('DETECTIVE', p.name + ' was in ' + (where || 'an unknown place') + ' around the time of death.', '#B98CFF', true);
  render();
}

/* ============================================================
   CHAT
   ============================================================ */
M.sendChat = function (text) {
  var G = M.G, me = G.me();
  if (!me) return;
  var payload = { name: me.name, text: censor(text), color: AU.colorById(me.look.color).hex, ghost: !me.alive };
  if (M.onChat) M.onChat(payload);
  M.addChat(payload.name, payload.text, '#' + payload.color.toString(16).padStart(6, '0'), false, payload.ghost);
  AU.Audio.play('chat');
};
M.addChat = function (name, text, color, system, ghost) {
  M.chatLog.push({ name: name, text: text, color: color || '#cfe0ff', system: system, ghost: ghost });
  if (M.chatLog.length > 120) M.chatLog.shift();
  redrawChat();
};
function redrawChat() {
  var log = document.getElementById('meet-chat-log');
  if (!log) return;
  var me = M.G && M.G.me();
  var html = '';
  M.chatLog.forEach(function (c) {
    if (c.ghost && me && me.alive) return;         /* the living can't read ghost chat */
    html += '<div' + (c.ghost ? ' style="opacity:.75"' : '') + '><span class="who" style="color:' +
      c.color + '">' + esc(c.name) + (c.ghost ? ' 👻' : '') + ':</span> ' + esc(c.text) + '</div>';
  });
  log.innerHTML = html;
  log.scrollTop = log.scrollHeight;
}

/* ============================================================
   VOTE DISPLAY
   ============================================================ */
M.setVotes = function (votes) { M.votes = votes; redrawVotes(); };
M.noteVote = function (voterId, targetId) { M.votes[voterId] = targetId; redrawVotes(); };
function redrawVotes() {
  if (!M.G) return;
  var anon = M.G.settings.anonymousVotes;
  M.G.players.forEach(function (p) {
    var box = document.getElementById('votes-' + p.id);
    if (!box) return;
    var html = '';
    for (var voter in M.votes) {
      if (M.votes[voter] !== p.id) continue;
      var vp = M.G.byId(voter);
      var c = anon ? '#8397A7' : '#' + AU.colorById(vp ? vp.look.color : 'gray').hex.toString(16).padStart(6, '0');
      html += '<i style="background:' + c + '"></i>';
    }
    box.innerHTML = html;
  });
}

/* ============================================================
   EJECTION CUTSCENE
   ============================================================ */
M.ejectScene = function (G, ejectedId, confirmText, cb) {
  var ov = document.getElementById('overlay-eject');
  ov.innerHTML = '';
  var scene = el('div', 'eject-scene');
  ov.appendChild(scene);
  ov.classList.add('on');
  AU.Audio.play('eject');

  var W = window.innerWidth, H = window.innerHeight;
  var cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
  scene.appendChild(cv);
  var g = cv.getContext('2d');
  var stars = [];
  for (var i = 0; i < 160; i++)
    stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.8 + 0.3, s: 8 + Math.random() * 60 });

  var img = null;
  if (ejectedId) {
    var p = G.byId(ejectedId);
    if (p) { img = new Image(); img.src = AU.Models.snapshot(p.look, 220, 260); }
  }
  var text = el('div', 'eject-text');
  text.innerHTML = confirmText.main + '<div class="eject-sub">' + confirmText.sub + '</div>';
  scene.appendChild(text);

  var t0 = performance.now(), DUR = 5200, raf;
  function loop(t) {
    var e = (t - t0) / DUR;
    g.fillStyle = '#03050c'; g.fillRect(0, 0, W, H);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.x -= s.s * 0.016;
      if (s.x < 0) s.x = W;
      g.fillStyle = 'rgba(255,255,255,' + (0.35 + s.r / 3) + ')';
      g.fillRect(s.x, s.y, s.r, s.r);
    }
    /* a hazy planet in the background */
    var grd = g.createRadialGradient(W * 0.78, H * 0.72, 20, W * 0.78, H * 0.72, H * 0.55);
    grd.addColorStop(0, 'rgba(70,120,200,.55)');
    grd.addColorStop(1, 'rgba(10,20,45,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(W * 0.78, H * 0.72, H * 0.5, 0, 7); g.fill();

    if (img && img.complete) {
      var px = -240 + (W + 480) * Math.min(1, e * 1.15);
      var py = H * 0.42 + Math.sin(t / 700) * 26;
      g.save();
      g.translate(px, py);
      g.rotate(Math.sin(t / 900) * 0.4 + e * 2.2);
      g.drawImage(img, -110, -130, 220, 260);
      g.restore();
    }
    if (e < 1) raf = requestAnimationFrame(loop);
    else {
      cancelAnimationFrame(raf);
      ov.classList.remove('on');
      ov.innerHTML = '';
      if (cb) cb();
    }
  }
  raf = requestAnimationFrame(loop);
};

AU.Meeting = M;

})(window.AU);
