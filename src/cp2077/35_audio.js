<script>
/* ============================================================================
   GHOSTLINE ENGINE :: 03b — AUDIO
   Every sound in the game is synthesised at runtime from oscillators and
   shaped noise. There are no audio files, because there are no files at all.

   Signal path:  voices -> [dry | reverb send] -> bus -> master -> limiter -> out
   Positional audio is computed by hand (distance gain + equal-power pan against
   the camera's right vector) rather than with PannerNodes, which keeps a
   hundred simultaneous city sources cheap.
   ========================================================================== */
const AUDIO = {
  ctx: null, ready: false, muted: false,
  master: null, limiter: null, verb: null, verbSend: null,
  bus: {}, vol: { master: 0.85, sfx: 1.0, music: 0.55, amb: 0.7, ui: 0.8 },
  noise: {}, engines: new Map(), loops: {}, _lastStep: 0, _voices: 0, MAXV: 48,

/* ------------------------------------------------------------------ init - */
init() {
  if (this.ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  const ctx = this.ctx = new AC({ latencyHint: "interactive" });

  this.limiter = ctx.createDynamicsCompressor();
  this.limiter.threshold.value = -8;
  this.limiter.knee.value = 12;
  this.limiter.ratio.value = 12;
  this.limiter.attack.value = 0.003;
  this.limiter.release.value = 0.18;
  this.limiter.connect(ctx.destination);

  this.master = ctx.createGain();
  this.master.gain.value = this.vol.master;
  this.master.connect(this.limiter);

  for (const b of ["sfx", "music", "amb", "ui"]) {
    const g = ctx.createGain();
    g.gain.value = this.vol[b];
    g.connect(this.master);
    this.bus[b] = g;
  }

  /* --- street reverb: a synthesised impulse response --------------------- */
  const dur = 1.5, sr = ctx.sampleRate;
  const ir = ctx.createBuffer(2, (sr * dur) | 0, sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    for (let i = 0; i < d.length; i++) {
      const t = i / d.length;
      /* early reflections then an exponential tail — reads as concrete canyon */
      const env = Math.pow(1 - t, 2.6);
      let v = (Math.random() * 2 - 1) * env;
      if (i < sr * 0.09 && Math.random() < 0.004) v += (Math.random() * 2 - 1) * 0.8;
      d[i] = v * 0.55;
    }
  }
  this.verb = ctx.createConvolver();
  this.verb.buffer = ir;
  this.verbSend = ctx.createGain();
  this.verbSend.gain.value = 0.30;
  this.verbSend.connect(this.verb);
  this.verb.connect(this.bus.sfx);

  /* --- reusable noise buffers ------------------------------------------- */
  this.noise.white = this._noiseBuf(2.0, 0);
  this.noise.pink  = this._noiseBuf(3.0, 1);
  this.noise.brown = this._noiseBuf(4.0, 2);

  this.ready = true;
  this.startAmbience();
  RADIO.init(this);
  return true;
},
resume() { if (this.ctx && this.ctx.state === "suspended") this.ctx.resume(); },
setVol(k, v) {
  this.vol[k] = v;
  if (!this.ready) return;
  if (k === "master") this.master.gain.value = v;
  else if (this.bus[k]) this.bus[k].gain.value = v;
},

_noiseBuf(sec, kind) {
  const ctx = this.ctx, sr = ctx.sampleRate;
  const b = ctx.createBuffer(1, (sr * sec) | 0, sr);
  const d = b.getChannelData(0);
  if (kind === 0) { for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  else if (kind === 1) {           // pink-ish via Voss-McCartney
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886*b0 + w*0.0555179; b1 = 0.99332*b1 + w*0.0750759;
      b2 = 0.96900*b2 + w*0.1538520; b3 = 0.86650*b3 + w*0.3104856;
      b4 = 0.55000*b4 + w*0.5329522; b5 = -0.7616*b5 - w*0.0168980;
      d[i] = (b0+b1+b2+b3+b4+b5+b6 + w*0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else {                          // brown
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      last = (last + (Math.random()*2-1) * 0.02) * 0.996;
      d[i] = last * 8;
    }
  }
  return b;
},

/* --------------------------------------------------- primitive builders - */
/* Every one-shot routes through here so voice count stays bounded. */
_gate() {
  if (this._voices >= this.MAXV) return false;
  this._voices++;
  return true;
},
_release(n, t) { setTimeout(() => { this._voices--; try { n.disconnect(); } catch (e) {} }, t*1000 + 60); },

/* positional gain + pan against the camera */
_place(x, y, z, ref, out) {
  const C = RENDER.camPos, R = RENDER.right;
  const dx = x - C[0], dy = y - C[1], dz = z - C[2];
  const d = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.001;
  /* inverse-distance with a reference radius, then a soft cutoff */
  const g = Math.min(1, (ref || 8) / d) * Math.max(0, 1 - d / 220);
  const pan = clamp((dx*R[0] + dz*R[2]) / d, -1, 1);
  out[0] = g * g; out[1] = pan; out[2] = d;
  return out;
},

/* one shot: osc or noise -> filter -> env -> pan -> bus (+reverb) */
play(o) {
  if (!this.ready || this.muted) return null;
  const ctx = this.ctx, t = ctx.currentTime;
  const dur = o.dur || 0.2;
  if (!this._gate()) return null;

  const env = ctx.createGain();
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  const dest = this.bus[o.bus || "sfx"];

  let vol = o.vol === undefined ? 0.6 : o.vol;
  let panV = o.pan || 0;
  if (o.pos) {
    const p = this._place(o.pos[0], o.pos[1], o.pos[2], o.ref, this._pp || (this._pp = [0,0,0]));
    if (p[0] < 0.0015) { this._voices--; return null; }
    vol *= p[0]; panV = p[1];
    if (o.delay === undefined) o.delay = min(0.35, p[2] / 340);   // speed of sound
  }
  const t0 = t + (o.delay || 0);

  let src;
  if (o.noise) {
    src = ctx.createBufferSource();
    src.buffer = this.noise[o.noise] || this.noise.white;
    src.loop = true;
    src.playbackRate.value = o.rate || 1;
  } else {
    src = ctx.createOscillator();
    src.type = o.type || "sine";
    src.frequency.setValueAtTime(o.f0 || 220, t0);
    if (o.f1 !== undefined) {
      if (o.sweep === "exp") src.frequency.exponentialRampToValueAtTime(max(1, o.f1), t0 + dur);
      else src.frequency.linearRampToValueAtTime(o.f1, t0 + dur);
    }
  }
  let node = src;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = o.filter;
    f.frequency.setValueAtTime(o.fc || 1200, t0);
    if (o.fc1 !== undefined) f.frequency.exponentialRampToValueAtTime(max(20, o.fc1), t0 + dur);
    f.Q.value = o.q === undefined ? 1 : o.q;
    node.connect(f); node = f;
  }
  if (o.drive) {
    const ws = ctx.createWaveShaper();
    const n = 1024, curve = new Float32Array(n);
    const k = o.drive * 40;
    for (let i = 0; i < n; i++) {
      const xx = i*2/n - 1;
      curve[i] = (1 + k) * xx / (1 + k * Math.abs(xx));
    }
    ws.curve = curve; ws.oversample = "2x";
    node.connect(ws); node = ws;
  }
  node.connect(env);

  /* ADSR-ish: fast attack, exponential decay unless told otherwise */
  const a = o.atk === undefined ? 0.004 : o.atk;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(max(0.0002, vol), t0 + a);
  if (o.hold) env.gain.setValueAtTime(vol, t0 + a + o.hold);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  if (pan) { pan.pan.value = panV; env.connect(pan); pan.connect(dest);
             if (o.verb !== 0) { const s = ctx.createGain(); s.gain.value = (o.verb || 0.35)*vol;
               env.connect(s); s.connect(this.verbSend); } }
  else { env.connect(dest); }

  src.start(t0);
  src.stop(t0 + dur + 0.05);
  this._release(env, (o.delay || 0) + dur);
  return env;
},

/* layered helper: fire several primitives as one event */
layer(list) { for (const l of list) this.play(l); },

/* ======================================================================== */
/*                            WEAPON / COMBAT                               */
/* ======================================================================== */
gun(cls, pos, sys) {
  const P = { pos, ref: 14, bus: "sfx" };
  /* Each class gets a body (low sine thump), a crack (filtered noise burst)
     and a tail (reverb-heavy noise) tuned to bore and barrel length. */
  const spec = {
    "Pistol":       { body: 150, crack: 3200, dur: 0.14, tail: 0.30, vol: 0.55, drive: 0.5 },
    "Revolver":     { body:  85, crack: 2400, dur: 0.26, tail: 0.60, vol: 0.90, drive: 0.9 },
    "SMG":          { body: 190, crack: 3800, dur: 0.09, tail: 0.16, vol: 0.40, drive: 0.4 },
    "Smart SMG":    { body: 210, crack: 4400, dur: 0.08, tail: 0.14, vol: 0.36, drive: 0.3 },
    "Assault Rifle":{ body: 120, crack: 2900, dur: 0.13, tail: 0.34, vol: 0.62, drive: 0.6 },
    "LMG":          { body:  95, crack: 2500, dur: 0.15, tail: 0.40, vol: 0.70, drive: 0.7 },
    "Shotgun":      { body:  62, crack: 1500, dur: 0.30, tail: 0.72, vol: 0.95, drive: 1.0 },
    "Sniper":       { body:  55, crack: 2000, dur: 0.34, tail: 0.95, vol: 1.00, drive: 0.8 },
    "Tech Rifle":   { body: 110, crack: 1800, dur: 0.22, tail: 0.50, vol: 0.72, drive: 0.4 },
  }[cls] || { body: 150, crack: 3000, dur: 0.15, tail: 0.3, vol: 0.5, drive: 0.5 };

  this.play({ ...P, type: "sine", f0: spec.body*2.4, f1: spec.body*0.35, sweep: "exp",
              dur: spec.dur, vol: spec.vol*0.9, drive: spec.drive, verb: 0.2 });
  this.play({ ...P, noise: "white", filter: "bandpass", fc: spec.crack, fc1: spec.crack*0.30,
              q: 0.9, dur: spec.dur*0.8, vol: spec.vol, drive: spec.drive*0.7, verb: 0.25 });
  this.play({ ...P, noise: "pink", filter: "lowpass", fc: 1400, fc1: 260,
              dur: spec.tail, vol: spec.vol*0.45, atk: 0.01, verb: 0.9 });
  if (sys === WSYS.TECH) {
    /* rail whine on top of the report */
    this.play({ ...P, type: "sawtooth", f0: 900, f1: 2600, sweep: "exp",
                dur: 0.18, vol: 0.25, filter: "bandpass", fc: 1800, q: 6, verb: 0.4 });
  }
  if (sys === WSYS.SMART) {
    this.play({ ...P, type: "square", f0: 1800, f1: 2400, dur: 0.05, vol: 0.14, verb: 0.1 });
  }
},
techCharge(t01, pos) {
  if (!this.ready) return;
  this.play({ pos, ref: 6, type: "sawtooth", f0: 220 + t01*900, f1: 260 + t01*1100,
              dur: 0.1, vol: 0.12, filter: "bandpass", fc: 900 + t01*2200, q: 8, verb: 0.2 });
},
dryFire(pos) {
  this.play({ pos, ref: 4, noise: "white", filter: "highpass", fc: 2600, dur: 0.05, vol: 0.28 });
},
reload(stage, pos) {
  /* stage 0 = mag out, 1 = mag in, 2 = charging handle */
  const f = [520, 380, 240][stage] || 400;
  this.play({ pos, ref: 5, noise: "white", filter: "bandpass", fc: f*4, q: 3,
              dur: 0.055, vol: 0.34, drive: 0.3 });
  this.play({ pos, ref: 5, type: "square", f0: f, f1: f*0.6, sweep: "exp",
              dur: 0.05, vol: 0.16 });
},
melee(hit, pos) {
  if (hit) {
    this.play({ pos, ref: 6, type: "sine", f0: 160, f1: 60, sweep: "exp", dur: 0.14, vol: 0.55, drive: 0.6 });
    this.play({ pos, ref: 6, noise: "white", filter: "lowpass", fc: 1400, fc1: 300, dur: 0.16, vol: 0.4 });
  } else {
    this.play({ pos, ref: 4, noise: "pink", filter: "bandpass", fc: 900, fc1: 2600,
                q: 1.4, dur: 0.16, vol: 0.22 });
  }
},
blade(pos) {
  this.play({ pos, ref: 6, type: "triangle", f0: 2400, f1: 700, sweep: "exp", dur: 0.22, vol: 0.3,
              filter: "bandpass", fc: 2600, q: 5, verb: 0.5 });
},
impact(kind, pos) {
  const s = {
    stone: { fc: 1600, dur: 0.12, vol: 0.36, body: 220 },
    metal: { fc: 4200, dur: 0.16, vol: 0.34, body: 700 },
    flesh: { fc: 700,  dur: 0.13, vol: 0.40, body: 130 },
    glass: { fc: 5200, dur: 0.22, vol: 0.36, body: 1800 },
  }[kind] || { fc: 1600, dur: 0.12, vol: 0.3, body: 240 };
  this.play({ pos, ref: 8, noise: "white", filter: "bandpass", fc: s.fc, fc1: s.fc*0.35,
              q: 1.2, dur: s.dur, vol: s.vol, verb: 0.4 });
  this.play({ pos, ref: 8, type: kind === "flesh" ? "sine" : "triangle",
              f0: s.body, f1: s.body*0.4, sweep: "exp", dur: s.dur*0.8, vol: s.vol*0.7 });
},
ricochet(pos) {
  this.play({ pos, ref: 10, type: "sine", f0: 1800 + Math.random()*1400, f1: 400,
              sweep: "exp", dur: 0.32, vol: 0.22, filter: "bandpass", fc: 2200, q: 12, verb: 0.7 });
},
explosion(pos) {
  this.play({ pos, ref: 40, type: "sine", f0: 90, f1: 24, sweep: "exp", dur: 1.1, vol: 1.0, drive: 0.8 });
  this.play({ pos, ref: 40, noise: "brown", filter: "lowpass", fc: 900, fc1: 90,
              dur: 1.4, vol: 0.9, atk: 0.006, verb: 0.9 });
  this.play({ pos, ref: 40, noise: "white", filter: "highpass", fc: 1800,
              dur: 0.25, vol: 0.5, verb: 0.5 });
},
grenadeBounce(pos) {
  this.play({ pos, ref: 6, type: "triangle", f0: 900, f1: 400, sweep: "exp", dur: 0.08, vol: 0.22 });
},
hitmark(crit) {
  this.play({ bus: "ui", type: "square", f0: crit ? 1500 : 1100, f1: crit ? 1900 : 1300,
              dur: 0.05, vol: 0.18, verb: 0 });
},
kill() {
  this.play({ bus: "ui", type: "sine", f0: 660, f1: 990, dur: 0.14, vol: 0.2, verb: 0 });
},

/* ======================================================================== */
/*                             PLAYER / BODY                                */
/* ======================================================================== */
step(pos, surface, running, crouch) {
  const now = this.ctx ? this.ctx.currentTime : 0;
  if (now - this._lastStep < 0.11) return;
  this._lastStep = now;
  const v = (crouch ? 0.10 : running ? 0.34 : 0.22);
  const spec = surface === "metal" ? { fc: 3200, body: 320 }
             : surface === "sand"  ? { fc: 1800, body: 120 }
             :                       { fc: 2400, body: 180 };
  this.play({ pos, ref: 3, noise: "white", filter: "bandpass", fc: spec.fc*(0.8+Math.random()*0.4),
              fc1: spec.fc*0.3, q: 1.1, dur: 0.09, vol: v, verb: 0.35 });
  this.play({ pos, ref: 3, type: "sine", f0: spec.body, f1: spec.body*0.5, sweep: "exp",
              dur: 0.07, vol: v*0.6 });
},
jump(pos)  { this.play({ pos, ref: 3, noise: "white", filter: "bandpass", fc: 900, dur: 0.08, vol: 0.16 }); },
land(pos, hard) {
  this.play({ pos, ref: 4, type: "sine", f0: hard ? 110 : 160, f1: 50, sweep: "exp",
              dur: hard ? 0.24 : 0.12, vol: hard ? 0.5 : 0.26 });
  this.play({ pos, ref: 4, noise: "white", filter: "lowpass", fc: 1400, fc1: 300,
              dur: 0.14, vol: hard ? 0.34 : 0.18 });
},
hurt(severity) {
  this.play({ bus: "sfx", type: "sine", f0: 220, f1: 90, sweep: "exp", dur: 0.22,
              vol: 0.35 + severity*0.4, drive: 0.6, verb: 0 });
  this.play({ bus: "sfx", noise: "pink", filter: "lowpass", fc: 700, dur: 0.3,
              vol: 0.2 + severity*0.3, verb: 0 });
},
death() {
  this.play({ bus: "sfx", type: "sine", f0: 180, f1: 34, sweep: "exp", dur: 2.4, vol: 0.6, verb: 0 });
  this.play({ bus: "sfx", noise: "brown", filter: "lowpass", fc: 600, fc1: 60, dur: 2.6, vol: 0.5, verb: 0 });
},
heartbeat(pos) {
  this.play({ bus: "sfx", type: "sine", f0: 62, f1: 40, sweep: "exp", dur: 0.16, vol: 0.4, verb: 0 });
},

/* ======================================================================== */
/*                                  UI                                      */
/* ======================================================================== */
ui(kind) {
  const s = {
    hover:  { f0: 1400, f1: 1500, dur: 0.03, vol: 0.10, type: "square" },
    click:  { f0: 900,  f1: 1500, dur: 0.06, vol: 0.20, type: "square" },
    tab:    { f0: 600,  f1: 900,  dur: 0.08, vol: 0.18, type: "sawtooth" },
    open:   { f0: 400,  f1: 1200, dur: 0.16, vol: 0.20, type: "sawtooth" },
    close:  { f0: 1200, f1: 400,  dur: 0.14, vol: 0.18, type: "sawtooth" },
    notify: { f0: 880,  f1: 1320, dur: 0.14, vol: 0.22, type: "sine" },
    xp:     { f0: 1320, f1: 1760, dur: 0.18, vol: 0.22, type: "sine" },
    bad:    { f0: 320,  f1: 180,  dur: 0.22, vol: 0.26, type: "sawtooth" },
    error:  { f0: 200,  f1: 150,  dur: 0.18, vol: 0.24, type: "square" },
    levelup:{ f0: 660,  f1: 1320, dur: 0.5,  vol: 0.3,  type: "triangle" },
    pickup: { f0: 1100, f1: 1600, dur: 0.09, vol: 0.18, type: "triangle" },
    equip:  { f0: 500,  f1: 380,  dur: 0.09, vol: 0.20, type: "square" },
    scan:   { f0: 2200, f1: 900,  dur: 0.22, vol: 0.14, type: "sine" },
    hack:   { f0: 300,  f1: 2400, dur: 0.28, vol: 0.24, type: "sawtooth" },
    ring:   { f0: 1046, f1: 1046, dur: 0.28, vol: 0.24, type: "sine" },
    money:  { f0: 1600, f1: 2200, dur: 0.10, vol: 0.16, type: "triangle" },
  }[kind];
  if (!s) return;
  this.play({ bus: "ui", verb: 0, sweep: "exp", ...s });
  if (kind === "levelup") {
    this.play({ bus: "ui", verb: 0, type: "sine", f0: 990, f1: 1980, dur: 0.6, vol: 0.2, delay: 0.06 });
  }
  if (kind === "hack") {
    this.play({ bus: "ui", verb: 0, noise: "white", filter: "bandpass", fc: 3000, fc1: 600,
                q: 4, dur: 0.3, vol: 0.14 });
  }
},
holocall() {
  for (let i = 0; i < 2; i++)
    this.play({ bus: "ui", verb: 0, type: "sine", f0: 1046, dur: 0.16, vol: 0.22, delay: i*0.24 });
},
typeTick() { this.play({ bus: "ui", verb: 0, type: "square", f0: 2400, dur: 0.012, vol: 0.045 }); },

/* ======================================================================== */
/*                          VEHICLES (continuous)                           */
/* ======================================================================== */
engineStart(id) {
  if (!this.ready || this.engines.has(id)) return;
  const ctx = this.ctx;
  const g = ctx.createGain(); g.gain.value = 0;
  const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900; lp.Q.value = 1.2;
  /* three detuned saws + a sub sine make a plausible combustion/EV hybrid */
  const oscs = [];
  for (let i = 0; i < 3; i++) {
    const o = ctx.createOscillator();
    o.type = i === 2 ? "square" : "sawtooth";
    o.frequency.value = 60;
    o.detune.value = (i-1) * 14;
    const og = ctx.createGain(); og.gain.value = i === 2 ? 0.18 : 0.34;
    o.connect(og); og.connect(lp); o.start();
    oscs.push(o);
  }
  const sub = ctx.createOscillator(); sub.type = "sine"; sub.frequency.value = 30;
  const subg = ctx.createGain(); subg.gain.value = 0.5;
  sub.connect(subg); subg.connect(lp); sub.start();
  /* intake/exhaust noise layer */
  const nz = ctx.createBufferSource(); nz.buffer = this.noise.pink; nz.loop = true;
  const nzf = ctx.createBiquadFilter(); nzf.type = "bandpass"; nzf.frequency.value = 500; nzf.Q.value = 0.8;
  const nzg = ctx.createGain(); nzg.gain.value = 0.25;
  nz.connect(nzf); nzf.connect(nzg); nzg.connect(lp); nz.start();

  lp.connect(g);
  if (pan) { g.connect(pan); pan.connect(this.bus.sfx); } else g.connect(this.bus.sfx);
  this.engines.set(id, { g, pan, lp, oscs, sub, nzf, nzg, nz, alive: true });
},
engineUpdate(id, rpm, load, pos, ref) {
  const e = this.engines.get(id);
  if (!e || !this.ready) return;
  const base = 42 + rpm * 190;
  for (let i = 0; i < e.oscs.length; i++)
    e.oscs[i].frequency.setTargetAtTime(base * (i === 2 ? 0.5 : 1), this.ctx.currentTime, 0.06);
  e.sub.frequency.setTargetAtTime(base * 0.5, this.ctx.currentTime, 0.08);
  e.lp.frequency.setTargetAtTime(500 + rpm*2600 + load*900, this.ctx.currentTime, 0.08);
  e.nzf.frequency.setTargetAtTime(320 + rpm*1600, this.ctx.currentTime, 0.1);
  e.nzg.gain.setTargetAtTime(0.10 + load*0.32, this.ctx.currentTime, 0.1);
  let g = 0.16 + load * 0.18;
  if (pos) {
    const p = this._place(pos[0], pos[1], pos[2], ref || 12, this._pp2 || (this._pp2 = [0,0,0]));
    g *= p[0];
    if (e.pan) e.pan.pan.setTargetAtTime(p[1], this.ctx.currentTime, 0.08);
  }
  e.g.gain.setTargetAtTime(g, this.ctx.currentTime, 0.09);
},
engineStop(id) {
  const e = this.engines.get(id);
  if (!e) return;
  try {
    e.g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    setTimeout(() => {
      for (const o of e.oscs) { try { o.stop(); } catch (x) {} }
      try { e.sub.stop(); e.nz.stop(); e.g.disconnect(); } catch (x) {}
    }, 400);
  } catch (x) {}
  this.engines.delete(id);
},
skid(pos, amt) {
  this.play({ pos, ref: 10, noise: "white", filter: "bandpass", fc: 1100 + amt*900,
              q: 2.4, dur: 0.16, vol: 0.10 + amt*0.28, verb: 0.4 });
},
horn(pos) {
  this.play({ pos, ref: 25, type: "square", f0: 420, dur: 0.5, vol: 0.30, hold: 0.35,
              filter: "lowpass", fc: 1800, verb: 0.4 });
  this.play({ pos, ref: 25, type: "square", f0: 530, dur: 0.5, vol: 0.24, hold: 0.35,
              filter: "lowpass", fc: 1800, verb: 0.4 });
},
crash(pos, force) {
  this.play({ pos, ref: 20, noise: "white", filter: "bandpass", fc: 1800, fc1: 400, q: 0.8,
              dur: 0.3, vol: min(1, 0.3 + force), drive: 0.8, verb: 0.6 });
  this.play({ pos, ref: 20, type: "sine", f0: 120, f1: 40, sweep: "exp", dur: 0.35,
              vol: min(0.9, 0.3+force) });
},
siren(pos, t) {
  /* two-tone wail, called on a timer by the police system */
  const hi = (t | 0) % 2 === 0;
  this.play({ pos, ref: 55, type: "square", f0: hi ? 780 : 560, f1: hi ? 560 : 780,
              dur: 0.5, vol: 0.30, filter: "bandpass", fc: 1400, q: 2, verb: 0.7 });
},

/* ======================================================================== */
/*                            AMBIENCE (loops)                              */
/* ======================================================================== */
_loop(key, build) {
  if (this.loops[key]) return this.loops[key];
  const l = build();
  this.loops[key] = l;
  return l;
},
startAmbience() {
  const ctx = this.ctx;
  const mk = (bufKey, type, fc, q, gain) => {
    const s = ctx.createBufferSource();
    s.buffer = this.noise[bufKey]; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = fc; f.Q.value = q;
    const g = ctx.createGain(); g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(this.bus.amb); s.start();
    return { s, f, g };
  };
  /* traffic rumble + wind + rain, mixed live from the environment state */
  this.loops.rumble = mk("brown", "lowpass", 220, 0.7, 0.0);
  this.loops.hiss   = mk("pink",  "bandpass", 1400, 0.5, 0.0);
  this.loops.rain   = mk("white", "bandpass", 2600, 0.4, 0.0);
  this.loops.wind   = mk("pink",  "lowpass", 500, 0.8, 0.0);
  /* mains hum near neon */
  const hum = ctx.createOscillator(); hum.type = "sawtooth"; hum.frequency.value = 60;
  const humF = ctx.createBiquadFilter(); humF.type = "lowpass"; humF.frequency.value = 260;
  const humG = ctx.createGain(); humG.gain.value = 0;
  hum.connect(humF); humF.connect(humG); humG.connect(this.bus.amb); hum.start();
  this.loops.hum = { s: hum, f: humF, g: humG };
},
/* called each frame from the game loop */
ambience(dt, env, density, indoors, nearNeon) {
  if (!this.ready) return;
  const t = this.ctx.currentTime, k = 0.4;
  const set = (l, v, fc) => { if (!l) return;
    l.g.gain.setTargetAtTime(v, t, k);
    if (fc !== undefined) l.f.frequency.setTargetAtTime(fc, t, k); };
  set(this.loops.rumble, 0.028 + density*0.10, 160 + density*160);
  set(this.loops.hiss,   0.010 + density*0.030, 1100 + density*900);
  set(this.loops.rain,   env.rain * 0.20, 1900 + env.rain*1800);
  set(this.loops.wind,   0.010 + (1-density)*0.030);
  set(this.loops.hum,    nearNeon ? 0.020 : 0.0);
},
/* sporadic one-shots that sell a living city */
cityEvent(pos, kind) {
  if (!this.ready) return;
  if (kind === "distantSiren") {
    this.play({ pos, ref: 90, type: "square", f0: 700, f1: 520, dur: 1.2, vol: 0.10,
                filter: "lowpass", fc: 900, verb: 1.0 });
  } else if (kind === "distantGun") {
    this.play({ pos, ref: 90, noise: "pink", filter: "lowpass", fc: 700, fc1: 200,
                dur: 0.4, vol: 0.12, verb: 1.0 });
  } else if (kind === "flyby") {
    this.play({ pos, ref: 70, noise: "brown", filter: "bandpass", fc: 300, fc1: 120,
                q: 0.7, dur: 2.4, vol: 0.16, atk: 0.6, verb: 0.8 });
  } else if (kind === "trainPass") {
    this.play({ pos, ref: 60, noise: "brown", filter: "lowpass", fc: 700, fc1: 240,
                dur: 3.0, vol: 0.24, atk: 0.9, verb: 0.7 });
    this.play({ pos, ref: 60, type: "sawtooth", f0: 90, f1: 70, dur: 3.0, vol: 0.08,
                filter: "bandpass", fc: 400, q: 3 });
  } else if (kind === "crowd") {
    this.play({ pos, ref: 20, noise: "pink", filter: "bandpass", fc: 700 + Math.random()*500,
                q: 1.6, dur: 0.7, vol: 0.06, atk: 0.2, verb: 0.6 });
  }
},
/* NPC vocalisation — a formant-ish blip, not speech */
voice(pos, pitch, len, emotion) {
  const f = 110 * pitch;
  this.play({ pos, ref: 6, type: "sawtooth", f0: f, f1: f*(emotion === "alarm" ? 1.5 : 0.92),
              dur: len, vol: 0.16, filter: "bandpass", fc: f*4.5, q: 5, verb: 0.4 });
},
};

/* ==========================================================================
   RADIO — five procedurally composed stations with a lookahead scheduler.
   Each station is a generator: chords, bass, lead and drums derived from a
   scale and a per-station rhythmic character. Nothing is sampled.
   ======================================================================== */
const RADIO = {
  A: null, on: false, station: 0, gain: null, lookahead: 0.12, nextT: 0, step: 0,
  stations: [
    { id:"neon",  name:"RADIO NEON 105.9", genre:"Synthwave",
      root: 45, scale:[0,3,5,7,10], bpm: 104, drive: 0.4, lead: "sawtooth",
      pad: "sawtooth", bassOct: -12, hats: 0.6, snare: 0.9, arp: 1.0,
      tag:"City Center · Westbrook" },
    { id:"dub",   name:"PACIFICA DUB 88.1", genre:"Dub",
      root: 40, scale:[0,3,5,6,7,10], bpm: 76, drive: 0.2, lead: "triangle",
      pad: "sine", bassOct: -24, hats: 0.3, snare: 0.7, arp: 0.3,
      tag:"Pacifica" },
    { id:"storm", name:"MAELSTROM FM 92.3", genre:"Industrial",
      root: 38, scale:[0,1,5,6,8], bpm: 148, drive: 1.0, lead: "square",
      pad: "sawtooth", bassOct: -12, hats: 0.9, snare: 1.0, arp: 0.8,
      tag:"Watson · Northside" },
    { id:"kabuki",name:"KABUKI CITY POP 101.5", genre:"City Pop",
      root: 48, scale:[0,2,4,7,9], bpm: 118, drive: 0.25, lead: "triangle",
      pad: "sine", bassOct: -12, hats: 0.7, snare: 0.6, arp: 0.9,
      tag:"Kabuki · Japantown" },
    { id:"bad",   name:"BADLANDS 66", genre:"Desert Ambient",
      root: 43, scale:[0,2,3,7,8,10], bpm: 62, drive: 0.15, lead: "sine",
      pad: "sine", bassOct: -24, hats: 0.15, snare: 0.3, arp: 0.2,
      tag:"The Badlands" },
  ],
  prog: [0, 5, 3, 4],   // scale-degree progression, repeated with variation

  init(audio) {
    this.A = audio;
    this.gain = audio.ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(audio.bus.music);
    this.nextT = audio.ctx.currentTime;
    this.R = rng(0x5241);
  },
  toggle() { this.setOn(!this.on); },
  setOn(v) {
    this.on = v;
    if (!this.A) return;
    this.gain.gain.setTargetAtTime(v ? 1 : 0, this.A.ctx.currentTime, 0.25);
    if (v) this.nextT = max(this.nextT, this.A.ctx.currentTime + 0.05);
  },
  next() { this.station = (this.station + 1) % this.stations.length; this.step = 0; return this.cur; },
  prev() { this.station = (this.station + this.stations.length - 1) % this.stations.length;
           this.step = 0; return this.cur; },
  get cur() { return this.stations[this.station]; },

  note(midi) { return 440 * Math.pow(2, (midi - 69) / 12); },
  deg(S, d, oct) {
    const n = S.scale.length;
    const i = ((d % n) + n) % n;
    const o = Math.floor(d / n) + (oct || 0);
    return S.root + S.scale[i] + o * 12;
  },

  /* one voice, scheduled at absolute time */
  v(type, freq, t, dur, vol, drive, fc) {
    const ctx = this.A.ctx;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    let node = o;
    if (fc) {
      const f = ctx.createBiquadFilter(); f.type = "lowpass";
      f.frequency.setValueAtTime(fc, t);
      f.frequency.exponentialRampToValueAtTime(max(120, fc*0.4), t + dur);
      f.Q.value = 3;
      o.connect(f); node = f;
    }
    if (drive) {
      const ws = ctx.createWaveShaper();
      const n = 512, c = new Float32Array(n), k = drive*30;
      for (let i = 0; i < n; i++) { const x = i*2/n - 1; c[i] = (1+k)*x/(1+k*Math.abs(x)); }
      ws.curve = c; node.connect(ws); node = ws;
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(max(0.0002, vol), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    node.connect(g); g.connect(this.gain);
    o.start(t); o.stop(t + dur + 0.02);
  },
  drum(kind, t, vol) {
    const ctx = this.A.ctx;
    if (kind === "kick") {
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
      o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + 0.22);
    } else {
      const s = ctx.createBufferSource();
      s.buffer = this.A.noise.white; s.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = kind === "hat" ? "highpass" : "bandpass";
      f.frequency.value = kind === "hat" ? 8000 : 1900;
      f.Q.value = kind === "hat" ? 1 : 1.4;
      const g = ctx.createGain();
      const d = kind === "hat" ? 0.045 : 0.16;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      s.connect(f); f.connect(g); g.connect(this.gain);
      s.start(t); s.stop(t + d + 0.02);
      if (kind === "snare") {
        const o = ctx.createOscillator(); o.type = "triangle";
        o.frequency.setValueAtTime(210, t);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(vol*0.5, t);
        g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
        o.connect(g2); g2.connect(this.gain); o.start(t); o.stop(t + 0.12);
      }
    }
  },

  /* lookahead scheduler — called every frame, schedules ahead of the clock */
  update() {
    if (!this.A || !this.A.ready || !this.on) return;
    const ctx = this.A.ctx;
    const S = this.cur;
    const spb = 60 / S.bpm / 4;                 // sixteenth-note duration
    while (this.nextT < ctx.currentTime + this.lookahead) {
      const t = this.nextT, s = this.step;
      const bar = (s / 16) | 0;
      const beat = s % 16;
      const chordDeg = this.prog[bar % this.prog.length];
      const R = this.R;

      /* --- drums --- */
      if (beat % 4 === 0) this.drum("kick", t, 0.55);
      if (S.id === "storm" && beat % 8 === 6) this.drum("kick", t, 0.4);
      if (beat === 4 || beat === 12) this.drum("snare", t, 0.30 * S.snare);
      if (beat % 2 === 0 && R() < S.hats) this.drum("hat", t, 0.10 * S.hats);
      if (S.id === "dub" && beat === 10) this.drum("snare", t, 0.22);

      /* --- bass on the root, syncopated per station --- */
      if (beat % 8 === 0 || (S.id === "storm" && beat % 4 === 2) ||
          (S.id === "dub" && beat === 6)) {
        this.v("sawtooth", this.note(this.deg(S, chordDeg, S.bassOct/12)),
               t, spb*3.2, 0.14, S.drive*0.5, 420);
      }
      /* --- pad chord on the bar --- */
      if (beat === 0) {
        for (const iv of [0, 2, 4]) {
          this.v(S.pad, this.note(this.deg(S, chordDeg + iv, 0)),
                 t, spb*14, 0.045, 0, 1600);
        }
      }
      /* --- arpeggio / lead --- */
      if (R() < S.arp * 0.55) {
        const step = [0, 2, 4, 6, 4, 2][(s + bar) % 6];
        this.v(S.lead, this.note(this.deg(S, chordDeg + step, 1)),
               t, spb*1.6, 0.055, S.drive*0.35, 2600);
      }
      /* --- occasional octave stab --- */
      if (beat === 14 && R() < 0.4) {
        this.v(S.lead, this.note(this.deg(S, chordDeg, 2)), t, spb*2, 0.05, S.drive*0.4, 3000);
      }
      this.nextT += spb;
      this.step = (this.step + 1) % (16 * this.prog.length);
    }
  },
};
</script>
