// MARCHLIGHT — the score. A small procedural orchestra (plucked strings by Karplus–Strong, FM
// celesta and glass, a formant choir, legato solo lines for flute, horn, cello and voice, string
// ensembles, brass, taiko and frame drums) playing composed cues on a bar scheduler.
//
// Three ideas run through everything:
//  · the MARCHLIGHT theme, in B♭ Lydian: F–B♭–C rising, and the raised E that lifts it (bar 3);
//  · the MARCH, in 7/8 grouped 2+2+3, a giant's uneven stride, in G minor;
//  · the STILLNESS, E against B♭: a tritone that never resolves. It is the same E that lifts the
//    theme, turned cold.
// Every cue is a variation on one of them, so the city has one voice from title to epilogue.
import { rng, clamp } from './util.js';

export const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
export const N = name => {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name); const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  return base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3]) + 1) * 12;
};
// "F4:1 Bb4:1 C5:2 | r:1 ..." -> [{ m, t, d }] in beats (whatever unit the cue counts in)
export function mel(str) {
  const out = []; let t = 0;
  for (const tok of str.trim().split(/\s+/)) {
    if (tok === '|') continue;
    const [n, d = '1'] = tok.split(':'), dur = parseFloat(d);
    if (n !== 'r') out.push({ m: N(n), t, d: dur });
    t += dur;
  }
  out.len = t; return out;
}
const aug = (notes, k) => Object.assign(notes.map(n => ({ m: n.m, t: n.t * k, d: n.d * k })), { len: notes.len * k });
const V = s => s.trim().split(/\s+/).map(N);

// chord voicings: bass | upper voices (open, cinematic spacing)
const HS = {
  Bb: 'Bb1|F3 Bb3 D4 F4', Gm: 'G1|D3 G3 Bb3 D4', Gm7: 'G1|F3 Bb3 D4 F4', Gm9: 'G1|F3 Bb3 D4 A4', C: 'C2|E3 G3 C4 E4',
  Ebmaj7: 'Eb2|G3 Bb3 D4 G4', Ebmaj9: 'Eb2|G3 Bb3 D4 F4', Fsus: 'F2|C3 F3 Bb3 C4', F: 'F2|C3 F3 A3 C4', Cm7: 'C2|Eb3 G3 Bb3 C4',
  Ebm6: 'Eb2|Gb3 Bb3 C4 Eb4', Dm7: 'D2|F3 A3 C4 F4', Dm9: 'D2|F3 A3 C4 E4', Bbmaj7s11: 'Bb1|D3 F3 A3 E4', Csus2: 'C2|G3 C4 D4 G4',
  Ab: 'Ab1|Eb3 Ab3 C4 Eb4', D: 'D2|F#3 A3 D4 F#4', Eb: 'Eb2|G3 Bb3 Eb4 G4', Cm: 'C2|Eb3 G3 C4 Eb4', Dm: 'D2|F3 A3 D4 F4',
  Fmaj7: 'F2|C3 E3 A3 E4', G: 'G1|D3 G3 B3 D4', Bbadd9: 'Bb1|F3 C4 D4 F4', Am7: 'A1|E3 G3 C4 E4',
};
const HC = {};
for (const [k, v] of Object.entries(HS)) { const [b, u] = v.split('|'); HC[k] = { b: N(b), v: V(u) }; }
const third = c => (c.v.some(m => (m - c.b) % 12 === 3) ? 3 : 4);

// ---- the themes
const TH = {
  A: mel('F4:1 Bb4:1 C5:2 | D5:1.5 C5:.5 Bb4:1 F4:1 | G4:1 A4:1 Bb4:1 E5:1 | D5:4'),
  A2: mel('F4:1 Bb4:1 C5:2 | D5:1.5 Eb5:.5 F5:2 | G5:1 F5:1 D5:1 C5:.5 Bb4:.5 | C5:4'),
  B: mel('Bb5:2 A5:1 F5:1 | G5:3 D5:1 | Eb5:1 D5:1 C5:1 Bb4:1 | C5:2 F4:2'),
  C: mel('F4:1 Bb4:1 C5:2 | D5:1.5 C5:.5 Bb4:1 G4:1 | A4:2 C5:1 A4:1 | Bb4:4'),
  // the theme turned minor (Rook alone, at night)
  Am: mel('D4:1 G4:1 A4:2 | Bb4:1.5 A4:.5 G4:1 D4:1 | Eb4:1 F4:1 G4:1 C5:1 | Bb4:2 A4:2'),
  // a gentle answer over the subdominant (morning)
  M: mel('G5:2 F5:1 Eb5:1 | D5:3 Bb4:1 | Eb5:2 D5:1 C5:1 | C5:4 | Bb4:1 C5:1 D5:1 G5:1 | F5:3 D5:1 | D5:2 C5:1 Bb4:1 | C5:4'),
};
const TH_H = { A: ['Bb', 'Gm', 'C', 'Ebmaj7'], A2: ['Bb', 'Gm7', 'Ebmaj9', ['Fsus', 'F']], B: ['Gm9', 'Ebmaj7', ['Cm7', 'Ebm6'], ['Fsus', 'F']], C: ['Bb', 'Gm', 'Dm7', 'Bb'] };
const THEME_H = [...TH_H.A, ...TH_H.A2, ...TH_H.B, ...TH_H.C];
// the march, in eighths (7/8, 2+2+3)
const CT1 = mel('D4:2 G4:2 A4:3 | Bb4:2 A4:1 G4:1 D4:3 | Eb4:2 F4:2 G4:3 | F#4:4 D4:3');
const CT2 = mel('D5:2 G5:2 A5:3 | Bb5:2 A5:1 G5:1 F5:3 | Eb5:2 D5:2 C5:3 | D5:7');
const CT3 = mel('G4:2 Ab4:2 G4:3 | F4:2 Eb4:2 D4:3 | Eb4:2 F4:2 G4:3 | F#4:4 A4:3');
// the market dance (6/8), the theme as a folk tune in G dorian; the busker plays it too
const MK_A = mel('D5:2 G5:1 A5:3 | Bb5:1 A5:1 G5:1 E5:3 | F5:2 E5:1 D5:2 C5:1 | D5:6');
const MK_B = mel('F5:2 Bb5:1 C6:3 | D6:2 C6:1 Bb5:3 | A5:1 Bb5:1 C6:1 G5:3 | A5:6');
// Chapter One: "Underfoot" — the surface. D minor with a Lydian ache.
const UF = mel('A4:1 D5:1 E5:2 | F5:1.5 E5:.5 C5:2 | D5:1 A4:1 E5:2 | D5:4');
const UF_HOME = mel('C4:1 F4:1 G4:2 | A4:1.5 G4:.5 F4:1 C4:1 | D4:1 E4:1 F4:1 B4:1 | A4:4'); // the theme, remembered, in F

const VOW = { ah: [[730, 1], [1090, 0.5], [2440, 0.22], [3300, 0.16]], oo: [[300, 1], [870, 0.3], [2240, 0.1], [3300, 0.16]], eh: [[530, 1], [1840, 0.4], [2480, 0.2], [3300, 0.16]] };
const SOP = { ah: [[850, 1], [1220, 0.45], [2810, 0.25]], oo: [[380, 1], [950, 0.25], [2700, 0.1]] };
const BELLS = {
  celesta: { ratio: 4, index: 1.1, idecay: 0.35, att: 0.002, T: 2.4, oct: 0.12, ch: 'celesta' },
  glass: { ratio: 1.4142, index: 0.55, idecay: 3, att: 0.9, T: 6.5, ch: 'glass' },
  bell: { ratio: 3.5, index: 2.4, idecay: 2, att: 0.002, T: 5, ch: 'celesta' },
  ping: { ratio: 2, index: 1.6, idecay: 0.1, att: 0.002, T: 1.1, ch: 'celesta' },
};
const LINE = {
  flute: { rate: 5.0, depth: 9, att: 0.035, rel: 0.09, glide: 0.03 },
  horn: { rate: 4.6, depth: 5, att: 0.06, rel: 0.13, glide: 0.045 },
  cello: { rate: 5.5, depth: 13, att: 0.08, rel: 0.2, glide: 0.06 },
  voice: { rate: 5.3, depth: 20, att: 0.11, rel: 0.28, glide: 0.07 },
  reed: { rate: 5.8, depth: 4, att: 0.02, rel: 0.06, glide: 0.02 },
};
// mixer: pan, hall send, delay send, level
const CH = {
  strHi: [-0.35, 0.55, 0, 1], strLo: [0.3, 0.45, 0, 1.1], choir: [0, 0.85, 0, 1.25],
  horn: [-0.15, 0.55, 0, 0.9], brass: [-0.05, 0.5, 0, 0.8], flute: [0.22, 0.5, 0.12, 0.8], cello: [0.18, 0.45, 0, 0.9], voice: [0, 0.8, 0.1, 0.75],
  reed: [-0.25, 0.3, 0, 0.6], harp: [0.45, 0.5, 0.18, 0.75], cimb: [-0.3, 0.35, 0.12, 0.7], celesta: [0.3, 0.55, 0.35, 0.55], glass: [0, 0.9, 0.3, 0.5],
  taiko: [0, 0.45, 0, 0.85], perc: [0.12, 0.3, 0, 0.6], shaker: [0.35, 0.2, 0, 0.4], fx: [0, 0.7, 0, 0.8], drone: [0, 0.3, 0, 0.5], bass: [0, 0.12, 0, 0.6],
};

// channel inserts, built once per bus: string body EQ, choir air filter, and an ensemble chorus
// (two modulated delays panned wide) so each note needs only a couple of oscillators
const FX = { strHi: { eq: 'str', chorus: 0.5 }, strLo: { eq: 'str', chorus: 0.35 }, choir: { eq: 'choir', chorus: 0.9 }, brass: { chorus: 0.4 } };

