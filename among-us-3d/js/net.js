/* ============================================================
   AMONG US 3D — SERVERLESS MULTIPLAYER
   Peer-to-peer over WebRTC. Two transports:
     1) PeerJS public broker (room codes)  — the easy path
     2) Manual copy/paste SDP             — zero infrastructure
   The host is authoritative; clients send intents and receive
   filtered snapshots so roles never leak.
   Voice chat is a WebRTC audio mesh with proximity volume.
   ============================================================ */
(function (AU) {
'use strict';

var PREFIX = 'au3dv1-';
var CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCode() {
  var s = '';
  for (var i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

var Net = {
  mode: 'off',            // 'off' | 'host' | 'client'
  code: '',
  peer: null,
  selfId: 'local',
  conns: {},              // peerId -> { conn, name, id }
  hostConn: null,
  handlers: [],
  statusCb: null,
  micStream: null,
  micEnabled: false,
  calls: {},              // peerId -> mediaConnection
  audioEls: {},           // peerId -> <audio>
  gains: {},              // peerId -> GainNode-ish (we use element.volume)
  speaking: {},
  manual: null
};

function log(msg, kind) {
  if (Net.statusCb) Net.statusCb(msg, kind);
}
function emit(from, msg) {
  for (var i = 0; i < Net.handlers.length; i++) Net.handlers[i](from, msg);
}

/* ============================================================
   PEERJS TRANSPORT
   ============================================================ */
function ensurePeer(id, cb, err) {
  if (typeof window.Peer === 'undefined') { err('WebRTC library missing'); return; }
  var opts = { debug: 0, config: { iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ] } };
  var p = id ? new window.Peer(id, opts) : new window.Peer(opts);
  var settled = false;
  p.on('open', function (realId) { settled = true; cb(p, realId); });
  p.on('error', function (e) {
    if (!settled) { settled = true; err(e && e.type ? e.type : String(e)); }
    else log('Network error: ' + (e && e.type ? e.type : e), 'err');
  });
  setTimeout(function () { if (!settled) { settled = true; err('timeout'); } }, 12000);
  return p;
}

Net.host = function (name, maxPlayers, onReady, onError) {
  Net.leave();
  var code = makeCode();
  Net.mode = 'host';
  Net.code = code;
  Net.selfId = 'host';
  Net.maxPlayers = maxPlayers || 10;
  ensurePeer(PREFIX + code, function (p, realId) {
    Net.peer = p;
    p.on('connection', function (conn) {
      conn.on('open', function () {
        if (Object.keys(Net.conns).length + 1 >= Net.maxPlayers) {
          conn.send({ t: 'full' });
          setTimeout(function () { conn.close(); }, 300);
          return;
        }
        Net.conns[conn.peer] = { conn: conn, id: conn.peer, name: '?' };
        conn.on('data', function (d) { emit(conn.peer, d); });
        conn.on('close', function () {
          delete Net.conns[conn.peer];
          emit(conn.peer, { t: 'left' });
        });
        emit(conn.peer, { t: 'joined' });
      });
      conn.on('error', function () {});
    });
    p.on('call', function (call) { answerCall(call); });
    log('Room open. Code: ' + code, 'ok');
    if (onReady) onReady(code);
  }, function (e) {
    Net.mode = 'off';
    if (onError) onError(e);
  });
};

Net.join = function (code, name, onReady, onError) {
  Net.leave();
  Net.mode = 'client';
  Net.code = code.toUpperCase();
  ensurePeer(null, function (p, realId) {
    Net.peer = p;
    Net.selfId = realId;
    var conn = p.connect(PREFIX + Net.code, { reliable: true });
    var settled = false;
    conn.on('open', function () {
      settled = true;
      Net.hostConn = conn;
      conn.on('data', function (d) { emit('host', d); });
      conn.on('close', function () { emit('host', { t: 'hostleft' }); });
      log('Connected!', 'ok');
      if (onReady) onReady(realId);
    });
    conn.on('error', function (e) {
      if (!settled) { settled = true; if (onError) onError('connect failed'); }
    });
    p.on('call', function (call) { answerCall(call); });
    setTimeout(function () {
      if (!settled) { settled = true; if (onError) onError('no room with that code'); }
    }, 12000);
  }, function (e) {
    Net.mode = 'off';
    if (onError) onError(e);
  });
};

/* ============================================================
   MANUAL (BROKER-FREE) TRANSPORT — 1:1
   ============================================================ */
function rtcConfig() {
  return { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
}
function gatherComplete(pc) {
  return new Promise(function (res) {
    if (pc.iceGatheringState === 'complete') return res();
    function check() { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', check); res(); } }
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(res, 4000);
  });
}
function pack(obj) { return btoa(JSON.stringify(obj)).replace(/=+$/, ''); }
function unpack(str) { return JSON.parse(atob(str.trim())); }

Net.manualOffer = function (cb) {
  Net.leave();
  Net.mode = 'host'; Net.code = 'DIRECT'; Net.selfId = 'host';
  var pc = new RTCPeerConnection(rtcConfig());
  var dc = pc.createDataChannel('au3d', { ordered: true });
  wireManual(pc, dc, 'peer1');
  if (Net.micStream) Net.micStream.getTracks().forEach(function (t) { pc.addTrack(t, Net.micStream); });
  pc.createOffer().then(function (o) { return pc.setLocalDescription(o); })
    .then(function () { return gatherComplete(pc); })
    .then(function () { cb(pack(pc.localDescription)); });
  Net.manual = { pc: pc, dc: dc };
};
Net.manualAnswer = function (offerBlob, cb) {
  Net.leave();
  Net.mode = 'client'; Net.code = 'DIRECT'; Net.selfId = 'peer1';
  var pc = new RTCPeerConnection(rtcConfig());
  pc.ondatachannel = function (e) { wireManual(pc, e.channel, 'host'); Net.manual.dc = e.channel; };
  if (Net.micStream) Net.micStream.getTracks().forEach(function (t) { pc.addTrack(t, Net.micStream); });
  Net.manual = { pc: pc, dc: null };
  pc.setRemoteDescription(unpack(offerBlob))
    .then(function () { return pc.createAnswer(); })
    .then(function (a) { return pc.setLocalDescription(a); })
    .then(function () { return gatherComplete(pc); })
    .then(function () { cb(pack(pc.localDescription)); });
};
Net.manualAccept = function (answerBlob, cb) {
  if (!Net.manual) return cb(false);
  Net.manual.pc.setRemoteDescription(unpack(answerBlob)).then(function () { cb(true); },
    function () { cb(false); });
};
function wireManual(pc, dc, peerId) {
  dc.onopen = function () {
    if (Net.mode === 'host') {
      Net.conns[peerId] = { conn: { send: function (o) { dc.send(JSON.stringify(o)); } }, id: peerId, name: '?' };
      emit(peerId, { t: 'joined' });
    } else {
      Net.hostConn = { send: function (o) { dc.send(JSON.stringify(o)); } };
      emit('host', { t: 'connected' });
    }
    log('Direct connection established', 'ok');
  };
  dc.onmessage = function (e) { emit(Net.mode === 'host' ? peerId : 'host', JSON.parse(e.data)); };
  dc.onclose = function () { emit(Net.mode === 'host' ? peerId : 'host', Net.mode === 'host' ? { t: 'left' } : { t: 'hostleft' }); };
  pc.ontrack = function (ev) { attachRemoteAudio(peerId, ev.streams[0]); };
}

/* ============================================================
   MESSAGING
   ============================================================ */
Net.onMessage = function (fn) { Net.handlers.push(fn); };
Net.clearHandlers = function () { Net.handlers = []; };

Net.send = function (peerId, msg) {
  var c = Net.conns[peerId];
  if (c && c.conn) { try { c.conn.send(msg); } catch (e) {} }
};
Net.broadcast = function (msg) {
  for (var id in Net.conns) Net.send(id, msg);
};
Net.toHost = function (msg) {
  if (Net.hostConn) { try { Net.hostConn.send(msg); } catch (e) {} }
};
Net.peerIds = function () { return Object.keys(Net.conns); };
Net.count = function () { return Object.keys(Net.conns).length + 1; };

Net.leave = function () {
  for (var id in Net.calls) { try { Net.calls[id].close(); } catch (e) {} }
  Net.calls = {};
  for (var a in Net.audioEls) { try { Net.audioEls[a].remove(); } catch (e) {} }
  Net.audioEls = {};
  for (var c in Net.conns) { try { Net.conns[c].conn.close && Net.conns[c].conn.close(); } catch (e) {} }
  Net.conns = {};
  if (Net.hostConn && Net.hostConn.close) { try { Net.hostConn.close(); } catch (e) {} }
  Net.hostConn = null;
  if (Net.manual) { try { Net.manual.pc.close(); } catch (e) {} Net.manual = null; }
  if (Net.peer) { try { Net.peer.destroy(); } catch (e) {} Net.peer = null; }
  Net.mode = 'off'; Net.code = '';
};

/* ============================================================
   VOICE CHAT
   ============================================================ */
Net.requestMic = function (cb) {
  if (Net.micStream) { cb(true); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { cb(false); return; }
  navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false
  }).then(function (s) {
    Net.micStream = s;
    Net.micEnabled = true;
    setupLevelMeter(s);
    cb(true);
  }).catch(function () { cb(false); });
};

var levelCtx = null, levelAnalyser = null, levelData = null;
function setupLevelMeter(stream) {
  try {
    var ctx = AU.Audio.context();
    if (!ctx) return;
    var src = ctx.createMediaStreamSource(stream);
    levelAnalyser = ctx.createAnalyser();
    levelAnalyser.fftSize = 512;
    src.connect(levelAnalyser);
    levelData = new Uint8Array(levelAnalyser.frequencyBinCount);
  } catch (e) {}
}
Net.micLevel = function () {
  if (!levelAnalyser || !Net.micEnabled) return 0;
  levelAnalyser.getByteTimeDomainData(levelData);
  var sum = 0;
  for (var i = 0; i < levelData.length; i++) {
    var v = (levelData[i] - 128) / 128; sum += v * v;
  }
  return Math.sqrt(sum / levelData.length);
};
Net.setMicEnabled = function (on) {
  Net.micEnabled = on;
  if (Net.micStream) Net.micStream.getAudioTracks().forEach(function (t) { t.enabled = on; });
};

Net.callPeers = function () {
  if (!Net.peer || !Net.micStream) return;
  var ids = Net.mode === 'host' ? Object.keys(Net.conns) : [PREFIX + Net.code];
  ids.forEach(function (id) {
    if (Net.calls[id]) return;
    try {
      var call = Net.peer.call(id, Net.micStream);
      if (!call) return;
      Net.calls[id] = call;
      call.on('stream', function (s) { attachRemoteAudio(id, s); });
      call.on('close', function () { delete Net.calls[id]; });
    } catch (e) {}
  });
};
function answerCall(call) {
  if (Net.micStream) call.answer(Net.micStream);
  else call.answer();
  Net.calls[call.peer] = call;
  call.on('stream', function (s) { attachRemoteAudio(call.peer, s); });
  call.on('close', function () { delete Net.calls[call.peer]; });
}
function attachRemoteAudio(peerId, stream) {
  if (Net.audioEls[peerId]) { Net.audioEls[peerId].srcObject = stream; return; }
  var a = document.createElement('audio');
  a.autoplay = true; a.srcObject = stream; a.volume = 1;
  a.setAttribute('data-peer', peerId);
  document.getElementById('voice-audio').appendChild(a);
  Net.audioEls[peerId] = a;
  /* per-peer speaking meter */
  try {
    var ctx = AU.Audio.context();
    if (ctx) {
      var src = ctx.createMediaStreamSource(stream);
      var an = ctx.createAnalyser(); an.fftSize = 256;
      src.connect(an);
      var buf = new Uint8Array(an.frequencyBinCount);
      Net.speaking[peerId] = function () {
        an.getByteTimeDomainData(buf);
        var s = 0;
        for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; s += v * v; }
        return Math.sqrt(s / buf.length);
      };
    }
  } catch (e) {}
}
Net.setPeerVolume = function (peerId, vol) {
  var a = Net.audioEls[peerId];
  if (a) a.volume = Math.max(0, Math.min(1, vol));
};
Net.peerSpeaking = function (peerId) {
  var f = Net.speaking[peerId];
  return f ? f() > 0.045 : false;
};
Net.setStatusCb = function (fn) { Net.statusCb = fn; };

AU.Net = Net;

})(window.AU);
