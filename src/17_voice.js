/* =============================================================
 * BREACHPOINT — voice chat (WebRTC audio mesh + push to talk)
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M;

  function Voice(net, audio, settings) {
    this.net = net;
    this.audio = audio;
    this.settings = settings;
    this.stream = null;
    this.track = null;
    this.enabled = false;
    this.transmitting = false;
    this.peers = {};            // peerId -> {stream, el, src, gain, analyser, level, team}
    this.level = 0;
    this.error = null;
    this.requesting = false;
  }

  Voice.prototype.available = function () {
    return !!(root.navigator && root.navigator.mediaDevices && root.navigator.mediaDevices.getUserMedia);
  };

  Voice.prototype.request = function () {
    var self = this;
    if (this.stream || this.requesting) return Promise.resolve(this.stream);
    if (!this.available()) {
      this.error = 'Microphone access is not available in this browser.';
      return Promise.reject(new Error(this.error));
    }
    this.requesting = true;
    return root.navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true, noiseSuppression: true, autoGainControl: true,
        channelCount: 1, sampleRate: 48000
      }, video: false
    }).then(function (stream) {
      self.requesting = false;
      self.stream = stream;
      self.track = stream.getAudioTracks()[0];
      self.track.enabled = false;              // push-to-talk starts closed
      self.enabled = true;
      self.error = null;
      self.net.setMicTrack(self.track);
      self.setupLocalMeter();
      return stream;
    }).catch(function (err) {
      self.requesting = false;
      self.error = err && err.name === 'NotAllowedError'
        ? 'Microphone permission was denied.'
        : 'Could not open the microphone.';
      self.enabled = false;
      throw err;
    });
  };

  Voice.prototype.setupLocalMeter = function () {
    if (!this.audio.ready || !this.stream) return;
    var ctx = this.audio.ctx;
    try {
      this.localSrc = ctx.createMediaStreamSource(this.stream);
      this.localAnalyser = ctx.createAnalyser();
      this.localAnalyser.fftSize = 512;
      this.localBuf = new Uint8Array(this.localAnalyser.frequencyBinCount);
      this.localSrc.connect(this.localAnalyser);
      // deliberately not connected to any output — this is only a level meter
    } catch (e) { /* metering is optional */ }
  };

  Voice.prototype.setTransmitting = function (on) {
    if (!this.track) return;
    on = !!on;
    if (on === this.transmitting) return;
    this.transmitting = on;
    this.track.enabled = on;
  };

  /* Called when a remote audio stream arrives from a peer. */
  Voice.prototype.attachStream = function (peerId, stream) {
    if (!stream) return;
    var p = this.peers[peerId];
    if (p && p.stream === stream) return;
    this.detach(peerId);

    var entry = { stream: stream, level: 0, team: 0, muted: false };

    // Some browsers will not deliver remote audio until the stream is bound to
    // an element, even when it is routed through WebAudio.
    try {
      var el = root.document.createElement('audio');
      el.autoplay = true;
      el.muted = true;
      el.playsInline = true;
      el.srcObject = stream;
      el.style.display = 'none';
      root.document.body.appendChild(el);
      var pr = el.play();
      if (pr && pr.catch) pr.catch(function () {});
      entry.el = el;
    } catch (e) { /* fall through to WebAudio only */ }

    if (this.audio.ready) {
      try {
        var ctx = this.audio.ctx;
        entry.src = ctx.createMediaStreamSource(stream);
        entry.gain = ctx.createGain();
        entry.gain.gain.value = 1;
        entry.analyser = ctx.createAnalyser();
        entry.analyser.fftSize = 256;
        entry.buf = new Uint8Array(entry.analyser.frequencyBinCount);
        entry.src.connect(entry.gain);
        entry.gain.connect(this.audio.voice);
        entry.gain.connect(entry.analyser);
      } catch (e) { /* element playback still works as a fallback */ }
    }
    this.peers[peerId] = entry;
  };

  Voice.prototype.detach = function (peerId) {
    var p = this.peers[peerId];
    if (!p) return;
    try { if (p.src) p.src.disconnect(); } catch (e) {}
    try { if (p.gain) p.gain.disconnect(); } catch (e) {}
    if (p.el) { try { p.el.srcObject = null; p.el.remove(); } catch (e) {} }
    delete this.peers[peerId];
  };

  /* Mute peers you should not hear: enemies, or everyone if voice is off. */
  Voice.prototype.applyRouting = function (localTeam, teamOf, alive) {
    for (var id in this.peers) {
      var p = this.peers[id];
      var team = teamOf ? teamOf(id) : 0;
      p.team = team;
      var audible = this.settings.voiceEnabled;
      if (audible && this.settings.voiceTeamOnly && localTeam && team && team !== localTeam) audible = false;
      var vol = audible ? 1 : 0;
      if (p.gain) p.gain.gain.value = vol;
      if (p.el) p.el.muted = true;
      p.muted = !audible;
    }
  };

  Voice.prototype.update = function () {
    var i;
    if (this.localAnalyser && this.transmitting) {
      this.localAnalyser.getByteTimeDomainData(this.localBuf);
      var sum = 0;
      for (i = 0; i < this.localBuf.length; i += 4) {
        var v = (this.localBuf[i] - 128) / 128;
        sum += v * v;
      }
      this.level = Math.sqrt(sum / (this.localBuf.length / 4));
    } else this.level *= 0.85;

    for (var id in this.peers) {
      var p = this.peers[id];
      if (!p.analyser) continue;
      p.analyser.getByteTimeDomainData(p.buf);
      var s2 = 0;
      for (i = 0; i < p.buf.length; i += 4) {
        var v2 = (p.buf[i] - 128) / 128;
        s2 += v2 * v2;
      }
      p.level = Math.sqrt(s2 / (p.buf.length / 4));
    }
  };

  Voice.prototype.speaking = function (peerId) {
    var p = this.peers[peerId];
    return !!(p && !p.muted && p.level > 0.035);
  };

  Voice.prototype.stop = function () {
    this.setTransmitting(false);
    for (var id in this.peers) this.detach(id);
    if (this.stream) {
      var tracks = this.stream.getTracks();
      for (var i = 0; i < tracks.length; i++) tracks[i].stop();
    }
    this.stream = null; this.track = null; this.enabled = false;
  };

  CS.Voice = Voice;
})(typeof window !== 'undefined' ? window : globalThis);
