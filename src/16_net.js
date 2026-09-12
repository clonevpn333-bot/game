/* =============================================================
 * BREACHPOINT — networking
 *
 * Peer-to-peer over WebRTC with a host-authoritative model. The
 * only server involved is a public signalling broker used to
 * exchange SDP; once connected, game traffic is direct between
 * browsers. Room codes are short and human-readable.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var C = CS.C;

  var ICE = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ];

  var BROKERS = [
    { host: '0.peerjs.com', port: 443, path: '/', key: 'peerjs' },
    { host: 'peerjs.92k.de', port: 443, path: '/', key: 'peerjs' }
  ];

  function randToken() {
    return Math.random().toString(36).slice(2, 12);
  }

  /* ---------------------------------------------------------------
   * Signalling socket (PeerServer wire protocol)
   * ------------------------------------------------------------- */
  function Signal(id, handlers) {
    this.id = id;
    this.h = handlers || {};
    this.ws = null;
    this.brokerIndex = 0;
    this.alive = false;
    this.closed = false;
    this.hbTimer = null;
    this.queue = [];
  }

  Signal.prototype.open = function () {
    if (this.closed) return;
    var b = BROKERS[this.brokerIndex];
    if (!b) { this.fail('Could not reach any signalling server.'); return; }
    var url = 'wss://' + b.host + ':' + b.port + b.path + 'peerjs?key=' + b.key +
              '&id=' + encodeURIComponent(this.id) + '&token=' + randToken() + '&version=1.5.4';
    var self = this;
    var ws;
    try { ws = new WebSocket(url); }
    catch (e) { this.nextBroker('WebSocket blocked'); return; }
    this.ws = ws;

    var settled = false;
    var timeout = setTimeout(function () {
      if (!settled) { try { ws.close(); } catch (e) {} self.nextBroker('Signalling timed out'); }
    }, 9000);

    ws.onopen = function () { /* wait for OPEN before declaring success */ };
    ws.onmessage = function (ev) {
      var msg;
      try { msg = JSON.parse(ev.data); } catch (e) { return; }
      if (msg.type === 'OPEN') {
        settled = true; clearTimeout(timeout);
        self.alive = true;
        self.startHeartbeat();
        for (var i = 0; i < self.queue.length; i++) self.rawSend(self.queue[i]);
        self.queue.length = 0;
        if (self.h.onOpen) self.h.onOpen();
      } else if (msg.type === 'ID-TAKEN') {
        settled = true; clearTimeout(timeout);
        self.closed = true;
        try { ws.close(); } catch (e) {}
        if (self.h.onTaken) self.h.onTaken();
      } else if (msg.type === 'ERROR') {
        var m = (msg.payload && msg.payload.msg) || 'signalling error';
        if (/taken/i.test(m)) { self.closed = true; if (self.h.onTaken) self.h.onTaken(); return; }
        if (self.h.onError) self.h.onError(m);
      } else if (msg.type === 'OFFER' || msg.type === 'ANSWER' || msg.type === 'CANDIDATE') {
        if (self.h.onSignal) self.h.onSignal(msg.src, msg.type, msg.payload);
      } else if (msg.type === 'EXPIRE') {
        if (self.h.onExpire) self.h.onExpire(msg.src || (msg.payload && msg.payload.dst));
      } else if (msg.type === 'LEAVE') {
        if (self.h.onLeave) self.h.onLeave(msg.src);
      }
    };
    ws.onerror = function () { /* handled by onclose */ };
    ws.onclose = function () {
      clearTimeout(timeout);
      self.stopHeartbeat();
      if (self.closed) return;
      if (!settled) { self.nextBroker('Signalling connection failed'); return; }
      self.alive = false;
      if (self.h.onClosed) self.h.onClosed();
    };
  };

  Signal.prototype.nextBroker = function (why) {
    this.brokerIndex++;
    if (this.brokerIndex >= BROKERS.length) { this.fail(why); return; }
    this.open();
  };
  Signal.prototype.fail = function (why) {
    this.closed = true;
    if (this.h.onFail) this.h.onFail(why || 'Signalling unavailable');
  };
  Signal.prototype.startHeartbeat = function () {
    var self = this;
    this.stopHeartbeat();
    this.hbTimer = setInterval(function () {
      if (self.ws && self.ws.readyState === 1) self.ws.send(JSON.stringify({ type: 'HEARTBEAT' }));
    }, 4000);
  };
  Signal.prototype.stopHeartbeat = function () {
    if (this.hbTimer) { clearInterval(this.hbTimer); this.hbTimer = null; }
  };
  Signal.prototype.rawSend = function (obj) {
    if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
    else this.queue.push(obj);
  };
  Signal.prototype.send = function (dst, type, payload) {
    this.rawSend({ type: type, dst: dst, payload: payload });
  };
  Signal.prototype.close = function () {
    this.closed = true;
    this.stopHeartbeat();
    if (this.ws) { try { this.ws.close(); } catch (e) {} this.ws = null; }
  };

  /* ---------------------------------------------------------------
   * One peer connection
   * ------------------------------------------------------------- */
  function Link(net, remoteId, initiator) {
    this.net = net;
    this.id = remoteId;
    this.initiator = initiator;
    this.pc = null;
    this.dc = null;
    this.audioSender = null;
    this.audioStream = null;
    this.state = 'new';
    this.ping = 0;
    this.lastPong = 0;
    this.pendingCandidates = [];
    this.remoteSet = false;
    this.bytesIn = 0; this.bytesOut = 0;
    this.create();
  }

  Link.prototype.create = function () {
    var self = this, net = this.net;
    var PC = root.RTCPeerConnection || root.webkitRTCPeerConnection;
    if (!PC) { net.emit('error', 'WebRTC is not supported in this browser.'); return; }
    var pc = new PC({ iceServers: ICE, iceCandidatePoolSize: 2 });
    this.pc = pc;

    // An audio transceiver is created up front so voice can be switched on
    // later with replaceTrack, with no renegotiation.
    try { this.audioSender = pc.addTransceiver('audio', { direction: 'sendrecv' }).sender; }
    catch (e) { this.audioSender = null; }

    pc.onicecandidate = function (ev) {
      if (ev.candidate) net.signal.send(self.id, 'CANDIDATE', { candidate: ev.candidate, connectionId: 'bp' });
    };
    pc.oniceconnectionstatechange = function () {
      var s = pc.iceConnectionState;
      if (s === 'failed' || s === 'closed') self.fail('connection lost');
      else if (s === 'disconnected') {
        self.disconnectAt = Date.now();
        setTimeout(function () {
          if (pc.iceConnectionState === 'disconnected') self.fail('connection lost');
        }, 8000);
      }
    };
    pc.ontrack = function (ev) {
      self.remoteStream = ev.streams[0] || new MediaStream([ev.track]);
      net.emit('voiceStream', self.id, self.remoteStream);
    };

    if (this.initiator) {
      var dc = pc.createDataChannel('game', { ordered: false, maxRetransmits: 0 });
      this.bindChannel(dc);
      // a second, reliable channel for chat and lobby state
      var rc = pc.createDataChannel('reliable', { ordered: true });
      this.bindReliable(rc);
      pc.createOffer().then(function (offer) {
        return pc.setLocalDescription(offer);
      }).then(function () {
        net.signal.send(self.id, 'OFFER', { sdp: pc.localDescription, connectionId: 'bp', type: 'data' });
      }).catch(function (e) { self.fail('offer failed: ' + e.message); });
    } else {
      pc.ondatachannel = function (ev) {
        if (ev.channel.label === 'reliable') self.bindReliable(ev.channel);
        else self.bindChannel(ev.channel);
      };
    }
  };

  Link.prototype.bindChannel = function (dc) {
    var self = this;
    this.dc = dc;
    dc.binaryType = 'arraybuffer';
    dc.onopen = function () {
      self.state = 'open';
      self.net.emit('open', self.id);
    };
    dc.onclose = function () { self.fail('channel closed'); };
    dc.onmessage = function (ev) {
      self.bytesIn += (typeof ev.data === 'string' ? ev.data.length : ev.data.byteLength || 0);
      self.net.handleMessage(self, ev.data);
    };
  };
  Link.prototype.bindReliable = function (dc) {
    var self = this;
    this.rc = dc;
    dc.onmessage = function (ev) {
      self.bytesIn += (ev.data.length || 0);
      self.net.handleMessage(self, ev.data);
    };
  };

  Link.prototype.acceptOffer = function (payload) {
    var self = this, pc = this.pc;
    if (!pc) return;
    pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)).then(function () {
      self.remoteSet = true;
      self.flushCandidates();
      return pc.createAnswer();
    }).then(function (ans) {
      return pc.setLocalDescription(ans);
    }).then(function () {
      self.net.signal.send(self.id, 'ANSWER', { sdp: pc.localDescription, connectionId: 'bp', type: 'data' });
    }).catch(function (e) { self.fail('answer failed: ' + e.message); });
  };

  Link.prototype.acceptAnswer = function (payload) {
    var self = this;
    if (!this.pc) return;
    this.pc.setRemoteDescription(new RTCSessionDescription(payload.sdp)).then(function () {
      self.remoteSet = true;
      self.flushCandidates();
    }).catch(function (e) { self.fail('remote description failed: ' + e.message); });
  };

  Link.prototype.addCandidate = function (payload) {
    if (!this.pc || !payload.candidate) return;
    if (!this.remoteSet) { this.pendingCandidates.push(payload.candidate); return; }
    try { this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch (e) { /* stale candidate */ }
  };
  Link.prototype.flushCandidates = function () {
    for (var i = 0; i < this.pendingCandidates.length; i++) {
      try { this.pc.addIceCandidate(new RTCIceCandidate(this.pendingCandidates[i])); } catch (e) {}
    }
    this.pendingCandidates.length = 0;
  };

  Link.prototype.send = function (str, reliable) {
    var ch = reliable ? (this.rc || this.dc) : (this.dc || this.rc);
    if (!ch || ch.readyState !== 'open') return false;
    try { ch.send(str); this.bytesOut += str.length; return true; }
    catch (e) { return false; }
  };

  Link.prototype.setMicTrack = function (track) {
    if (!this.audioSender) return;
    try { this.audioSender.replaceTrack(track); } catch (e) { /* not negotiated yet */ }
  };

  Link.prototype.fail = function (why) {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.net.emit('close', this.id, why);
    this.close();
  };
  Link.prototype.close = function () {
    if (this.dc) { try { this.dc.close(); } catch (e) {} }
    if (this.rc) { try { this.rc.close(); } catch (e) {} }
    if (this.pc) { try { this.pc.close(); } catch (e) {} }
    this.dc = this.rc = this.pc = null;
  };

  /* ---------------------------------------------------------------
   * Net
   * ------------------------------------------------------------- */
  function Net() {
    this.links = {};
    this.signal = null;
    this.isHost = false;
    this.roomCode = null;
    this.selfId = null;
    this.handlers = {};
    this.micTrack = null;
    this.offline = false;
    this.statBytesIn = 0; this.statBytesOut = 0;
    this.lastStatTime = 0;
    this.rateIn = 0; this.rateOut = 0;
  }

  Net.prototype.on = function (ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return this; };
  Net.prototype.emit = function (ev) {
    var list = this.handlers[ev];
    if (!list) return;
    var args = Array.prototype.slice.call(arguments, 1);
    for (var i = 0; i < list.length; i++) list[i].apply(null, args);
  };

  Net.prototype.peerIdFor = function (code) { return C.PEER_PREFIX + code; };

  Net.prototype.host = function (code) {
    var self = this;
    this.isHost = true;
    this.roomCode = code;
    this.selfId = this.peerIdFor(code);
    this.signal = new Signal(this.selfId, {
      onOpen: function () { self.emit('ready', code); },
      onTaken: function () { self.emit('codeTaken', code); },
      onSignal: function (src, type, payload) { self.onSignal(src, type, payload); },
      onFail: function (why) { self.emit('error', why); },
      onClosed: function () { self.emit('signalLost'); },
      onError: function (m) { self.emit('warn', m); }
    });
    this.signal.open();
  };

  Net.prototype.join = function (code) {
    var self = this;
    this.isHost = false;
    this.roomCode = code;
    this.selfId = C.PEER_PREFIX + 'c' + randToken();
    this.hostId = this.peerIdFor(code);
    this.signal = new Signal(this.selfId, {
      onOpen: function () {
        var link = new Link(self, self.hostId, true);
        self.links[self.hostId] = link;
        self.emit('connecting', code);
        // if the host never answers, the room does not exist
        self.joinTimer = setTimeout(function () {
          if (!link.dc || link.dc.readyState !== 'open') {
            self.emit('joinFailed', 'No game found with code ' + code + '.');
            self.close();
          }
        }, 12000);
      },
      onSignal: function (src, type, payload) { self.onSignal(src, type, payload); },
      onExpire: function () { self.emit('joinFailed', 'No game found with code ' + code + '.'); },
      onFail: function (why) { self.emit('error', why); },
      onClosed: function () { self.emit('signalLost'); }
    });
    this.signal.open();
  };

  Net.prototype.onSignal = function (src, type, payload) {
    var link = this.links[src];
    if (type === 'OFFER') {
      if (!link) { link = new Link(this, src, false); this.links[src] = link; }
      link.acceptOffer(payload);
      if (this.micTrack) link.setMicTrack(this.micTrack);
    } else if (type === 'ANSWER') {
      if (link) link.acceptAnswer(payload);
    } else if (type === 'CANDIDATE') {
      if (link) link.addCandidate(payload);
    }
  };

  /* Voice mesh: everyone dials everyone, so audio never routes through the host. */
  Net.prototype.connectPeer = function (peerId) {
    if (peerId === this.selfId || this.links[peerId]) return;
    var link = new Link(this, peerId, true);
    this.links[peerId] = link;
    if (this.micTrack) link.setMicTrack(this.micTrack);
  };

  Net.prototype.handleMessage = function (link, data) {
    this.statBytesIn += (typeof data === 'string' ? data.length : (data.byteLength || 0));
    var msg;
    try { msg = JSON.parse(data); } catch (e) { return; }
    if (msg.t === 'ping') { link.send(JSON.stringify({ t: 'pong', s: msg.s }), false); return; }
    if (msg.t === 'pong') {
      link.ping = Math.max(0, Date.now() - msg.s);
      return;
    }
    this.emit('message', link.id, msg, link);
  };

  Net.prototype.send = function (peerId, msg, reliable) {
    var link = this.links[peerId];
    if (!link) return false;
    var str = JSON.stringify(msg);
    this.statBytesOut += str.length;
    return link.send(str, reliable);
  };

  Net.prototype.broadcast = function (msg, reliable, except) {
    var str = JSON.stringify(msg);
    for (var id in this.links) {
      if (id === except) continue;
      this.statBytesOut += str.length;
      this.links[id].send(str, reliable);
    }
  };

  Net.prototype.pingAll = function () {
    var now = Date.now();
    for (var id in this.links) {
      this.links[id].send(JSON.stringify({ t: 'ping', s: now }), false);
    }
    if (now - this.lastStatTime > 1000) {
      var dt = (now - this.lastStatTime) / 1000;
      this.rateIn = this.statBytesIn / dt; this.rateOut = this.statBytesOut / dt;
      this.statBytesIn = 0; this.statBytesOut = 0;
      this.lastStatTime = now;
    }
  };

  Net.prototype.pingOf = function (peerId) {
    var l = this.links[peerId];
    return l ? l.ping : 0;
  };

  Net.prototype.peerList = function () {
    var out = [];
    for (var id in this.links) if (this.links[id].state === 'open') out.push(id);
    return out;
  };

  Net.prototype.setMicTrack = function (track) {
    this.micTrack = track;
    for (var id in this.links) this.links[id].setMicTrack(track);
  };

  Net.prototype.dropPeer = function (peerId) {
    var l = this.links[peerId];
    if (l) { l.close(); delete this.links[peerId]; }
  };

  Net.prototype.close = function () {
    if (this.joinTimer) clearTimeout(this.joinTimer);
    for (var id in this.links) this.links[id].close();
    this.links = {};
    if (this.signal) this.signal.close();
    this.signal = null;
  };

  CS.Net = Net;
  CS.NET_ICE = ICE;
})(typeof window !== 'undefined' ? window : globalThis);