export class Score {
  constructor(ctx, dest, { audio = null, offline = false, mute = [] } = {}) {
    this.ctx = ctx; this.mute = new Set(mute); this.audio = audio; this.r = rng(7);
    this.cue = null; this.bus = null; this.bar = 0; this.k = 0; this.next = 0; this.spb = 0.5;
    this.ks = new Map(); this.diegetic = new Map();
    // glue: gentle bus compression, then out
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 12; comp.ratio.value = 2.5; comp.attack.value = 0.03; comp.release.value = 0.4;
    const lim = ctx.createDynamicsCompressor(); lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.15;
    // master EQ: clear the subsonics, trim the mud, open up the air
    const hp = this.F('highpass', 30, 0.7), ls = this.F('lowshelf', 110, 0.7, -3), mud = this.F('peaking', 320, 0.9, -2), pres = this.F('peaking', 2800, 0.8, 2.5), air = this.F('highshelf', 6500, 0.7, 5);
    this.master = this.G(1); const mk = this.G(0.55);
    this.master.connect(hp); hp.connect(ls); ls.connect(mud); mud.connect(pres); pres.connect(air); air.connect(comp); comp.connect(mk); mk.connect(lim); lim.connect(dest);
    // a concert hall: long, dark tail with early reflections
    this.hall = ctx.createConvolver(); this.hall.buffer = this._hallIR(4.6);
    const hr = this.G(0.85); this.hall.connect(hr); hr.connect(this.master);
    // stereo ping-pong delay for bells and plucks, feeding the hall
    this.delayIn = this.G(1);
    const dl = ctx.createDelay(2), dr = ctx.createDelay(2), fb = this.G(0.32), dlp = this.F('lowpass', 3200, 0.5), mg = ctx.createChannelMerger(2), dout = this.G(0.5);
    this.dl = dl; this.dr = dr;
    this.delayIn.connect(dlp); dlp.connect(dl); dl.connect(dr); dr.connect(fb); fb.connect(dl);
    dl.connect(mg, 0, 0); dr.connect(mg, 0, 1); mg.connect(dout); dout.connect(this.master); dout.connect(this.hall);
    const len = ctx.sampleRate * 2; this.white = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = this.white.getChannelData(0); for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;
    if (!offline) this.timer = setInterval(() => this._tick(), 50);
  }
  get t() { return this.ctx.currentTime; }

