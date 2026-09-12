/* =============================================================
 * BREACHPOINT — procedural audio
 *
 * Every sound is synthesised with WebAudio. That means no asset
 * downloads, instant load, and gunfire that can be tuned per
 * weapon instead of per sample.
 * ============================================================= */
(function (root) {
  'use strict';
  var CS = (root.CS = root.CS || {});
  var M = CS.M, C = CS.C;

  function Audio(settings) {
    this.settings = settings;
    this.ctx = null;
    this.ready = false;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
    this.world = null;
    this.muffle = 0;          // 0..1, raised by flashbangs and deafening blasts
    this.noise = null;
    this.voices = 0;
    this.maxVoices = 28;
    this.lastPlay = {};
  }

  Audio.prototype.init = function () {
    if (this.ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return false;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); }
    catch (e) { try { this.ctx = new AC(); } catch (e2) { return false; } }

    var ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.settings.masterVolume;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 22;
    this.comp.ratio.value = 8;
    this.comp.attack.value = 0.002;
    this.comp.release.value = 0.18;

    this.sfx = ctx.createGain(); this.sfx.gain.value = this.settings.sfxVolume;
    this.music = ctx.createGain(); this.music.gain.value = this.settings.musicVolume;
    this.voice = ctx.createGain(); this.voice.gain.value = this.settings.voiceVolume;

    // global muffle filter for flashbang / explosion deafening
    this.muffleFilter = ctx.createBiquadFilter();
    this.muffleFilter.type = 'lowpass';
    this.muffleFilter.frequency.value = 20000;

    this.sfx.connect(this.muffleFilter);
    this.muffleFilter.connect(this.comp);
    this.music.connect(this.comp);
    this.voice.connect(this.master);
    this.comp.connect(this.master);
    this.master.connect(ctx.destination);

    this.makeNoise();
    this.ready = true;
    return true;
  };

  Audio.prototype.resume = function () {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  };

  Audio.prototype.makeNoise = function () {
    var ctx = this.ctx, len = ctx.sampleRate * 2;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    // pink-ish noise for wind/fire beds
    var pb = ctx.createBuffer(1, len, ctx.sampleRate);
    var pd = pb.getChannelData(0);
    var b0 = 0, b1 = 0, b2 = 0;
    for (var j = 0; j < len; j++) {
      var white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      pd[j] = (b0 + b1 + b2 + white * 0.1848) * 0.22;
    }
    this.pink = pb;
  };

  Audio.prototype.setVolumes = function () {
    if (!this.ready) return;
    this.master.gain.value = this.settings.masterVolume;
    this.sfx.gain.value = this.settings.sfxVolume;
    this.music.gain.value = this.settings.musicVolume;
    this.voice.gain.value = this.settings.voiceVolume;
  };

  Audio.prototype.setListener = function (x, y, z, yaw, world) {
    this.listener.x = x; this.listener.y = y; this.listener.z = z; this.listener.yaw = yaw;
    if (world) this.world = world;
  };

  Audio.prototype.setMuffle = function (amount) {
    if (!this.ready) return;
    this.muffle = amount;
    var f = M.lerp(20000, 380, M.clamp(amount, 0, 1));
    this.muffleFilter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
  };

  /* Positional gain / pan / occlusion for a world-space source. */
  Audio.prototype.spatial = function (x, y, z, refDist, maxDist) {
    var L = this.listener;
    var dx = x - L.x, dy = y - L.y, dz = z - L.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDist) return null;
    var gain = refDist / (refDist + Math.max(0, dist - refDist) * 1.0);
    gain *= M.clamp(1 - dist / maxDist, 0, 1);
    if (gain < 0.004) return null;

    var pan = 0, muffleHz = 20000;
    if (dist > 0.15) {
      var rx = Math.sin(L.yaw), rz = Math.cos(L.yaw);        // listener right vector
      pan = M.clamp((dx * rx + dz * rz) / dist, -1, 1) * 0.92;
      var fx = Math.cos(L.yaw), fz = -Math.sin(L.yaw);
      var front = (dx * fx + dz * fz) / dist;
      if (front < 0) muffleHz = M.lerp(20000, 5200, -front * 0.55);   // behind you is duller
    }
    if (this.world && dist > 2.5) {
      if (!this.world.losWorld(L.x, L.y, L.z, x, y, z)) {
        gain *= 0.42;
        muffleHz = Math.min(muffleHz, 780);
      }
    }
    return { gain: gain, pan: pan, hz: muffleHz, dist: dist };
  };

  /* Build a source chain: [node] -> filter -> panner -> gain -> bus */
  Audio.prototype.chain = function (sp, bus) {
    var ctx = this.ctx;
    var g = ctx.createGain();
    var out = g;
    var filter = null;
    if (sp && sp.hz < 19000) {
      filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = sp.hz;
      filter.Q.value = 0.6;
    }
    var panner = null;
    if (sp && ctx.createStereoPanner) {
      panner = ctx.createStereoPanner();
      panner.pan.value = sp.pan;
    }
    var head = filter || g;
    if (filter) filter.connect(g);
    if (panner) { g.connect(panner); panner.connect(bus || this.sfx); }
    else g.connect(bus || this.sfx);
    return { head: head, gain: g, filter: filter, panner: panner };
  };

  Audio.prototype.noiseBurst = function (opts) {
    if (!this.ready || this.voices > this.maxVoices) return null;
    var ctx = this.ctx, t = ctx.currentTime + (opts.delay || 0);
    var src = ctx.createBufferSource();
    src.buffer = opts.pink ? this.pink : this.noise;
    src.loop = true;
    src.playbackRate.value = opts.rate || 1;

    var bp = ctx.createBiquadFilter();
    bp.type = opts.filterType || 'bandpass';
    bp.frequency.value = opts.freq || 1200;
    bp.Q.value = opts.q === undefined ? 0.9 : opts.q;
    if (opts.sweep) {
      bp.frequency.setValueAtTime(opts.freq, t);
      bp.frequency.exponentialRampToValueAtTime(Math.max(60, opts.sweep), t + (opts.decay || 0.2));
    }

    var ch = this.chain(opts.sp, opts.bus);
    var g = ch.gain;
    var peak = Math.max(0.0001, (opts.gain || 0.5) * (opts.sp ? opts.sp.gain : 1));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (opts.attack || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (opts.attack || 0.002) + (opts.decay || 0.2));

    src.connect(bp);
    bp.connect(ch.head);

    src.start(t, Math.random() * 1.5);
    var stopAt = t + (opts.attack || 0.002) + (opts.decay || 0.2) + 0.05;
    src.stop(stopAt);
    this.voices++;
    var self = this;
    src.onended = function () { self.voices--; try { src.disconnect(); bp.disconnect(); } catch (e) {} };
    return ch;
  };

  Audio.prototype.tone = function (opts) {
    if (!this.ready || this.voices > this.maxVoices) return null;
    var ctx = this.ctx, t = ctx.currentTime + (opts.delay || 0);
    var osc = ctx.createOscillator();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(opts.freq || 440, t);
    if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t + (opts.decay || 0.2));

    var ch = this.chain(opts.sp, opts.bus);
    var g = ch.gain;
    var peak = Math.max(0.0001, (opts.gain || 0.3) * (opts.sp ? opts.sp.gain : 1));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + (opts.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + (opts.attack || 0.004) + (opts.decay || 0.2));

    osc.connect(ch.head);
    osc.start(t);
    osc.stop(t + (opts.attack || 0.004) + (opts.decay || 0.2) + 0.03);
    this.voices++;
    var self = this;
    osc.onended = function () { self.voices--; try { osc.disconnect(); } catch (e) {} };
    return ch;
  };

  /* ---------------------------------------------------------------
   * Game sounds
   * ------------------------------------------------------------- */
  var CLASS_TONE = {
    pistol:  { freq: 1500, sweep: 380, decay: 0.16, body: 150, gain: 0.55, crackQ: 0.7 },
    smg:     { freq: 1750, sweep: 420, decay: 0.13, body: 165, gain: 0.5,  crackQ: 0.8 },
    rifle:   { freq: 1250, sweep: 300, decay: 0.22, body: 108, gain: 0.72, crackQ: 0.6 },
    sniper:  { freq: 950,  sweep: 210, decay: 0.34, body: 78,  gain: 0.95, crackQ: 0.5 },
    shotgun: { freq: 780,  sweep: 190, decay: 0.30, body: 88,  gain: 0.88, crackQ: 0.45 },
    heavy:   { freq: 1150, sweep: 280, decay: 0.20, body: 100, gain: 0.76, crackQ: 0.6 },
    knife:   { freq: 3200, sweep: 1400, decay: 0.07, body: 400, gain: 0.3, crackQ: 1.4 }
  };

  Audio.prototype.gunshot = function (weapon, x, y, z, isLocal) {
    if (!this.ready) return;
    var cls = CLASS_TONE[weapon.cls] || CLASS_TONE.rifle;
    var sp = isLocal ? { gain: 1, pan: 0, hz: 20000, dist: 0 } : this.spatial(x, y, z, 9, 120);
    if (!sp) return;
    var sil = weapon.silenced;
    var g = cls.gain * (sil ? 0.32 : 1) * (isLocal ? 0.62 : 1);

    // crack
    this.noiseBurst({
      sp: sp, gain: g, freq: sil ? cls.freq * 0.55 : cls.freq, sweep: sil ? cls.sweep * 0.5 : cls.sweep,
      decay: cls.decay * (sil ? 0.45 : 1), attack: 0.001, q: cls.crackQ, filterType: 'bandpass'
    });
    // body thump
    this.tone({
      sp: sp, gain: g * 0.8, freq: cls.body, to: cls.body * 0.42,
      decay: cls.decay * 1.25, type: 'triangle', attack: 0.001
    });
    if (!sil) {
      // high transient that gives the shot its snap
      this.noiseBurst({
        sp: sp, gain: g * 0.5, freq: 5200, sweep: 2400, decay: 0.045, attack: 0.0006,
        q: 0.5, filterType: 'highpass'
      });
      // distant tail — the "map echo" that makes gunfire locatable
      if (sp.dist > 12) {
        this.noiseBurst({
          sp: { gain: sp.gain * 0.5, pan: sp.pan * 0.4, hz: 1800, dist: sp.dist },
          gain: g * 0.42, freq: 480, sweep: 190, decay: 0.5, attack: 0.03, delay: 0.035, q: 0.4, pink: true
        });
      }
    }
  };

  Audio.prototype.bulletWhiz = function (x, y, z) {
    var sp = this.spatial(x, y, z, 3, 14);
    if (!sp) return;
    this.noiseBurst({ sp: sp, gain: 0.5, freq: 2400, sweep: 700, decay: 0.09, q: 2.5, attack: 0.004 });
  };

  Audio.prototype.impact = function (mat, x, y, z) {
    var surf = C.SURF[mat] || C.SURF.concrete;
    var sp = this.spatial(x, y, z, 5, 45);
    if (!sp) return;
    this.noiseBurst({
      sp: sp, gain: 0.30 * surf.hard, freq: 900 + surf.step * 1400, sweep: 260,
      decay: 0.09 + surf.hard * 0.05, q: 1.2, attack: 0.001
    });
    if (surf.hard > 1.0) this.tone({ sp: sp, gain: 0.16, freq: 2600 + Math.random() * 900, to: 1200, decay: 0.10, type: 'square' });
  };

  Audio.prototype.fleshHit = function (x, y, z, headshot, armor) {
    var sp = this.spatial(x, y, z, 6, 40);
    if (!sp) return;
    this.noiseBurst({ sp: sp, gain: 0.42, freq: headshot ? 520 : 340, sweep: 120, decay: 0.1, q: 0.8, attack: 0.001 });
    if (armor) this.noiseBurst({ sp: sp, gain: 0.3, freq: 3400, sweep: 1400, decay: 0.06, q: 1.4, filterType: 'highpass' });
    if (headshot) this.tone({ sp: sp, gain: 0.26, freq: 780, to: 300, decay: 0.12, type: 'square' });
  };

  Audio.prototype.footstep = function (surfName, x, y, z, volume) {
    var surf = C.SURF[surfName] || C.SURF.concrete;
    var sp = this.spatial(x, y, z, 4.5, 34);
    if (!sp) return;
    this.noiseBurst({
      sp: sp, gain: 0.36 * volume, freq: 300 + surf.step * 1500, sweep: 180 + surf.step * 400,
      decay: 0.075 + (1 - surf.step) * 0.05, q: 0.9, attack: 0.002
    });
    this.tone({ sp: sp, gain: 0.15 * volume, freq: 90 + surf.step * 60, to: 55, decay: 0.07, type: 'sine' });
  };

  Audio.prototype.local = function (kind) {
    if (!this.ready) return;
    var sp = { gain: 1, pan: 0, hz: 20000, dist: 0 };
    switch (kind) {
      case 'reloadStart': this.noiseBurst({ sp: sp, gain: 0.3, freq: 2600, sweep: 900, decay: 0.05, q: 1.6 }); break;
      case 'magOut':      this.noiseBurst({ sp: sp, gain: 0.34, freq: 1400, sweep: 500, decay: 0.08, q: 1.2 }); break;
      case 'magIn':       this.noiseBurst({ sp: sp, gain: 0.42, freq: 900, sweep: 260, decay: 0.09, q: 1.0 });
                          this.tone({ sp: sp, gain: 0.2, freq: 180, to: 90, decay: 0.07, type: 'square' }); break;
      case 'bolt':        this.noiseBurst({ sp: sp, gain: 0.4, freq: 1800, sweep: 700, decay: 0.10, q: 1.3 }); break;
      case 'switch':      this.noiseBurst({ sp: sp, gain: 0.26, freq: 2000, sweep: 800, decay: 0.07, q: 1.4 }); break;
      case 'dry':         this.noiseBurst({ sp: sp, gain: 0.32, freq: 3000, sweep: 1500, decay: 0.035, q: 2.2 }); break;
      case 'pickup':      this.tone({ sp: sp, gain: 0.22, freq: 620, to: 900, decay: 0.09, type: 'triangle' }); break;
      case 'buy':         this.tone({ sp: sp, gain: 0.22, freq: 880, to: 1320, decay: 0.10, type: 'triangle' });
                          this.tone({ sp: sp, gain: 0.14, freq: 1320, to: 1760, decay: 0.12, type: 'sine', delay: 0.06 }); break;
      case 'deny':        this.tone({ sp: sp, gain: 0.25, freq: 220, to: 140, decay: 0.16, type: 'square' }); break;
      case 'hitmarker':   this.tone({ sp: sp, gain: 0.30, freq: 1500, to: 1100, decay: 0.055, type: 'square' }); break;
      case 'headshot':    this.tone({ sp: sp, gain: 0.34, freq: 2100, to: 1500, decay: 0.09, type: 'square' });
                          this.tone({ sp: sp, gain: 0.2, freq: 3100, to: 2200, decay: 0.06, type: 'sine', delay: 0.03 }); break;
      case 'kill':        this.tone({ sp: sp, gain: 0.3, freq: 660, to: 990, decay: 0.12, type: 'triangle' }); break;
      case 'scope':       this.noiseBurst({ sp: sp, gain: 0.2, freq: 1600, sweep: 900, decay: 0.05, q: 2 }); break;
      case 'click':       this.tone({ sp: sp, gain: 0.14, freq: 1400, to: 1100, decay: 0.035, type: 'square' }); break;
      case 'hover':       this.tone({ sp: sp, gain: 0.06, freq: 900, to: 1000, decay: 0.03, type: 'sine' }); break;
      case 'pin':         this.noiseBurst({ sp: sp, gain: 0.3, freq: 3600, sweep: 2000, decay: 0.05, q: 2.5 }); break;
      case 'hurt':        this.tone({ sp: sp, gain: 0.26, freq: 260, to: 150, decay: 0.2, type: 'sawtooth' });
                          this.noiseBurst({ sp: sp, gain: 0.2, freq: 700, sweep: 200, decay: 0.18, q: 0.7 }); break;
      case 'death':       this.tone({ sp: sp, gain: 0.34, freq: 340, to: 80, decay: 0.7, type: 'sawtooth' }); break;
      case 'roundStart':  this.tone({ sp: sp, gain: 0.22, freq: 440, to: 660, decay: 0.3, type: 'triangle', bus: this.music });
                          this.tone({ sp: sp, gain: 0.18, freq: 660, to: 880, decay: 0.35, type: 'triangle', delay: 0.14, bus: this.music }); break;
      case 'win':         [523, 659, 784, 1046].forEach(function (f, i) {
                            this.tone({ sp: sp, gain: 0.2, freq: f, decay: 0.34, type: 'triangle', delay: i * 0.11, bus: this.music });
                          }, this); break;
      case 'lose':        [392, 349, 294, 233].forEach(function (f, i) {
                            this.tone({ sp: sp, gain: 0.18, freq: f, decay: 0.4, type: 'sine', delay: i * 0.13, bus: this.music });
                          }, this); break;
      case 'mvp':         [659, 784, 988, 1318].forEach(function (f, i) {
                            this.tone({ sp: sp, gain: 0.16, freq: f, decay: 0.3, type: 'triangle', delay: i * 0.09, bus: this.music });
                          }, this); break;
      case 'tick':        this.tone({ sp: sp, gain: 0.12, freq: 1700, decay: 0.04, type: 'square' }); break;
    }
  };

  Audio.prototype.bombBeep = function (x, y, z, urgency) {
    var sp = this.spatial(x, y, z, 8, 70);
    if (!sp) return;
    this.tone({ sp: sp, gain: 0.44, freq: 1400 + urgency * 900, to: 900 + urgency * 600, decay: 0.07, type: 'square' });
  };
  Audio.prototype.plantBeep = function (x, y, z) {
    var sp = this.spatial(x, y, z, 8, 45);
    if (!sp) return;
    this.tone({ sp: sp, gain: 0.3, freq: 900, to: 1200, decay: 0.05, type: 'square' });
  };
  Audio.prototype.defuseWire = function (x, y, z) {
    var sp = this.spatial(x, y, z, 7, 30);
    if (!sp) return;
    this.noiseBurst({ sp: sp, gain: 0.3, freq: 2400, sweep: 1100, decay: 0.06, q: 1.8 });
  };

  Audio.prototype.explosion = function (x, y, z, power) {
    var sp = this.spatial(x, y, z, 16, 150);
    if (!sp) return;
    power = power || 1;
    this.noiseBurst({ sp: sp, gain: 1.0 * power, freq: 260, sweep: 60, decay: 0.75, q: 0.4, attack: 0.002, pink: true });
    this.tone({ sp: sp, gain: 0.9 * power, freq: 72, to: 28, decay: 0.9, type: 'sine' });
    this.noiseBurst({ sp: sp, gain: 0.6 * power, freq: 2600, sweep: 600, decay: 0.2, q: 0.6, filterType: 'highpass' });
    if (sp.dist < 12) this.setMuffle(M.clamp(0.8 - sp.dist / 15, 0, 0.8));
  };

  Audio.prototype.flashbang = function (amount) {
    if (!this.ready) return;
    var sp = { gain: 1, pan: 0, hz: 20000, dist: 0 };
    this.noiseBurst({ sp: sp, gain: 0.85, freq: 3800, sweep: 900, decay: 0.3, q: 0.5, attack: 0.001 });
    this.setMuffle(M.clamp(amount, 0, 0.92));
    // the ringing tinnitus tone
    var ctx = this.ctx, t = ctx.currentTime;
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 4300;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.075 * amount, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2 + amount * 3.2);
    osc.connect(g); g.connect(this.master);
    osc.start(t); osc.stop(t + 1.3 + amount * 3.3);
  };

  Audio.prototype.grenadeBounce = function (x, y, z, speed) {
    var sp = this.spatial(x, y, z, 5, 32);
    if (!sp) return;
    var g = M.clamp(speed / 14, 0.08, 0.5);
    this.noiseBurst({ sp: sp, gain: g, freq: 1900, sweep: 700, decay: 0.06, q: 1.6 });
    this.tone({ sp: sp, gain: g * 0.5, freq: 240, to: 140, decay: 0.05, type: 'square' });
  };

  Audio.prototype.throwSound = function (x, y, z) {
    var sp = this.spatial(x, y, z, 5, 25);
    if (!sp) return;
    this.noiseBurst({ sp: sp, gain: 0.25, freq: 1200, sweep: 2600, decay: 0.12, q: 0.7 });
  };

  Audio.prototype.smokePop = function (x, y, z) {
    var sp = this.spatial(x, y, z, 10, 60);
    if (!sp) return;
    this.noiseBurst({ sp: sp, gain: 0.6, freq: 700, sweep: 250, decay: 0.9, q: 0.4, attack: 0.01, pink: true });
  };

  /* Looping fire crackle, started and stopped with the molotov. */
  Audio.prototype.startFireLoop = function () {
    if (!this.ready || this.fireLoop) return;
    var ctx = this.ctx;
    var src = ctx.createBufferSource();
    src.buffer = this.pink; src.loop = true;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.6;
    var g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(this.sfx);
    src.start();
    this.fireLoop = { src: src, gain: g, filter: f };
  };
  Audio.prototype.updateFireLoop = function (nearestDist) {
    if (!this.ready) return;
    if (nearestDist === null || nearestDist > 22) {
      if (this.fireLoop) this.fireLoop.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.15);
      return;
    }
    this.startFireLoop();
    var v = M.clamp(1 - nearestDist / 22, 0, 1);
    this.fireLoop.gain.gain.setTargetAtTime(v * v * 0.35, this.ctx.currentTime, 0.12);
  };

  /* Menu ambience — a slow two-note pad, quiet enough to ignore. */
  Audio.prototype.startAmbience = function () {
    if (!this.ready || this.ambience) return;
    var ctx = this.ctx;
    var g = ctx.createGain(); g.gain.value = 0;
    var oscs = [];
    [55, 82.4, 110, 164.8].forEach(function (f, i) {
      var o = ctx.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      var og = ctx.createGain(); og.gain.value = 0.3 / (i + 1);
      var lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.017;
      var lg = ctx.createGain(); lg.gain.value = 0.22 / (i + 1);
      lfo.connect(lg); lg.connect(og.gain);
      o.connect(og); og.connect(g);
      o.start(); lfo.start();
      oscs.push(o, lfo);
    });
    g.connect(this.music);
    g.gain.setTargetAtTime(0.35, ctx.currentTime, 1.5);
    this.ambience = { gain: g, oscs: oscs };
  };
  Audio.prototype.stopAmbience = function () {
    if (!this.ambience) return;
    var a = this.ambience;
    a.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
    var ctx = this.ctx;
    setTimeout(function () {
      for (var i = 0; i < a.oscs.length; i++) { try { a.oscs[i].stop(); a.oscs[i].disconnect(); } catch (e) {} }
      try { a.gain.disconnect(); } catch (e) {}
    }, 1400);
    this.ambience = null;
  };

  CS.Audio = Audio;
})(typeof window !== 'undefined' ? window : globalThis);
