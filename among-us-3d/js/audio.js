/* ============================================================
   AMONG US 3D — AUDIO
   Procedural WebAudio SFX + a little ambient music bed.
   No asset files, so the whole game stays offline-capable.
   ============================================================ */
(function (AU) {
'use strict';

var ctx = null, master = null, sfxGain = null, musicGain = null, started = false;
var musicNodes = [];

function ensure() {
  if (ctx) return ctx;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
  sfxGain = ctx.createGain(); sfxGain.connect(master);
  musicGain = ctx.createGain(); musicGain.connect(master);
  AU.Audio.applyVolumes();
  return ctx;
}

function tone(opt) {
  var c = ensure(); if (!c) return;
  var t0 = c.currentTime + (opt.delay || 0);
  var o = c.createOscillator();
  var g = c.createGain();
  o.type = opt.type || 'sine';
  o.frequency.setValueAtTime(opt.f0 || 440, t0);
  if (opt.f1) o.frequency.exponentialRampToValueAtTime(Math.max(1, opt.f1), t0 + (opt.dur || 0.2));
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opt.vol || 0.2, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + (opt.dur || 0.2));
  o.connect(g);
  if (opt.filter) {
    var f = c.createBiquadFilter();
    f.type = opt.filter; f.frequency.value = opt.filterFreq || 800;
    g.connect(f); f.connect(sfxGain);
  } else g.connect(sfxGain);
  o.start(t0); o.stop(t0 + (opt.dur || 0.2) + 0.05);
}

function noise(opt) {
  var c = ensure(); if (!c) return;
  var dur = opt.dur || 0.3;
  var len = Math.floor(c.sampleRate * dur);
  var buf = c.createBuffer(1, len, c.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  var src = c.createBufferSource(); src.buffer = buf;
  var f = c.createBiquadFilter(); f.type = opt.filter || 'lowpass'; f.frequency.value = opt.freq || 1200;
  var g = c.createGain(); g.gain.value = opt.vol || 0.2;
  src.connect(f); f.connect(g); g.connect(sfxGain);
  src.start(c.currentTime + (opt.delay || 0));
}

var SFX = {
  click:    function () { tone({ type:'square', f0:520, f1:380, dur:0.07, vol:0.10 }); },
  back:     function () { tone({ type:'square', f0:320, f1:220, dur:0.09, vol:0.10 }); },
  hover:    function () { tone({ type:'sine',   f0:700, dur:0.04, vol:0.05 }); },
  buy:      function () { tone({ type:'triangle', f0:660, dur:0.09, vol:0.16 });
                          tone({ type:'triangle', f0:880, dur:0.14, vol:0.16, delay:0.09 });
                          tone({ type:'triangle', f0:1180, dur:0.2, vol:0.14, delay:0.19 }); },
  deny:     function () { tone({ type:'sawtooth', f0:180, f1:110, dur:0.2, vol:0.16 }); },
  step:     function () { noise({ dur:0.07, freq:520, vol:0.05 }); },
  taskStep: function () { tone({ type:'sine', f0:880, dur:0.06, vol:0.12 }); },
  taskDone: function () { tone({ type:'sine', f0:660, dur:0.1, vol:0.18 });
                          tone({ type:'sine', f0:990, dur:0.18, vol:0.18, delay:0.1 }); },
  allTasks: function () { [523,659,784,1047].forEach(function (f, i) {
                            tone({ type:'triangle', f0:f, dur:0.22, vol:0.16, delay:i * 0.11 }); }); },
  kill:     function () { noise({ dur:0.28, freq:2600, filter:'highpass', vol:0.35 });
                          tone({ type:'sawtooth', f0:220, f1:60, dur:0.42, vol:0.3 }); },
  acid:     function () { noise({ dur:0.6, freq:3000, filter:'highpass', vol:0.22 });
                          tone({ type:'sawtooth', f0:150, f1:70, dur:0.5, vol:0.2 }); },
  vent:     function () { noise({ dur:0.35, freq:700, vol:0.3 });
                          tone({ type:'square', f0:120, f1:60, dur:0.3, vol:0.15 }); },
  shift:    function () { tone({ type:'sine', f0:200, f1:1400, dur:0.5, vol:0.2 });
                          noise({ dur:0.4, freq:2000, filter:'bandpass', vol:0.15 }); },
  vanish:   function () { tone({ type:'sine', f0:1200, f1:120, dur:0.55, vol:0.2 }); },
  report:   function () { tone({ type:'square', f0:200, f1:200, dur:0.5, vol:0.28 });
                          tone({ type:'square', f0:150, dur:0.5, vol:0.22, delay:0.12 }); },
  meeting:  function () { [440,440,554,659].forEach(function (f, i) {
                            tone({ type:'square', f0:f, dur:0.24, vol:0.2, delay:i * 0.2 }); }); },
  vote:     function () { tone({ type:'square', f0:900, dur:0.07, vol:0.15 }); },
  eject:    function () { tone({ type:'sawtooth', f0:400, f1:80, dur:1.1, vol:0.22 });
                          noise({ dur:1.2, freq:400, vol:0.15 }); },
  alarm:    function () { for (var i = 0; i < 3; i++) {
                            tone({ type:'square', f0:880, f1:660, dur:0.28, vol:0.22, delay:i * 0.34 }); } },
  sabotage: function () { tone({ type:'sawtooth', f0:110, dur:0.6, vol:0.22 });
                          tone({ type:'sawtooth', f0:165, dur:0.6, vol:0.18, delay:0.1 }); },
  fixed:    function () { tone({ type:'sine', f0:520, dur:0.12, vol:0.18 });
                          tone({ type:'sine', f0:780, dur:0.2, vol:0.18, delay:0.12 }); },
  doorClose:function () { noise({ dur:0.2, freq:300, vol:0.28 });
                          tone({ type:'square', f0:90, dur:0.18, vol:0.15 }); },
  win:      function () { [523,659,784,1047,1319].forEach(function (f, i) {
                            tone({ type:'triangle', f0:f, dur:0.35, vol:0.2, delay:i * 0.16 }); }); },
  lose:     function () { [523,466,392,311].forEach(function (f, i) {
                            tone({ type:'sawtooth', f0:f, dur:0.4, vol:0.18, delay:i * 0.2 }); }); },
  chat:     function () { tone({ type:'sine', f0:1000, dur:0.05, vol:0.09 }); },
  noise:    function () { for (var i = 0; i < 4; i++)
                            tone({ type:'square', f0:1400, f1:900, dur:0.16, vol:0.25, delay:i * 0.22 }); },
  scan:     function () { tone({ type:'sine', f0:300, f1:900, dur:0.8, vol:0.12 }); },
  ghost:    function () { tone({ type:'sine', f0:300, f1:900, dur:0.5, vol:0.1 }); }
};

AU.Audio = {
  init: function () { ensure(); },
  resume: function () {
    var c = ensure();
    if (c && c.state === 'suspended') c.resume();
    if (!started && c) { started = true; }
  },
  play: function (name) { if (SFX[name]) { AU.Audio.resume(); SFX[name](); } },
  applyVolumes: function () {
    if (!sfxGain) return;
    var cl = AU.Save.p.client;
    sfxGain.gain.value   = (cl.sfxVolume   != null ? cl.sfxVolume   : 70) / 100;
    musicGain.gain.value = (cl.musicVolume != null ? cl.musicVolume : 40) / 100 * 0.35;
  },
  /* Slow ambient drone for menus & the lobby. */
  startMusic: function () {
    var c = ensure(); if (!c || musicNodes.length) return;
    var freqs = [55, 82.4, 110, 164.8];
    for (var i = 0; i < freqs.length; i++) {
      var o = c.createOscillator(); o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = freqs[i];
      var g = c.createGain(); g.gain.value = 0.0;
      var lfo = c.createOscillator(); lfo.frequency.value = 0.03 + i * 0.017;
      var lg = c.createGain(); lg.gain.value = 0.09;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(musicGain);
      o.start(); lfo.start();
      musicNodes.push(o, lfo);
    }
  },
  stopMusic: function () {
    for (var i = 0; i < musicNodes.length; i++) { try { musicNodes[i].stop(); } catch (e) {} }
    musicNodes = [];
  },
  context: function () { return ensure(); }
};

})(window.AU);