  // ---------------------------------------------------------------- transport
  play(name, fade = 2) {
    if (this.cue === name) return;
    const t = this.t, old = this.bus;
    if (old) {
      for (const g of [old.g, old.w, old.d]) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t); g.gain.setTargetAtTime(0.0001, t, Math.max(0.05, fade / 3)); }
      setTimeout(() => { for (const g of [old.g, old.w, old.d]) try { g.disconnect(); } catch { /* */ } old.oscs.forEach(o => { try { o.stop(); } catch { /* */ } }); }, fade * 1000 + 8000);
    }
    this.cue = name; this.bus = null;
    const def = CUES[name]; if (!def) return;
    this.bus = this._bus(); const lv = def.gain ?? 0.8;
    for (const g of [this.bus.g, this.bus.w, this.bus.d]) g.gain.setTargetAtTime(lv, t, Math.max(0.03, fade / 3));
    this.bar = 0; this.k = 0; this.next = t + 0.08; this.spb = 60 / def.bpm; this.jumpTo = null; this.marked = new Set();
    const dly = def.delay ?? this.spb * 0.75;
    this.dl.delayTime.setValueAtTime(dly, t); this.dr.delayTime.setValueAtTime(dly, t);
  }
  stop(fade = 2) { this.play(null, fade); this.cue = null; }
  // jump to a named section of the running cue at the next bar line (adaptive music)
  mark(name) { const m = CUES[this.cue]?.marks?.[name]; if (m != null && !this.marked?.has(name)) { this.jumpTo = m; (this.marked ||= new Set()).add(name); } }
  // one-shot flourishes on their own bus, independent of the running cue
  sting(name) {
    const fn = STINGS[name]; if (!fn) return;
    const keep = this.bus; this.bus = this._bus(); for (const g of [this.bus.g, this.bus.w, this.bus.d]) g.gain.value = 0.9;
    const sb = this.bus;
    try { fn(this, this.t + 0.05); } finally { this.bus = keep; }
    setTimeout(() => sb.oscs.forEach(o => { try { o.stop(); } catch { /* */ } }), 15000);
  }
  _bus() {
    const b = { g: this.G(0.0001), w: this.G(0.0001), d: this.G(0.0001), ch: {}, oscs: [] };
    b.g.connect(this.master); b.w.connect(this.hall); b.d.connect(this.delayIn); return b;
  }
  _tick(h = this.t + 0.35) {
    const def = CUES[this.cue]; if (!def || !this.bus) return;
    while (this.next < h) {
      if (this.jumpTo != null) { this.bar = this.jumpTo; this.jumpTo = null; }
      if (def.len && this.bar >= def.len) { this.bar = def.back ?? 0; this.k++; }
      const m = typeof def.meter === 'function' ? def.meter(this.bar) : def.meter;
      try { def.bar(this, this.bar, this.next, this.spb, this.k); } catch (e) { console.error('score', this.cue, e); }
      this.next += m * this.spb; this.bar++;
    }
  }
  // offline rendering (tools/music.mjs): schedule everything up to `secs`
  renderTo(secs) { this._tick(secs); }

  // ---------------------------------------------------------------- plumbing
  G(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  F(type, f, q = 0.7, gain = 0) { const x = this.ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; x.Q.value = q; x.gain.value = gain; return x; }
  O(type, f, t0, t1) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t0); o.stop(t1); return o; }
  Nz(t0, t1) { const s = this.ctx.createBufferSource(); s.buffer = this.white; s.loop = true; s.start(t0, this.r() * 1.5); s.stop(t1); return s; }
  hz() { return (this.r() - 0.5) * 0.012; }
  chan(name) {
    const b = this.bus; if (b.ch[name]) return b.ch[name];
    const [pan, wet, dly, lvl] = CH[name], fx = FX[name], g = this.G(lvl), p = this.ctx.createStereoPanner(); p.pan.value = pan;
    let head = g;
    if (fx?.eq === 'str') { const hp = this.F('highpass', 62, 0.7), body = this.F('peaking', 290, 1.1, 4), pres = this.F('peaking', 2400, 1, 2.5); g.connect(hp); hp.connect(body); body.connect(pres); head = pres; }
    if (fx?.eq === 'choir') { const lp = this.F('lowpass', 4600, 0.5); g.connect(lp); head = lp; }
    head.connect(p); p.connect(b.g);
    if (fx?.chorus) { // two delays, slowly modulated, panned to the sides
      const t = this.t, tEnd = t + 3600;
      [[0.013, 0.31, -0.8], [0.021, 0.43, 0.8]].forEach(([d, rate, pn]) => {
        const dl = this.ctx.createDelay(0.05); dl.delayTime.value = d; const lfo = this.O('sine', rate, t, tEnd), lg = this.G(0.0022); lfo.connect(lg); lg.connect(dl.delayTime); b.oscs.push(lfo);
        const cg = this.G(fx.chorus), cp = this.ctx.createStereoPanner(); cp.pan.value = pn; head.connect(dl); dl.connect(cg); cg.connect(cp); cp.connect(b.g);
        if (wet) { const s2 = this.G(wet * 0.7); cp.connect(s2); s2.connect(b.w); }
      });
    }
    if (wet) { const s = this.G(wet); p.connect(s); s.connect(b.w); }
    if (dly) { const s = this.G(dly); p.connect(s); s.connect(b.d); }
    return (b.ch[name] = g);
  }
  _hallIR(sec) {
    const sr = this.ctx.sampleRate, len = Math.floor(sr * sec), buf = this.ctx.createBuffer(2, len, sr), pre = Math.floor(sr * 0.018);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c); let lp = 0;
      for (let i = pre; i < len; i++) {
        const tt = (i - pre) / sr, damp = 0.9 - 0.78 * Math.min(1, tt / sec); // highs die first
        lp += damp * ((Math.random() * 2 - 1) - lp);
        d[i] = lp * Math.exp(-tt * 6.9 / sec) * Math.min(1, (i - pre) / (sr * 0.03));
      }
      for (let j = 0; j < 9; j++) { const i = pre + Math.floor(sr * (0.006 + j * 0.0093 * (c ? 1.13 : 1))); if (i < len) d[i] += (j % 2 ? -1 : 1) * 0.6 * Math.pow(0.78, j); }
    }
    return buf;
  }

  // ---------------------------------------------------------------- instruments
  // Karplus–Strong strings: harp (soft, long), cimbalom (hammered, two strings a few cents apart), bass
  _ks(midi, kind) {
    const key = kind + midi; let buf = this.ks.get(key); if (buf) return buf;
    const sr = this.ctx.sampleRate, f = NOTE(midi);
    const T60 = (kind === 'harp' ? 3.4 : kind === 'bass' ? 1.5 : 2.4) * clamp(1.35 - (midi - 48) / 60, 0.45, 1.4);
    const len = Math.floor(sr * Math.min(5, T60 + 0.2)), out = new Float32Array(len);
    const det = kind === 'cimb' ? [-3.5, 3.5] : [0], soft = kind === 'harp' ? 0.3 : kind === 'bass' ? 0.16 : 0.75, pickPos = kind === 'cimb' ? 0.11 : 0.27;
    for (const c of det) {
      const D = sr / (f * Math.pow(2, c / 1200)), rho = Math.pow(10, -3 / (T60 * f)), y = new Float32Array(len);
      const exLen = Math.ceil(D), pick = Math.max(1, Math.round(D * pickPos)), ex = new Float32Array(exLen); let lv = 0;
      for (let i = 0; i < exLen; i++) { lv += soft * ((this.r() * 2 - 1) - lv); ex[i] = lv; }
      const d0 = D - 0.5, d1 = D + 0.5;
      for (let n = 0; n < len; n++) {
        let v = n < exLen ? ex[n] - (n >= pick ? ex[n - pick] : 0) : 0;
        if (n > d1 + 1) {
          let x = n - d0, i = Math.floor(x), fr = x - i; const a = y[i] * (1 - fr) + y[i + 1] * fr;
          x = n - d1; i = Math.floor(x); fr = x - i; const b = y[i] * (1 - fr) + y[i + 1] * fr;
          v += rho * 0.5 * (a + b);
        }
        y[n] = v;
      }
      for (let n = 0; n < len; n++) out[n] += y[n] / det.length;
    }
    let pk = 1e-6; for (let n = 0; n < len; n++) pk = Math.max(pk, Math.abs(out[n]));
    const fade = Math.floor(sr * 0.05);
    for (let n = 0; n < len; n++) out[n] *= (0.9 / pk) * (n > len - fade ? (len - n) / fade : 1);
    buf = this.ctx.createBuffer(1, len, sr); buf.copyToChannel(out, 0); this.ks.set(key, buf); return buf;
  }
  pluck(kind, midi, t, vel = 0.5, dur = 0, dest = null) {
    if (this.mute.has('pluck')) return;
    const buf = this._ks(midi, kind), src = this.ctx.createBufferSource(); src.buffer = buf;
    const lp = this.F('lowpass', kind === 'harp' ? 1600 + vel * 4200 : kind === 'bass' ? 700 + vel * 1400 : 2600 + vel * 6000, 0.6), g = this.G(vel);
    src.connect(lp); lp.connect(g); g.connect(dest || this.chan(kind));
    src.start(t);
    if (dur) { g.gain.setValueAtTime(vel, t + dur); g.gain.setTargetAtTime(0.0001, t + dur, 0.07); src.stop(t + dur + 0.6); } else src.stop(t + buf.duration);
  }
  // FM bells: celesta, glass (slow bloom), bell, ping
  bell(kind, midi, t, vel = 0.4, { att = null, T = null, dest = null } = {}) {
    if (this.mute.has('bell')) return;
    const P = BELLS[kind], f = NOTE(midi), A = att ?? P.att, end = t + (T ?? P.T) + 0.1;
    const car = this.O('sine', f, t, end), mod = this.O('sine', f * P.ratio, t, end), mg = this.G(0);
    mg.gain.setValueAtTime(f * P.index, t); mg.gain.exponentialRampToValueAtTime(f * P.index * 0.04 + 0.5, t + P.idecay);
    mod.connect(mg); mg.connect(car.frequency);
    const g = this.G(0); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + A); g.gain.exponentialRampToValueAtTime(0.0001, end);
    car.connect(g);
    if (P.oct) { const o2 = this.O('sine', f * 2, t, end), g2 = this.G(P.oct); o2.connect(g2); g2.connect(g); }
    g.connect(dest || this.chan(P.ch));
  }
  // a reversed-sounding bloom that cuts off on the beat
  swell(midi, t, dur, vel = 0.3) {
    if (this.mute.has('swell')) return;
    const f = NOTE(midi), end = t + dur + 0.08, g = this.G(0);
    for (const [m, a] of [[1, 1], [2.01, 0.35], [3.98, 0.12]]) { const o = this.O('sine', f * m, t, end), og = this.G(a); o.connect(og); og.connect(g); }
    const nz = this.Nz(t, end), bp = this.F('bandpass', f * 4, 2), ng = this.G(0.25); nz.connect(bp); bp.connect(ng); ng.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + dur); g.gain.linearRampToValueAtTime(0.0001, end);
    g.connect(this.chan('glass'));
  }
  note(kind, midi, t, vel, dur) {
    if (kind === 'harp' || kind === 'cimb' || kind === 'bass') this.pluck(kind, midi, t, vel, kind === 'cimb' ? 0 : 0);
    else this.bell(kind, midi, t, vel);
  }
  seq(kind, notes, t0, spb, vel = 0.4, tr = 0) {
    for (const n of notes) this.note(kind, n.m + tr, t0 + n.t * spb + this.hz(), vel * (0.88 + this.r() * 0.24), n.d * spb);
  }
  // arpeggio over a chord (tones + an octave above), pattern of indices
  arp(kind, ms, t, step, count, vel = 0.3, { pat = null, oct = 12, tr = 0 } = {}) {
    const tones = [...ms, ...ms.map(m => m + oct)], P = pat || [0, 1, 2, 3, 4, 3, 2, 1];
    for (let i = 0; i < count; i++) this.note(kind, tones[P[i % P.length] % tones.length] + tr, t + i * step + this.hz(), vel * (i % 4 === 0 ? 1 : 0.78) * (0.9 + this.r() * 0.2), step);
  }
  // formant choir; vowels morph over the note (oo → ah opens up a swell)
  choir(midis, t, dur, vel = 0.3, { vowel = 'oo', to = null, att = null, rel = 1.7, hits = null } = {}) {
    if (this.mute.has('choir')) return;
    const A = att ?? Math.min(1.8, dur * 0.35), end = t + (hits ? Math.max(...hits.map(h => h[0] + h[1])) : dur) + rel;
    {
      const ms = midis;
      const sum = this.G(1), out = this.G(1), env = this.G(0);
      VOW[vowel].forEach(([fr, a], i) => {
        const bp = this.F('bandpass', fr, 6); sum.connect(bp); const ag = this.G(a * 2.8); bp.connect(ag); ag.connect(out);
        if (to) { bp.frequency.setValueAtTime(fr, t); bp.frequency.linearRampToValueAtTime(VOW[to][i][0], t + dur * 0.7); }
      });
      out.connect(env); env.connect(this.chan('choir'));
      if (hits) for (const [o, d, v] of hits) { const s0 = t + o; env.gain.setValueAtTime(0.0001, s0); env.gain.linearRampToValueAtTime(vel * v, s0 + A); env.gain.setValueAtTime(vel * v, s0 + Math.max(A, d)); env.gain.exponentialRampToValueAtTime(0.0001, s0 + d + rel); }
      else { env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(vel, t + A); env.gain.setValueAtTime(vel, t + Math.max(A, dur)); env.gain.exponentialRampToValueAtTime(0.0001, end); }
      const lfo = this.O('sine', 5 + this.r() * 0.6, t, end), lg = this.G(0); lfo.connect(lg); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(10, t + Math.min(1.2, dur * 0.5));
      for (const m of ms) for (const d of ms.length > 1 ? [-9, 8] : [-11, 0, 10]) { const o = this.O('sawtooth', NOTE(m), t, end); o.detune.value = d + (this.r() - 0.5) * 6; lg.connect(o.detune); o.connect(sum); }
      const nz = this.Nz(t, end), bp = this.F('bandpass', 3000, 0.8), ng = this.G(0.05); nz.connect(bp); bp.connect(ng); ng.connect(env);
    }
  }
  // string ensemble: legato, spiccato or tremolo; low notes to the cellos, high to the violins
  strings(midis, t, dur, vel = 0.4, { art = 'leg', ch = null } = {}) {
    if (this.mute.has('strings')) return;
    const groups = ch ? [[ch, midis]] : [['strLo', midis.filter(m => m < 55)], ['strHi', midis.filter(m => m >= 55)]];
    for (const [cn, ms] of groups) {
      if (!ms.length) continue;
      const spicc = art === 'spicc', rel = spicc ? 0.14 : 0.95, end = t + dur + rel + 0.1;
      const sum = this.G(1), lp = this.F('lowpass', spicc ? 3200 + vel * 3000 : 2600 + vel * 4200, 0.6), env = this.G(0);
      sum.connect(lp);
      if (art === 'trem') { const trm = this.G(0.55), tl = this.O('sine', 12 + this.r(), t, end), tg = this.G(0.45); tl.connect(tg); tg.connect(trm.gain); lp.connect(trm); trm.connect(env); } else lp.connect(env);
      env.connect(this.chan(cn));
      const g = env.gain;
      if (spicc) { g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(vel, t + 0.006); g.exponentialRampToValueAtTime(vel * 0.25, t + Math.min(dur, 0.12)); g.exponentialRampToValueAtTime(0.0001, t + dur + rel); }
      else { const A = clamp(dur * 0.3, 0.15, 0.9); g.setValueAtTime(0.0001, t); g.linearRampToValueAtTime(vel, t + A); g.setValueAtTime(vel, t + Math.max(A, dur)); g.exponentialRampToValueAtTime(0.0001, t + dur + rel); }
      const det = spicc ? [-6, 6] : ms.length > 1 ? [-8, 8] : [-11, 0, 10];
      let lg = null;
      if (!spicc) { const lfo = this.O('sine', 5.3 + this.r() * 0.5, t, end); lg = this.G(0); lfo.connect(lg); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(7, t + 0.6); }
      for (const m of ms) for (const d of det) { const o = this.O('sawtooth', NOTE(m), t, end); o.detune.value = d + (this.r() - 0.5) * 5; if (lg) lg.connect(o.detune); const vg = this.G(1 / det.length); o.connect(vg); vg.connect(sum); }
      if (spicc) { const nz = this.Nz(t, t + 0.06), bp = this.F('bandpass', 3500, 1), ng = this.G(0); ng.gain.setValueAtTime(vel * 0.25, t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.035); nz.connect(bp); bp.connect(ng); ng.connect(this.chan(cn)); }
    }
  }
  // a gated ostinato: one bowed voice for a whole figure (cheap: one pair of oscillators per bar)
  gate(ch, seq, t, step, { len = 0.85, bright = 2600, vel = 1 } = {}) {
    if (this.mute.has('gate')) return;
    const end = t + seq.length * step + 0.4, lp = this.F('lowpass', bright, 0.8), body = this.F('peaking', 300, 1, 4), env = this.G(0);
    const os = [-7, 7].map(d => { const o = this.O('sawtooth', 220, t - 0.01, end); o.detune.value = d; o.connect(body); return o; });
    body.connect(lp); lp.connect(env); env.connect(this.chan(ch)); env.gain.setValueAtTime(0.0001, t);
    seq.forEach((n, i) => {
      if (!n) return; const s = t + i * step + this.hz() * 0.5, v = n.v * vel * 0.5, f = NOTE(n.m);
      os.forEach(o => o.frequency.setValueAtTime(f, s));
      env.gain.setValueAtTime(0.0001, s); env.gain.linearRampToValueAtTime(v, s + 0.006); env.gain.exponentialRampToValueAtTime(v * 0.3, s + Math.min(0.1, step * len * 0.6)); env.gain.exponentialRampToValueAtTime(0.0001, s + step * len);
    });
  }
  // brass (and the accordion-like reed) chords: stabs and swells
  brass(midis, t, dur, vel = 0.5, { tone = 'brass', att = 0.03, hits = null } = {}) {
    if (this.mute.has('brass')) return;
    if (hits) { // several stabs on one voice set
      const reed = tone === 'reed', last = Math.max(...hits.map(h => h[0] + h[1])), end = t + last + 0.5;
      const sum = this.G(1 / Math.max(2, midis.length * 1.2)), lp = this.F('lowpass', 260, reed ? 1.4 : 0.8), env = this.G(0);
      lp.frequency.setValueAtTime(260, t); env.gain.setValueAtTime(0.0001, t);
      for (const [o, d, v] of hits) { const s0 = t + o, pk = reed ? 2400 : 700 + vel * v * 2800;
        lp.frequency.setValueAtTime(260, s0); lp.frequency.linearRampToValueAtTime(pk, s0 + att + 0.04); lp.frequency.setTargetAtTime(260, s0 + d, 0.1);
        env.gain.setValueAtTime(0.0001, s0); env.gain.linearRampToValueAtTime(vel * v, s0 + att); env.gain.setValueAtTime(vel * v, s0 + Math.max(att, d)); env.gain.exponentialRampToValueAtTime(0.0001, s0 + d + 0.3); }
      let lastN = lp; if (reed) { const pkf = this.F('peaking', 1200, 1.2, 6); lp.connect(pkf); lastN = pkf; }
      sum.connect(lp); lastN.connect(env); env.connect(this.chan(reed ? 'reed' : 'brass'));
      for (const m of midis) for (const [type, d] of reed ? [['square', -12], ['sawtooth', 12]] : [['sawtooth', -6], ['sawtooth', 6]]) { const o = this.O(type, NOTE(m), t, end); o.detune.value = d; o.connect(sum); }
      return;
    }
    const reed = tone === 'reed', end = t + dur + 0.5;
    const sum = this.G(1 / Math.max(2, midis.length * 1.2)), lp = this.F('lowpass', 260, reed ? 1.4 : 0.8), env = this.G(0);
    const peak = reed ? 2400 : 700 + vel * 2800;
    lp.frequency.setValueAtTime(260, t); lp.frequency.linearRampToValueAtTime(peak, t + att + 0.04); lp.frequency.setTargetAtTime(peak * 0.65, t + att + 0.08, 0.25); lp.frequency.setTargetAtTime(260, t + dur, 0.12);
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(vel, t + att); env.gain.setValueAtTime(vel, t + Math.max(att, dur)); env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
    let last = lp; if (reed) { const pk = this.F('peaking', 1200, 1.2, 6); lp.connect(pk); last = pk; }
    sum.connect(lp); last.connect(env); env.connect(this.chan(reed ? 'reed' : 'brass'));
    for (const m of midis) for (const [type, d] of reed ? [['square', -12], ['sawtooth', 12]] : [['sawtooth', -6], ['sawtooth', 6]]) { const o = this.O(type, NOTE(m), t, end); o.detune.value = d; o.connect(sum); }
  }
  // expressive monophonic line: one voice through the whole phrase, slurs glide, long notes swell
  line(kind, notes, t0, spb, { vel = 0.55, tr = 0, ch = null, vowel = 'ah' } = {}) {
    if (this.mute.has('line')) return;
    if (!notes.length) return;
    const last = notes[notes.length - 1], P = LINE[kind];
    const T0 = t0 + notes[0].t * spb, T1 = t0 + (last.t + last.d) * spb, end = T1 + 2;
    const amp = this.G(0); amp.gain.setValueAtTime(0.0001, T0 - 0.02);
    const oscs = [], mults = [], pre = this.G(1); let breath = null, hornLp = null;
    const add = (type, mult, a, dest, det = 0) => { const o = this.O(type, 440, T0 - 0.03, end), g = this.G(a); o.detune.value = det; o.connect(g); g.connect(dest); oscs.push(o); mults.push(mult); return o; };
    if (kind === 'flute') {
      const lp = this.F('lowpass', 5200, 0.5); pre.connect(lp); lp.connect(amp);
      add('sine', 1, 0.8, pre); add('triangle', 1, 0.16, pre); add('sine', 2, 0.05, pre);
      const nz = this.Nz(T0 - 0.03, end); breath = this.F('bandpass', 1000, 1.4); const ng = this.G(0.2); nz.connect(breath); breath.connect(ng); ng.connect(pre);
    } else if (kind === 'horn') {
      hornLp = this.F('lowpass', 400, 0.7); pre.connect(hornLp); hornLp.connect(amp);
      add('sawtooth', 1, 0.45, pre, -5); add('sawtooth', 1, 0.45, pre, 5); add('sine', 0.5, 0.3, amp);
    } else if (kind === 'cello') {
      const hp = this.F('highpass', 58, 0.7), b1 = this.F('peaking', 250, 1, 5), b2 = this.F('peaking', 1500, 1.2, 3), lp = this.F('lowpass', 3400, 0.6);
      pre.connect(hp); hp.connect(b1); b1.connect(b2); b2.connect(lp); lp.connect(amp);
      add('sawtooth', 1, 0.5, pre, -4); add('sawtooth', 1, 0.5, pre, 4);
      const nz = this.Nz(T0 - 0.03, end), bp = this.F('bandpass', 2400, 0.8), ng = this.G(0.03); nz.connect(bp); bp.connect(ng); ng.connect(pre);
    } else if (kind === 'voice') {
      const out = this.G(1), lp = this.F('lowpass', 5000, 0.5); out.connect(lp); lp.connect(amp);
      for (const [fr, a] of SOP[vowel]) { const bp = this.F('bandpass', fr, 7); pre.connect(bp); const ag = this.G(a * 3.2); bp.connect(ag); ag.connect(out); }
      add('sawtooth', 1, 1, pre);
      const nz = this.Nz(T0 - 0.03, end), bp = this.F('bandpass', 3200, 1), ng = this.G(0.04); nz.connect(bp); bp.connect(ng); ng.connect(out);
    } else if (kind === 'reed') {
      const pk = this.F('peaking', 1100, 1.2, 6), lp = this.F('lowpass', 2800, 0.6); pre.connect(pk); pk.connect(lp); lp.connect(amp);
      add('square', 1, 0.3, pre, -12); add('sawtooth', 1, 0.3, pre, 12);
    }
    const lfo = this.O('sine', P.rate, T0, end), lg = this.G(0); lfo.connect(lg); oscs.forEach(o => lg.connect(o.detune));
    notes.forEach((n, i) => {
      const s = t0 + n.t * spb + this.hz(), e = t0 + (n.t + n.d) * spb, f = NOTE(n.m + tr), len = e - s;
      const prev = notes[i - 1], next = notes[i + 1];
      const slurIn = prev && Math.abs(prev.t + prev.d - n.t) < 0.01, slurOut = next && Math.abs(n.t + n.d - next.t) < 0.01;
      oscs.forEach((o, j) => {
        const ff = f * mults[j];
        if (!slurIn) { o.frequency.setValueAtTime(kind === 'horn' ? ff * 0.985 : ff, s); if (kind === 'horn') o.frequency.setTargetAtTime(ff, s, 0.04); } else o.frequency.setTargetAtTime(ff, s, P.glide);
      });
      if (breath) breath.frequency.setTargetAtTime(f * 2, s, 0.02);
      const v = vel * (0.82 + 0.28 * Math.sin(Math.PI * (i + 0.5) / notes.length)) * (len > 1.2 ? 1.05 : 1), g = amp.gain;
      g.setTargetAtTime(v, s, slurIn ? 0.05 : P.att);
      if (len > 1.0) { g.setTargetAtTime(v * 0.86, s + 0.25, 0.3); g.setTargetAtTime(v * 1.05, s + len * 0.55, len * 0.25); }
      lg.gain.setTargetAtTime(0, s, 0.04); if (len > 0.35) lg.gain.setTargetAtTime(P.depth, s + Math.min(0.35, len * 0.4), 0.25);
      if (!slurOut) g.setTargetAtTime(0.0001, e - Math.min(0.06, len * 0.2), P.rel);
      if (hornLp) { hornLp.frequency.setTargetAtTime(380 + v * 3000, s, 0.08); if (!slurOut) hornLp.frequency.setTargetAtTime(300, e - 0.05, 0.15); }
      if (kind === 'flute' && !slurIn) { const nz = this.Nz(s, s + 0.08), hp = this.F('highpass', 2500, 0.7), cg = this.G(0); cg.gain.setValueAtTime(v * 0.18, s); cg.gain.exponentialRampToValueAtTime(0.0001, s + 0.06); nz.connect(hp); hp.connect(cg); cg.connect(amp); }
    });
    amp.connect(this.chan(ch || kind));
  }
  // ---- percussion & effects
  // percussion is synthesized once into sample buffers (in plain JS) and replayed: one node per hit
  _perc(kind, size = 1) {
    const key = kind + size; let buf = this.ks.get(key); if (buf) return buf;
    const sr = this.ctx.sampleRate, dur = { taiko: 1.2 * size, frame: 0.42, slap: 0.12, shaker: 0.1, tick: 0.04, anvil: 0.8 }[kind];
    const len = Math.floor(sr * dur), out = new Float32Array(len); let ph = 0, lp = 0, hp = 0, prev = 0;
    const onePole = fc => 1 - Math.exp(-2 * Math.PI * fc / sr), rnd = () => this.r() * 2 - 1;
    for (let i = 0; i < len; i++) {
      const t = i / sr, att = Math.min(1, t / 0.003); let v = 0;
      if (kind === 'taiko') {
        const f = (105 / size) * Math.pow(0.48, Math.min(1, t / (0.3 * size))); ph += 2 * Math.PI * f / sr;
        lp += onePole(900 / size + 200) * (rnd() - lp);
        v = Math.sin(ph) * Math.exp(-t * 6.9 / (1.1 * size)) + lp * 2.2 * Math.exp(-t * 6.9 / (0.18 * size));
      } else if (kind === 'frame' || kind === 'slap') {
        const slap = kind === 'slap', f = (slap ? 330 : 190) * Math.pow(slap ? 0.79 : 0.74, Math.min(1, t / 0.2)); ph += 2 * Math.PI * f / sr;
        const x = rnd(); lp += onePole(slap ? 2600 : 1300) * (x - lp); hp = lp - prev * 0.6; prev = lp;
        v = Math.sin(ph) * (slap ? 0.35 : 0.8) * Math.exp(-t * 6.9 / (slap ? 0.06 : 0.38)) + hp * (slap ? 1.8 : 0.9) * Math.exp(-t * 6.9 / (slap ? 0.07 : 0.14));
      } else if (kind === 'shaker') {
        const x = rnd(); hp = x - prev; prev = x; // bright noise
        v = hp * 0.5 * Math.min(1, t / 0.012) * Math.exp(-Math.max(0, t - 0.012) * 6.9 / 0.063);
      } else if (kind === 'tick') {
        const x = rnd(); lp += onePole(3200) * (x - lp); hp = lp - prev; prev = lp;
        v = hp * 3 * Math.exp(-t * 6.9 / 0.025);
      } else if (kind === 'anvil') {
        [1, 2.76, 5.4, 8.93].forEach((m, k) => { v += Math.sin(2 * Math.PI * 520 * m * t) / (k + 1.3) * Math.exp(-t * 6.9 / (0.7 / (k + 1))); });
      }
      out[i] = v * att;
    }
    let pk = 1e-6; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(out[i]));
    for (let i = 0; i < len; i++) out[i] *= 0.95 / pk * (i > len - 200 ? (len - i) / 200 : 1);
    buf = this.ctx.createBuffer(1, len, sr); buf.copyToChannel(out, 0); this.ks.set(key, buf); return buf;
  }
  hit(kind, t, vel, ch, size = 1) {
    if (this.mute.has('hit')) return;
    const src = this.ctx.createBufferSource(); src.buffer = this._perc(kind, size); const g = this.G(vel);
    src.connect(g); g.connect(this.chan(ch)); src.start(t);
  }
  taiko(t, vel = 0.8, size = 1) { this.hit('taiko', t, vel * 1.1, 'taiko', Math.round(clamp(size, 0.6, 1.6) * 20) / 20); }
  roll(t, dur, v0, v1, step = 0.075, size = 0.9) { // a crescendo roll on the drums
    for (let x = 0; x < dur; x += step) { const k = x / dur; this.taiko(t + x + this.hz() * 0.3, v0 + (v1 - v0) * k * k, size + (this.r() - 0.5) * 0.1); }
  }
  thud(t, vel = 0.6) { // far-off, like one of the city's own footsteps
    if (this.mute.has('thud')) return;
    const o = this.O('sine', 52, t, t + 3), g = this.G(0); o.frequency.exponentialRampToValueAtTime(33, t + 1.2);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    o.connect(g); g.connect(this.chan('taiko'));
    const nz = this.Nz(t, t + 1), lp = this.F('lowpass', 140, 0.7), ng = this.G(0); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(vel * 0.9, t + 0.03); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
    nz.connect(lp); lp.connect(ng); ng.connect(this.chan('taiko'));
  }
  frame(t, vel = 0.4, slap = false) { this.hit(slap ? 'slap' : 'frame', t, vel * (slap ? 0.8 : 1), 'perc'); }
  shaker(t, vel = 0.12) { this.hit('shaker', t, vel * 1.6, 'shaker'); }
  anvil(t, vel = 0.3) { this.hit('anvil', t, vel * 1.4, 'perc'); }
  tick(t, vel = 0.2) { this.hit('tick', t, vel * 1.2, 'perc'); }
  boom(t, vel = 0.8) {
    if (this.mute.has('boom')) return;
    const o = this.O('sine', 58, t, t + 4), g = this.G(0); o.frequency.exponentialRampToValueAtTime(28, t + 2.5);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
    o.connect(g); g.connect(this.chan('fx'));
    const nz = this.Nz(t, t + 2.5), lp = this.F('lowpass', 220, 0.7), ng = this.G(0); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(vel * 0.7, t + 0.01); ng.gain.exponentialRampToValueAtTime(0.0001, t + 2);
    nz.connect(lp); lp.connect(ng); ng.connect(this.chan('fx'));
  }
  riser(t, dur, vel = 0.4) {
    if (this.mute.has('riser')) return;
    const nz = this.Nz(t, t + dur + 0.05), hp = this.F('highpass', 300, 1.5), g = this.G(0);
    hp.frequency.setValueAtTime(300, t); hp.frequency.exponentialRampToValueAtTime(7000, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.04);
    nz.connect(hp); hp.connect(g); g.connect(this.chan('fx'));
  }
  drone(midis, t, dur, vel = 0.3) {
    if (this.mute.has('drone')) return;
    const end = t + dur + 3.2, lp = this.F('lowpass', 420, 0.8), g = this.G(0);
    const lfo = this.O('sine', 0.06, t, end), lg = this.G(90); lfo.connect(lg); lg.connect(lp.frequency);
    for (const m of midis) { const o = this.O('sine', NOTE(m), t, end), s = this.O('sawtooth', NOTE(m), t, end), sg = this.G(0.3); o.connect(lp); s.detune.value = 4; s.connect(sg); sg.connect(lp); }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 2.5); g.gain.setValueAtTime(vel, t + Math.max(2.5, dur)); g.gain.linearRampToValueAtTime(0.0001, end);
    lp.connect(g); g.connect(this.chan('drone'));
  }
  bass(midi, t, dur, vel = 0.5) {
    if (this.mute.has('bass')) return;
    const end = t + dur + 0.4, g = this.G(0), o = this.O('sine', NOTE(midi), t, end), s = this.O('sawtooth', NOTE(midi), t, end), lp = this.F('lowpass', 320, 2), sg = this.G(0.35);
    o.connect(g); s.connect(lp); lp.connect(sg); sg.connect(g);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.015); g.gain.setTargetAtTime(vel * 0.75, t + 0.1, 0.3); g.gain.setTargetAtTime(0.0001, t + dur, 0.12);
    g.connect(this.chan('bass'));
  }

  // ---------------------------------------------------------------- the busker in the market (diegetic, spatial)
  busker(pos, active) {
    const A = this.audio; if (!A || !A.ready) return;
    let d = this.diegetic.get('busker');
    if (!d && active) {
      const g = this.G(0.0001), p = A.panner(pos, 3, 80, 1.2);
      g.connect(p); p.connect(A.sfxBus); const s = this.G(0.3); p.connect(s); s.connect(A.verbSend);
      d = { g, p, next: this.t + 0.2, step: 0 }; this.diegetic.set('busker', d);
      const tune = [...MK_A, ...MK_B.map(n => ({ ...n, t: n.t + 24 }))], spb = 60 / 252;
      d.timer = setInterval(() => {
        while (d.next < this.t + 0.3) {
          const i = d.step % 48, bar = Math.floor(i / 6);
          for (const n of tune) if (n.t === i) this.pluck('cimb', n.m, d.next + this.hz(), 0.35, 0, d.g);
          const roots = [N('G3'), N('G3'), N('F3'), N('G3'), N('Bb2'), N('Bb2'), N('C3'), N('F3')];
          if (i % 6 === 0) this.pluck('bass', roots[bar % 8], d.next, 0.3, 0, d.g);
          if (i % 6 === 3) this.pluck('cimb', roots[bar % 8] + 19, d.next, 0.16, 0, d.g);
          d.step++; d.next += spb;
        }
      }, 60);
    }
    if (d) { d.g.gain.setTargetAtTime(active ? 0.5 : 0.0001, this.t, 0.4); A.setPannerPos(d.p, pos); }
  }
}

// helpers for cue bodies
const hc = name => HC[name];
function harm(h, t, B, fn) { if (Array.isArray(h)) { fn(hc(h[0]), t, B / 2, 0); fn(hc(h[1]), t + B / 2, B / 2, 1); } else fn(hc(h), t, B, 0); }
const up = (ms, k) => ms.map(m => m + k);

// ---------------------------------------------------------------- the cues
const CUES = {
  // TITLE — the whole theme: cello, then horn, then the voice over the choir at the climax
  title: { bpm: 66, meter: 4, gain: 0.85, len: 20, back: 4, bar(s, n, t, b, k) {
    const B = 4 * b;
    if (n < 4) { // dawn: drone, a glass bloom, the first three notes on celesta
      const c = hc(['Bb', 'Gm9', 'Ebmaj7', 'Fsus'][n]);
      if (n === 0) { s.drone([c.b + 12, c.b + 19], t, B * 4, 0.3); s.swell(N('F5'), t, B * 0.9, 0.12); }
      if (n === 0 || n === 2) s.seq('celesta', mel('F5:1 Bb5:1 C6:2'), t + b, b, 0.32);
      if (n === 1) s.seq('celesta', mel('D6:1.5 C6:.5 Bb5:1 F5:1'), t, b, 0.26);
      if (n >= 1) s.choir(up(c.v, 12).slice(1), t, B, 0.1 + n * 0.05, { vowel: 'oo', to: n === 3 ? 'ah' : null });
      if (n >= 2) s.strings([c.b + 12, c.b + 19], t, B, 0.18 + n * 0.05);
      if (n === 3) { s.riser(t + b * 2, b * 2, 0.25); s.arp('harp', c.v, t + b * 2, b / 4, 8, 0.25, { pat: [0, 1, 2, 3, 4, 5, 6, 7] }); }
      return;
    }
    const i = n - 4, sec = i >> 2, h = THEME_H[i];
    if (i === 0 || i === 8) { s.boom(t, i ? 0.7 : 0.5); s.drone([hc('Bb').b + 12], t, B * 8, 0.22); }
    harm(h, t, B, (c, tt, dd) => {
      s.strings(c.v, tt, dd, [0.22, 0.3, 0.42, 0.3][sec]);
      s.strings([c.b + 12], tt, dd, [0.25, 0.32, 0.42, 0.32][sec], { ch: 'strLo' });
      if (sec > 0) s.bass(c.b, tt, dd, 0.35);
      if (sec === 1 || sec === 3) s.arp('harp', c.v, tt, b / 2, dd / (b / 2), 0.24);
      if (sec === 2) s.choir(up(c.v, 12), tt, dd, 0.26, { vowel: 'oo', to: 'ah' });
      if (sec === 1) s.choir(up(c.v.slice(1), 12), tt, dd, 0.1, { vowel: 'oo' });
    });
    if (i === 0) s.line(k % 2 ? 'flute' : 'cello', TH.A, t, b, { vel: 0.55, tr: k % 2 ? 0 : -12 });
    if (i === 4) s.line('horn', TH.A2, t, b, { vel: 0.6, tr: -12 });
    if (i === 8) { s.line('horn', TH.B, t, b, { vel: 0.7, tr: -12 }); s.line('voice', TH.B, t, b, { vel: 0.32, vowel: 'ah' }); }
    if (i === 12) { s.line('flute', TH.C, t, b, { vel: 0.5, tr: 12 }); s.seq('celesta', TH.C, t, b, 0.14, 24); s.line('cello', TH.C, t, b, { vel: 0.4, tr: -12 }); }
    if (sec === 2) { s.taiko(t, 0.8, 1.3); s.taiko(t + 2 * b, 0.45, 1); s.taiko(t + 3.5 * b, 0.3, 0.8); }
    if (i === 7) s.riser(t + 2 * b, 2 * b, 0.3);
    if (i === 15) s.swell(N('E6'), t + b, 3 * b, 0.1);
  } },

  // MENU — the theme heard from far away
  menu: { bpm: 60, meter: 4, gain: 0.7, len: 16, back: 0, bar(s, n, t, b, k) {
    const B = 4 * b, h = THEME_H[n];
    if (n % 8 === 0) { s.drone([hc('Bb').b + 12, hc('Bb').b + 19], t, B * 8, 0.24); s.swell(N('F5'), t, B * 0.6, 0.08); }
    harm(h, t, B, (c, tt, dd) => {
      s.choir(up(c.v, 12), tt, dd, 0.12, { vowel: 'oo' });
      s.arp('harp', c.v, tt, b, dd / b, 0.18, { pat: [0, 2, 4, 3] });
      if (n >= 8) s.strings(c.v.slice(0, 3), tt, dd, 0.14);
    });
    if (n === 0) s.seq('celesta', TH.A, t, b, 0.22, 12);
    if (n === 4) s.seq('celesta', TH.A2, t, b, 0.2, 12);
    if (n === 8) s.line('cello', TH.B, t, b, { vel: 0.4, tr: -24 });
    if (n === 12) s.line('flute', TH.C, t, b, { vel: 0.35 });
  } },

  // MORNING — sunrise in the apartment: harp, flute, a celesta glint
  morning: { bpm: 76, meter: 4, gain: 0.72, len: 16, back: 0, bar(s, n, t, b, k) {
    const B = 4 * b, H = [...TH_H.A, ...TH_H.A2, 'Ebmaj7', 'Bb', 'Cm7', ['Fsus', 'F'], 'Ebmaj7', 'Bb', 'Gm7', ['Fsus', 'F']];
    harm(H[n], t, B, (c, tt, dd) => {
      s.arp('harp', c.v, tt, b / 2, dd / (b / 2), 0.22, { pat: [0, 2, 3, 4, 5, 4, 3, 2] });
      s.strings([c.b + 12, ...c.v.slice(1, 3)], tt, dd, 0.12);
      if (n >= 8 || k > 0) s.choir(up(c.v.slice(2), 12), tt, dd, 0.06, { vowel: 'oo' });
    });
    if (n === 0) (k === 0 ? s.seq('celesta', TH.A, t, b, 0.2, 12) : s.line('flute', TH.A, t, b, { vel: 0.45, tr: 12 }));
    if (n === 4) s.line('flute', TH.A2, t, b, { vel: 0.48 });
    if (n === 8) s.line('flute', TH.M, t, b, { vel: 0.5 });
    if (n === 8) s.seq('celesta', mel('r:3 G6:1 r:4 r:3 D6:1 r:4 r:3 C6:1'), t, b, 0.12);
    if (n >= 8) for (let i = 0; i < 8; i++) s.shaker(t + i * b / 2, i % 2 ? 0.05 : 0.08);
    if (n === 15) s.swell(N('E6'), t + b, 3 * b, 0.07);
  } },

  // MARKET — a dance in 6/8; the theme as a folk tune (cimbalom, flute, reed, frame drum)
  market: { bpm: 252, meter: 6, gain: 0.7, len: 36, back: 4, delay: 60 / 252 * 3, bar(s, n, t, b, k) {
    const sec = n < 4 ? 0 : n < 12 ? 1 : n < 20 ? 2 : n < 28 ? 3 : 4;
    const A = ['Gm', 'Gm', 'F', 'Gm'], Bh = ['Bb', 'Bb', 'C', 'F'];
    const h = (sec === 2 || sec === 4) ? Bh[n % 4] : A[n % 4], c = hc(h);
    const tones = [c.v[0], c.v[2], c.v[3], c.v[1] + 12, c.v[3], c.v[2]];
    tones.forEach((m, i) => s.pluck('cimb', m + 12, t + i * b + s.hz(), i % 3 === 0 ? 0.32 : 0.2));
    s.frame(t, 0.55); s.frame(t + 3 * b, 0.4); s.frame(t + 2 * b, 0.25, true); s.frame(t + 5 * b, 0.25, true);
    if (sec > 0) for (let i = 0; i < 6; i++) s.shaker(t + i * b, i % 3 === 0 ? 0.1 : 0.05);
    if (sec >= 1) { s.pluck('bass', c.b + 12, t, 0.45); s.pluck('bass', c.b + 19, t + 3 * b, 0.32); }
    if (sec >= 3) s.brass(c.v.slice(1), t, 0, 0.22, { tone: 'reed', att: 0.01, hits: [[0, b * 0.8, 1], [3 * b, b * 0.8, 0.8]] });
    if (sec === 1 && n % 4 === 0) s.line('flute', MK_A, t, b, { vel: 0.45 });
    if (sec === 2 && n % 4 === 0) { s.line('flute', MK_B, t, b, { vel: 0.45, tr: -12 }); }
    if (sec === 3 && n % 4 === 0) { s.line('reed', MK_A, t, b, { vel: 0.4, tr: -12 }); s.line('flute', MK_A, t, b, { vel: 0.35 }); }
    if (sec === 4 && n % 4 === 0) { s.line('flute', MK_B, t, b, { vel: 0.45 }); s.line('reed', MK_B, t, b, { vel: 0.35, tr: -12 }); }
    if (sec === 4) s.tick(t + 4 * b, 0.12);
  } },

  // EXTERIOR — Meridian seen from outside: vast, slow, footsteps far below
  exterior: { bpm: 58, meter: 4, gain: 0.8, len: 24, back: 4, bar(s, n, t, b, k) {
    const B = 4 * b, H = ['Bb', 'Gm9', 'Ebmaj7', 'C', ...THEME_H, 'Bb', 'Ebmaj7', 'Gm9', ['Fsus', 'F']];
    const sec = n < 4 ? 0 : n < 12 ? 1 : n < 20 ? 2 : 3;
    if (n % 4 === 0) s.drone([hc('Bb').b + 12, hc('Bb').b + 19], t, B * 4, 0.28);
    s.thud(t, sec === 2 ? 0.55 : 0.4);
    if (sec >= 2) { s.taiko(t + 2 * b, 0.35, 1.3); if (sec === 2) s.taiko(t + 3.5 * b, 0.22, 1); }
    harm(H[n], t, B, (c, tt, dd) => {
      s.strings([c.b + 12, c.b + 19], tt, dd, [0.28, 0.32, 0.4, 0.3][sec], { ch: 'strLo' });
      s.strings(c.v, tt, dd, [0.14, 0.24, 0.36, 0.22][sec], { art: sec === 2 && n % 2 ? 'trem' : 'leg' });
      s.choir(up(c.v, 12), tt, dd, [0.1, 0.14, 0.26, 0.14][sec], { vowel: sec === 2 ? 'oo' : 'oo', to: sec === 2 ? 'ah' : null });
      s.arp('harp', c.v, tt, 0.07, 6, 0.16, { pat: [0, 1, 2, 3, 4, 5] }); // light glinting off the hull
      if (sec > 0) s.bass(c.b, tt, dd, 0.3);
    });
    if (n === 4) s.line('horn', TH.A, t, b, { vel: 0.62, tr: -12 });
    if (n === 8) { s.line('flute', TH.A2, t, b, { vel: 0.5 }); s.seq('celesta', TH.A2, t, b, 0.1, 12); }
    if (n === 12) { s.line('voice', TH.B, t, b, { vel: 0.34, vowel: 'ah' }); s.line('horn', TH.B, t, b, { vel: 0.6, tr: -12 }); }
    if (n === 16) { s.line('horn', TH.C, t, b, { vel: 0.55, tr: -12 }); s.line('cello', TH.C, t, b, { vel: 0.4, tr: -24 }); }
    if (n === 11) s.riser(t + 2 * b, 2 * b, 0.25);
    if (n === 12) s.boom(t, 0.55);
    if (n === 23) s.swell(N('E6'), t + b, 3 * b, 0.08);
  } },

  // COMBAT — the march: taiko in 2+2+3, low strings stamping the riff, horns on the theme turned to iron
  combat: { bpm: 300, meter: 7, gain: 0.82, len: 28, back: 0, delay: 0.2 * 3, bar(s, n, t, b, k) {
    const sec = n < 8 ? 0 : n < 16 ? 1 : n < 24 ? 2 : 3;
    const prog = sec === 2 ? ['Gm', 'Ab', 'Eb', 'D'] : sec === 1 ? (n % 8 < 4 ? ['Gm', 'Gm', 'Eb', 'D'] : ['Gm', 'Gm', 'Cm', 'D']) : ['Gm', 'Gm', 'Eb', 'F'];
    const c = hc(prog[n % 4]), root = c.b + 12, th = third(c);
    if (sec < 3) {
      s.taiko(t, 0.85, 1.3); s.taiko(t + 2 * b, 0.5, 1); s.taiko(t + 4 * b, 0.7, 1.1); s.taiko(t + 5 * b, 0.32, 0.8); s.taiko(t + 6 * b, 0.42, 0.8);
      if (n % 4 === 3) { s.taiko(t + 5.5 * b, 0.3, 0.7); s.taiko(t + 6.5 * b, 0.4, 0.7); }
      s.gate('strLo', [0, 0, th, 0, 7, 5, th].map((iv, i) => ({ m: root + iv, v: i === 0 || i === 2 || i === 4 ? 0.8 : 0.5 })), t, b, { bright: 2200 });
      s.bass(c.b, t, b * 3.6, 0.55); s.bass(c.b, t + 4 * b, b * 2.6, 0.4);
    } else {
      s.frame(t, 0.45); s.frame(t + 4 * b, 0.35); s.frame(t + 2 * b, 0.2, true);
      if (n === 24) { s.boom(t, 0.7); s.drone([N('G2'), N('D3')], t, 7 * b * 4, 0.25); }
      s.choir([N('G4'), N('D5')], t, 7 * b, 0.1 + (n - 24) * 0.05, { vowel: 'oo', to: 'ah' });
      if (n === 27) s.riser(t, 7 * b, 0.45);
    }
    if (sec >= 1) for (let i = 0; i < 7; i++) s.shaker(t + i * b, i === 0 || i === 2 || i === 4 ? 0.12 : 0.06);
    if (sec >= 1 && sec < 3 && n % 2 === 1) s.anvil(t + 4 * b, 0.22);
    if (sec === 1) { s.strings(up(c.v, 12), t, 7 * b, 0.3, { art: 'trem', ch: 'strHi' }); s.choir(up(c.v, 12), t, 7 * b, 0.16, { vowel: 'ah' }); }
    if (n === 8) s.line('horn', CT1, t, b, { vel: 0.68 });
    if (n === 12) s.line('horn', CT2, t, b, { vel: 0.75, tr: -12 });
    if (sec === 2) {
      s.brass(c.v, t, 0, 0.55, { hits: [[0, b * 1.6, 1], [4 * b, b * 1.2, 0.78]] });
      s.gate('strHi', [0, 1, 2, 3, 2, 1, 2].map(i => ({ m: c.v[i] + 24, v: 0.32 })), t, b, { bright: 4000 });
      s.choir(up(c.v, 12), t, 7 * b, 0.22, { vowel: 'ah' });
      if (n === 16 || n === 20) s.line('horn', CT3, t, b, { vel: 0.72, tr: n === 20 ? 12 : 0 });
    }
    if (n === 7 || n === 15) s.riser(t + 3 * b, 4 * b, 0.3);
    if (n === 0 || n === 16) s.boom(t, 0.6);
  } },

  // THE SHEARER — the prologue's final fight. Four movements: the monster arrives (4/4), the march at
  // full force (7/8), a Phrygian push (7/8), and then the turn: G minor opens into B♭ major and the
  // Marchlight theme rises over the whole choir, voice on top, horns beneath, harp and bells — the
  // city's song answering the thing that came up its leg. mark('heaven') jumps there when it's winnable.
  shearer: { bpm: 300, meter: n => (n < 4 || n >= 20 ? 8 : 7), gain: 0.88, len: 32, back: 4, marks: { heaven: 20 }, delay: 0.6, bar(s, n, t, b, k) {
    const e = b;
    if (n < 4) { // arrival
      if (n === 0) { s.drone([N('G1'), N('D2')], t, 8 * b * 4, 0.3); s.brass([N('G2'), N('Ab2'), N('D3')], t, 8 * b * 4 - 0.2, 0.32, { att: 3 }); s.boom(t, 0.7); }
      s.choir([N('G3'), N('D4'), N('Ab4')], t, 8 * b, 0.1 + n * 0.06, { vowel: 'oo', to: n >= 2 ? 'ah' : null });
      s.strings([N('G2'), N('Ab2')], t, 8 * b, 0.15 + n * 0.06, { art: 'trem', ch: 'strLo' });
      if (n % 2 === 1) s.taiko(t + 6 * e, 0.6, 1.3);
      if (n === 3) { s.roll(t, 8 * e, 0.15, 0.85); s.riser(t, 8 * e, 0.45); }
      return;
    }
    if (n < 20) { // the march, then the Phrygian push
      const secB = n >= 12, i = n - (secB ? 12 : 4);
      const prog = secB ? ['Gm', 'Ab', 'Eb', 'D'] : (i < 4 ? ['Gm', 'Gm', 'Eb', 'D'] : ['Gm', 'Gm', 'Cm', 'D']);
      const c = hc(prog[n % 4]), root = c.b + 12, th = third(c);
      if (i === 0) s.boom(t, 0.75);
      s.taiko(t, 0.9, 1.35); s.taiko(t + 2 * e, 0.55, 1); s.taiko(t + 4 * e, 0.75, 1.1); s.taiko(t + 5 * e, 0.35, 0.8); s.taiko(t + 6 * e, 0.45, 0.8);
      if (n % 4 === 3) s.roll(t + 4 * e, 3 * e, 0.3, 0.7, 0.1, 0.75);
      s.gate('strLo', [0, 0, th, 0, 7, 5, th].map((iv, j) => ({ m: root + iv, v: j === 0 || j === 2 || j === 4 ? 0.85 : 0.5 })), t, e, { bright: 2400 });
      s.bass(c.b, t, e * 3.6, 0.55); s.bass(c.b, t + 4 * e, e * 2.6, 0.42);
      for (let j = 0; j < 7; j++) s.shaker(t + j * e, j === 0 || j === 2 || j === 4 ? 0.12 : 0.06);
      if (n % 2 === 1) s.anvil(t + 4 * e, 0.24);
      // choir stabs on the strong beats, sustained 'ah' above them
      s.choir(up(c.v, 12), t, 0, 0.3, { vowel: 'ah', att: 0.02, rel: 0.32, hits: [[0, e * 1.2, 1], [4 * e, e, 0.8]] });
      if (!secB) {
        s.strings(up(c.v, 12), t, 7 * e, 0.3, { art: 'trem', ch: 'strHi' });
        if (i === 0) s.line('horn', CT1, t, e, { vel: 0.72 });
        if (i === 4) { s.line('horn', CT2, t, e, { vel: 0.8, tr: -12 }); s.line('cello', CT2, t, e, { vel: 0.4, tr: -24 }); }
      } else {
        s.brass(c.v, t, 0, 0.55, { hits: [[0, e * 1.6, 1], [4 * e, e * 1.2, 0.78]] });
        s.gate('strHi', [0, 1, 2, 3, 2, 1, 2].map(j => ({ m: c.v[j] + 24, v: 0.34 })), t, e, { bright: 4200 });
        s.choir([N('G5')], t, 7 * e, 0.12, { vowel: 'ah' }); // a high pedal: the sky over the fight
        if (i === 0 || i === 4) s.line('horn', CT3, t, e, { vel: 0.78, tr: i === 4 ? 12 : 0 });
        if (i === 7) { s.riser(t, 7 * e, 0.5); s.roll(t, 7 * e, 0.2, 0.95, 0.07); }
      }
      return;
    }
    // ---- HEAVEN (20-27) and the answer (28-31): 4/4, half-time feel, the theme in B♭
    const i = n - 20, B = 8 * e;
    const H = i < 8 ? [...TH_H.A, ...TH_H.A2][i] : TH_H.B[i - 8];
    if (i === 0) { s.boom(t, 0.85); s.swell(N('F6'), t - 2 * e, 2 * e, 0.1); s.drone([hc('Bb').b + 12, hc('Bb').b + 19], t, B * 12, 0.26); }
    harm(H, t, B, (c, tt, dd) => {
      s.strings([c.b + 12, c.b + 24], tt, dd, 0.42, { ch: 'strLo' });
      s.strings(c.v, tt, dd, 0.4); s.strings(up(c.v.slice(2), 12), tt, dd, 0.3, { ch: 'strHi' });
      s.choir(up(c.v, 12), tt, dd, 0.32, { vowel: 'oo', to: 'ah', att: 0.5 });
      s.bass(c.b, tt, dd, 0.42);
      s.arp('harp', c.v, tt, 0.04, 8, 0.24, { pat: [0, 1, 2, 3, 4, 5, 6, 7] }); // a glissando into every chord
      s.bell('bell', c.v[3] + 12, tt, 0.07);
    });
    s.taiko(t, 0.8, 1.4); s.taiko(t + 4 * e, 0.55, 1.2); if (i % 2 === 1) s.taiko(t + 7 * e, 0.35, 0.9);
    s.thud(t, 0.4);
    if (i === 0) { s.line('voice', aug(TH.A, 2), t, e, { vel: 0.46, vowel: 'ah' }); s.line('horn', aug(TH.A, 2), t, e, { vel: 0.62, tr: -12 }); }
    if (i === 4) { s.line('voice', aug(TH.A2, 2), t, e, { vel: 0.5, vowel: 'ah' }); s.line('horn', aug(TH.A2, 2), t, e, { vel: 0.68, tr: -12 }); s.line('flute', aug(TH.A2, 2), t, e, { vel: 0.28, tr: 12 }); s.seq('celesta', aug(TH.A2, 2), t, e, 0.1, 12); }
    if (i === 8) { s.line('horn', aug(TH.B, 2), t, e, { vel: 0.78, tr: -12 }); s.line('voice', aug(TH.B, 2), t, e, { vel: 0.5, vowel: 'ah' }); s.brass(hc('Gm9').v, t, B * 0.9, 0.3, { att: 0.4 }); }
    if (i % 2 === 0) for (let j = 0; j < 8; j++) s.shaker(t + j * e, j % 2 ? 0.04 : 0.07);
    if (i === 11) { s.roll(t + 4 * e, 4 * e, 0.25, 0.9, 0.07); s.riser(t + 4 * e, 4 * e, 0.4); }
  } },

  // RESCUE — urgent strings in 3+3+2, then the theme on the horns, doubled in length: they're alive
  rescue: { bpm: 150, meter: 4, gain: 0.85, len: 24, back: 0, bar(s, n, t, b, k) {
    const sec = n < 8 ? 0 : n < 16 ? 1 : 2, B = 4 * b;
    const H = sec === 0 ? ['Gm', 'Eb', 'Bb', 'F'][n % 4] : sec === 1 ? ['Bb', 'Bb', 'Gm', 'Gm', 'C', 'C', 'Ebmaj7', 'Ebmaj7'][n - 8] : ['Bb', 'Bb', 'Gm7', 'Gm7', 'Ebmaj9', 'Ebmaj9', 'Fsus', 'F'][n - 16];
    const c = hc(H), e = b / 2, acc = [0, 3, 6];
    s.gate('strHi', [0, 1, 2, 1, 0, 1, 2, 3].map((ix, i) => ({ m: c.v[ix] + 12, v: acc.includes(i) ? 0.6 : 0.36 })), t, e, { bright: 3600 });
    s.gate('strLo', [0, 1, 2, 3, 4, 5, 6, 7].map(i => (acc.includes(i) ? { m: c.b + 12, v: 0.75 } : null)), t, e, { len: 1.6, bright: 1800 });
    s.taiko(t, 0.8, 1.2); s.taiko(t + 3 * e, 0.55, 1); s.taiko(t + 6 * e, 0.6, 1);
    if (n % 2) s.taiko(t + 7 * e, 0.35, 0.8);
    for (let i = 0; i < 8; i++) s.shaker(t + i * e, acc.includes(i) ? 0.1 : 0.05);
    s.bass(c.b, t, B * 0.95, 0.45);
    if (sec >= 1) { s.choir(up(c.v, 12), t, B, sec === 2 ? 0.28 : 0.18, { vowel: 'ah' }); s.strings(c.v, t, B, sec === 2 ? 0.34 : 0.24); }
    if (n === 8) s.line('horn', aug(TH.A, 2), t, b, { vel: 0.72, tr: -12 });
    if (n === 16) { s.line('horn', aug(TH.A2, 2), t, b, { vel: 0.8, tr: -12 }); s.line('voice', aug(TH.A2, 2), t, b, { vel: 0.3, vowel: 'ah' }); }
    if (sec === 2 && n % 2 === 0) s.brass(c.v, t, b * 1.5, 0.4);
    if (n === 7 || n === 15) s.riser(t + 2 * b, 2 * b, 0.35);
    if (n === 8 || n === 16) s.boom(t, 0.6);
  } },

  // TENSION — something is wrong: a low cluster, a clock, a heartbeat, the Stillness glinting
  tension: { bpm: 66, meter: 4, gain: 0.75, len: 8, back: 0, bar(s, n, t, b, k) {
    const B = 4 * b;
    if (n % 4 === 0) { s.drone([N('G1'), N('Ab1') + 12], t, B * 4, 0.3); s.strings([N('G2'), N('Ab2')], t, B * 4, 0.16, { art: 'trem', ch: 'strLo' }); }
    for (let i = 0; i < 4; i++) s.tick(t + i * b, i === 0 ? 0.12 : 0.07);
    s.thud(t, 0.35); s.thud(t + 0.32, 0.25);
    if (n % 4 === 2) { s.bell('glass', N('E5'), t, 0.12); s.bell('glass', N('Bb5'), t + b * 1.5, 0.1); }
    if (n === 4) s.line('cello', mel('G3:1 Ab3:1 G3:2 | D3:4'), t, b, { vel: 0.35, tr: -12 });
    if (n === 7) s.riser(t + 2 * b, 2 * b, 0.12);
  } },

  // STILLNESS — almost nothing. E against B♭, held in glass; the silence is the instrument
  stillness: { bpm: 40, meter: 4, gain: 0.7, len: 8, back: 0, bar(s, n, t, b, k) {
    const B = 4 * b;
    if (n % 4 === 0) s.bell('glass', N('E5'), t, 0.14, { att: 2, T: 9 });
    if (n % 4 === 2) s.bell('glass', N('Bb5'), t, 0.11, { att: 2, T: 9 });
    if (n === 0) { s.choir([N('E4'), N('Bb4')], t, B * 4, 0.05, { vowel: 'oo', att: 4 }); s.drone([N('Bb1')], t, B * 8, 0.12); }
    if (n === 5) s.bell('celesta', N('D6'), t + b, 0.08);
    if (n === 7) s.swell(N('E6'), t + b, 3 * b, 0.05);
  } },

  // CHAPTER ONE — the surface: harp harmonics, the "Underfoot" flute, and the theme remembered
  ruins: { bpm: 62, meter: 4, gain: 0.75, len: 16, back: 0, bar(s, n, t, b, k) {
    const B = 4 * b, H = ['Dm9', 'Bbmaj7s11', 'Fmaj7', 'Csus2', 'F', 'Dm7', 'G', 'Bbmaj7s11', 'Dm9', 'Bbmaj7s11', 'Fmaj7', 'Csus2', 'Bbmaj7s11', 'Fmaj7', 'Am7', 'Dm9'];
    const c = hc(H[n]);
    if (n % 8 === 0) s.drone([N('D2'), N('A2')], t, B * 8, 0.22);
    s.strings([c.b + 12], t, B, 0.18, { ch: 'strLo' });
    s.choir(up(c.v.slice(1), 12), t, B, 0.07, { vowel: 'oo' });
    for (let i = 0; i < 3; i++) if (s.r() < 0.75) s.pluck('harp', c.v[Math.floor(s.r() * 4)] + 24, t + (i * 1.33 + s.r() * 0.3) * b, 0.16);
    if (n === 0) s.line('flute', UF, t, b, { vel: 0.45 });
    if (n === 4) s.line('cello', UF_HOME, t, b, { vel: 0.42, tr: 0 });
    if (n === 8) { s.line('flute', UF, t, b, { vel: 0.4, tr: 12 }); s.strings(c.v, t, B * 4, 0.12); }
    if (n === 12) s.seq('celesta', UF, t, b, 0.12, 12);
    if (n % 4 === 3) s.thud(t + 2 * b, 0.22);
  } },

  // CHAPTER ONE — the transmission: pings in a rhythm like Morse, a pulse, hope rising
  signal: { bpm: 84, meter: 4, gain: 0.78, len: 16, back: 4, bar(s, n, t, b, k) {
    const B = 4 * b, H = ['F', 'Dm7', 'Bbadd9', 'Csus2', 'F', 'Dm7', 'Bbadd9', 'C', 'Bbadd9', 'C', 'Dm7', 'Bbadd9', 'F', 'C', 'Bbadd9', 'F'];
    const c = hc(H[n]), e = b / 2;
    [0, 0.5, 1, 2, 3.5].forEach((p, i) => s.bell('ping', i < 3 ? N('C6') : N('F6'), t + p * b, 0.14));
    s.gate('strLo', [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ m: c.b + 12, v: i % 4 === 0 ? 0.55 : 0.34 })), t, e, { bright: 1900 });
    if (n >= 4) { s.strings(c.v, t, B, 0.18 + (n - 4) * 0.012); s.choir(up(c.v, 12), t, B, 0.1, { vowel: 'oo', to: n >= 12 ? 'ah' : null }); }
    if (n >= 8) for (let i = 0; i < 8; i++) s.shaker(t + i * e, i % 2 ? 0.04 : 0.07);
    if (n === 8) s.line('horn', mel('C4:1 F4:1 G4:2 | A4:1.5 G4:.5 F4:1 C4:1 | D4:1 E4:1 F4:1 G4:1 | A4:4'), t, b, { vel: 0.55 });
    if (n === 12) s.line('flute', mel('C5:1 F5:1 G5:2 | A5:1.5 Bb5:.5 C6:2 | D6:1 C6:1 A5:1 G5:.5 F5:.5 | G5:4'), t, b, { vel: 0.45 });
    if (n === 3) s.swell(N('C6'), t + b, 3 * b, 0.08);
  } },

  // CHAPTER ONE — the refusal at night: the theme alone on cello in minor, then celesta remembers it in major
  night: { bpm: 56, meter: 4, gain: 0.72, len: 16, back: 0, bar(s, n, t, b, k) {
    const B = 4 * b, H = ['Gm', 'Gm', 'Cm', 'D', 'Gm', 'Eb', 'Cm', 'D', ...TH_H.A, ...TH_H.A2];
    harm(H[n], t, B, (c, tt, dd) => {
      s.strings([c.b + 12, ...c.v.slice(0, 3)], tt, dd, n < 8 ? 0.12 : 0.16);
      if (n >= 8) s.arp('harp', c.v, tt, b, dd / b, 0.14, { pat: [0, 2, 3, 2] });
    });
    if (n === 0) s.line('cello', TH.Am, t, b, { vel: 0.45, tr: -12 });
    if (n === 4) s.line('cello', mel('D4:1 G4:1 A4:2 | Bb4:1.5 C5:.5 D5:2 | Eb5:1 D5:1 C5:1 Bb4:.5 A4:.5 | A4:4'), t, b, { vel: 0.48, tr: -12 });
    if (n === 8) s.seq('celesta', TH.A, t, b, 0.18, 12);
    if (n === 12) s.line('flute', TH.A2, t, b, { vel: 0.38 });
    if (n === 0) s.drone([N('G1')], t, B * 8, 0.18);
  } },
};

// ---------------------------------------------------------------- stingers
const STINGS = {
  // the first sight of the city from outside
  reveal: (s, t) => { s.boom(t, 0.8); s.choir(up(hc('Bb').v, 12), t, 5, 0.3, { vowel: 'oo', to: 'ah', att: 0.8 }); s.strings(hc('Bb').v, t, 5, 0.35); s.line('horn', mel('F4:1 Bb4:1 C5:3'), t + 0.4, 0.55, { vel: 0.7, tr: -12 }); s.swell(N('E6'), t + 2, 2.5, 0.08); },
  danger: (s, t) => { s.brass([N('G2'), N('Ab2'), N('D3')], t, 1.6, 0.6, { att: 0.08 }); s.taiko(t, 0.9, 1.4); s.taiko(t + 0.25, 0.5, 1); s.boom(t, 0.5); },
  discover: (s, t) => { s.seq('celesta', mel('F5:.5 Bb5:.5 C6:.5 E6:2'), t, 0.32, 0.3); s.bell('glass', N('E6'), t + 0.3, 0.12); },
  victory: (s, t) => { const c = hc('Bb'); s.boom(t, 0.8); s.taiko(t, 0.9, 1.5); s.choir(up(c.v, 12), t, 6, 0.36, { vowel: 'ah', att: 0.3 }); s.strings([c.b + 12, ...c.v, ...up(c.v.slice(1), 12)], t, 6, 0.42);
    s.line('horn', mel('F4:1 Bb4:1 C5:1.5 D5:4'), t + 0.2, 0.42, { vel: 0.75, tr: -12 }); s.line('voice', mel('F5:1 Bb5:1 C6:1.5 D6:4'), t + 0.2, 0.42, { vel: 0.35 }); s.arp('harp', c.v, t, 0.05, 8, 0.25, { pat: [0, 1, 2, 3, 4, 5, 6, 7] }); s.swell(N('E6'), t + 3, 2.5, 0.07); },
  still: (s, t) => { s.bell('glass', N('E5'), t, 0.16, { att: 0.4, T: 6 }); s.bell('glass', N('Bb5'), t + 0.6, 0.12, { att: 0.4, T: 6 }); },
};
export const CUE_NAMES = Object.keys(CUES);
