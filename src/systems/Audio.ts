import type { Surface } from '../world/Physics';
import { createSeededRandom } from '../core/rng';

export interface AudioPreset {
  /** Chord tones as MIDI note numbers. */
  chords: number[][];
  chordDur: number;
  padType: OscillatorType;
  padGain: number;
  bellGain: number;
  arpEvery: number;
  wobble: number;
  pitch: number;
  lowpass: number;
  reverb: number;
  muzak?: number;
  wind?: number;
  hum?: number;
  water?: number;
  machine?: number;
  drone?: number;
  room?: number;
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioSys {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private ambBus!: GainNode;
  private sfxBus!: GainNode;
  private verb!: ConvolverNode;
  private verbSend!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private amb: Record<string, GainNode> = {};
  private preset: AudioPreset | null = null;
  private nextChordAt = 0;
  private chordIdx = 0;
  private nextArpAt = 0;
  private nextMuzakAt = 0;
  private muzakStep = 0;
  private heartRate = 0;
  private nextBeatAt = 0;
  private readonly rnd = createSeededRandom(7);
  volume = { master: 0.8, music: 0.7, sfx: 0.9 };
  private wobbleLfo!: OscillatorNode;
  private wobbleGain!: GainNode;
  private humFlicker!: GainNode;
  private muted = false;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.master = ctx.createGain();
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = 4000;
    this.musicBus.connect(this.musicFilter).connect(this.master);
    this.ambBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.makeIR(3.8);
    this.verbSend = ctx.createGain();
    this.verbSend.gain.value = 0.5;
    this.verbSend.connect(this.verb).connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = this.rnd() * 2 - 1;
    // tape wobble shared LFO (connected to pad detune)
    this.wobbleLfo = ctx.createOscillator();
    this.wobbleLfo.frequency.value = 0.35;
    this.wobbleGain = ctx.createGain();
    this.wobbleGain.gain.value = 0;
    this.wobbleLfo.connect(this.wobbleGain);
    this.wobbleLfo.start();
    this.buildAmbience();
    this.applyVolumes();
    if (this.preset) this.setPreset(this.preset);
  }

  private makeIR(sec: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (this.rnd() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    return b;
  }

  private noiseSrc(loop = true): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise;
    s.loop = loop;
    return s;
  }

  private buildAmbience(): void {
    const ctx = this.ctx!;
    const mk = (name: string, src: AudioNode, ...chain: AudioNode[]) => {
      const g = ctx.createGain();
      g.gain.value = 0;
      let n: AudioNode = src;
      for (const c of chain) n = n.connect(c);
      n.connect(g);
      g.connect(this.ambBus);
      this.amb[name] = g;
      return g;
    };
    // wind
    {
      const s = this.noiseSrc();
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 500;
      bp.Q.value = 0.6;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lg = ctx.createGain();
      lg.gain.value = 260;
      lfo.connect(lg).connect(bp.frequency);
      lfo.start();
      mk('wind', s, bp);
      s.start();
    }
    // fluorescent hum
    {
      const sum = ctx.createGain();
      for (const [f, a] of [[60, 0.5], [120, 0.35], [180, 0.15], [240, 0.08]] as const) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = a * 0.12;
        o.connect(g).connect(sum);
        o.start();
      }
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      this.humFlicker = ctx.createGain();
      this.humFlicker.gain.value = 1;
      mk('hum', sum, lp, this.humFlicker);
    }
    // water lapping
    {
      const s = this.noiseSrc();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 520;
      const am = ctx.createGain();
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.22;
      const lg = ctx.createGain();
      lg.gain.value = 0.45;
      am.gain.value = 0.55;
      lfo.connect(lg).connect(am.gain);
      lfo.start();
      mk('water', s, lp, am);
      s.start();
    }
    // machinery
    {
      const s = this.noiseSrc();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 140;
      const sum = ctx.createGain();
      s.connect(lp).connect(sum);
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 46;
      const og = ctx.createGain();
      og.gain.value = 0.25;
      o.connect(og).connect(sum);
      o.start();
      s.start();
      mk('machine', sum);
    }
    // drone
    {
      const sum = ctx.createGain();
      for (const f of [55, 55.7, 82.4, 110.9]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        const g = ctx.createGain();
        g.gain.value = 0.06;
        o.connect(g).connect(sum);
        o.start();
      }
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 260;
      const send = ctx.createGain();
      send.gain.value = 0.4;
      lp.connect(send).connect(this.verbSend);
      mk('drone', sum, lp);
    }
    // room tone
    {
      const s = this.noiseSrc();
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      mk('room', s, lp);
      s.start();
    }
  }

  setPreset(p: AudioPreset): void {
    this.preset = p;
    const ctx = this.ctx;
    if (!ctx) return;
    const now = ctx.currentTime;
    const ramp = (g: GainNode | undefined, v: number) => g && g.gain.setTargetAtTime(v, now, 1.2);
    ramp(this.amb.wind, (p.wind ?? 0) * 0.5);
    ramp(this.amb.hum, (p.hum ?? 0) * 0.45);
    ramp(this.amb.water, (p.water ?? 0) * 0.35);
    ramp(this.amb.machine, (p.machine ?? 0) * 0.5);
    ramp(this.amb.drone, (p.drone ?? 0) * 0.35);
    ramp(this.amb.room, (p.room ?? 0) * 0.4);
    this.musicFilter.frequency.setTargetAtTime(p.lowpass, now, 1);
    this.verbSend.gain.setTargetAtTime(p.reverb, now, 1);
    this.wobbleGain.gain.setTargetAtTime(p.wobble * 30, now, 1);
    this.nextChordAt = Math.max(this.nextChordAt, now + 0.2);
    this.chordIdx = 0;
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const m = this.muted ? 0 : this.volume.master;
    this.master.gain.setTargetAtTime(m, this.ctx.currentTime, 0.05);
    this.musicBus.gain.setTargetAtTime(this.volume.music * 0.55, this.ctx.currentTime, 0.05);
    this.ambBus.gain.setTargetAtTime(this.volume.sfx * 0.8, this.ctx.currentTime, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.volume.sfx, this.ctx.currentTime, 0.05);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyVolumes();
  }

  suspend(s: boolean): void {
    if (!this.ctx) return;
    if (s) void this.ctx.suspend();
    else void this.ctx.resume();
  }

  /** Called each frame: schedules music, heartbeat, hum flicker. */
  update(intensity: { chase: number; dread: number }): void {
    const ctx = this.ctx;
    const p = this.preset;
    if (!ctx || !p || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const look = now + 0.25;
    if (this.nextChordAt < look) {
      const chord = p.chords[this.chordIdx % p.chords.length];
      this.chordIdx++;
      const t0 = Math.max(this.nextChordAt, now);
      for (const n of chord) this.padVoice(mtof(n - 12) * p.pitch, t0, p.chordDur * 1.25, p.padGain, p.padType);
      this.nextChordAt = t0 + p.chordDur;
      this.nextArpAt = t0 + 0.3;
    }
    if (p.arpEvery > 0 && this.nextArpAt < look) {
      const chord = p.chords[(this.chordIdx - 1 + p.chords.length) % p.chords.length];
      const n = chord[Math.floor(this.rnd() * chord.length)] + (this.rnd() < 0.5 ? 12 : 24);
      const t0 = Math.max(this.nextArpAt, now);
      this.bell(mtof(n) * p.pitch, t0, p.bellGain * (0.6 + this.rnd() * 0.4), this.musicBus);
      this.nextArpAt = t0 + p.arpEvery * (this.rnd() < 0.25 ? 2 : 1);
    }
    if (p.muzak && this.nextMuzakAt < look) {
      const mel = [72, 76, 79, 76, 74, 77, 81, 77, 72, 76, 79, 84, 83, 79, 74, 71];
      const bass = [48, 48, 45, 45, 41, 41, 43, 43];
      const t0 = Math.max(this.nextMuzakAt, now);
      const step = this.muzakStep++;
      const slow = p.pitch;
      this.epiano(mtof(mel[step % mel.length]) * slow, t0, 0.07 * p.muzak);
      if (step % 2 === 0) this.epiano(mtof(bass[(step / 2) % bass.length]) * slow, t0, 0.06 * p.muzak);
      this.nextMuzakAt = t0 + 0.32 / slow;
    }
    // heartbeat during chases
    this.heartRate = intensity.chase;
    if (this.heartRate > 0.05 && this.nextBeatAt < look) {
      const t0 = Math.max(this.nextBeatAt, now);
      this.thump(t0, 0.5 * this.heartRate);
      this.thump(t0 + 0.18, 0.35 * this.heartRate);
      this.nextBeatAt = t0 + 60 / (70 + this.heartRate * 80);
    }
    // fluorescent flicker
    if (this.amb.hum && this.rnd() < 0.01 * (0.3 + intensity.dread)) {
      this.humFlicker.gain.setValueAtTime(0.2, now);
      this.humFlicker.gain.setTargetAtTime(1, now + 0.05, 0.05);
    }
  }

  private padVoice(f: number, t0: number, dur: number, gain: number, type: OscillatorType): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain * 0.11, t0 + dur * 0.35);
    g.gain.linearRampToValueAtTime(0, t0 + dur);
    const send = ctx.createGain();
    send.gain.value = 0.8;
    for (const det of [-7, 6]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      this.wobbleGain.connect(o.detune);
      o.connect(g);
      o.start(t0);
      o.stop(t0 + dur + 0.1);
      o.onended = () => {
        try { this.wobbleGain.disconnect(o.detune); } catch { /* already gone */ }
      };
    }
    g.connect(this.musicBus);
    g.connect(send).connect(this.verbSend);
  }

  private bell(f: number, t0: number, gain: number, bus: AudioNode): void {
    const ctx = this.ctx!;
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const mg = ctx.createGain();
    car.frequency.value = f;
    mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.2, t0);
    mg.gain.exponentialRampToValueAtTime(1, t0 + 1.2);
    mod.connect(mg).connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain * 0.12, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
    car.connect(g);
    g.connect(bus);
    const s = ctx.createGain();
    s.gain.value = 0.7;
    g.connect(s).connect(this.verbSend);
    car.start(t0);
    mod.start(t0);
    car.stop(t0 + 2.3);
    mod.stop(t0 + 2.3);
  }

  private epiano(f: number, t0: number, gain: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    o.connect(bp).connect(g);
    g.connect(this.musicBus);
    const s = ctx.createGain();
    s.gain.value = 1.2;
    g.connect(s).connect(this.verbSend);
    o.start(t0);
    o.stop(t0 + 0.65);
  }

  private thump(t0: number, gain: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(70, t0);
    o.frequency.exponentialRampToValueAtTime(38, t0 + 0.15);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    o.connect(g).connect(this.sfxBus);
    o.start(t0);
    o.stop(t0 + 0.25);
  }

  private noiseHit(o: { t?: number; dur: number; gain: number; freq: number; q?: number; type?: BiquadFilterType; sweepTo?: number; verb?: number; rate?: number }): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t0 = o.t ?? ctx.currentTime;
    const s = this.noiseSrc(false);
    s.playbackRate.value = o.rate ?? 1;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'bandpass';
    f.frequency.setValueAtTime(o.freq, t0);
    if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, t0 + o.dur);
    f.Q.value = o.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(o.gain, t0 + Math.min(0.01, o.dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    s.connect(f).connect(g).connect(this.sfxBus);
    if (o.verb) {
      const vs = ctx.createGain();
      vs.gain.value = o.verb;
      g.connect(vs).connect(this.verbSend);
    }
    s.start(t0, this.rnd() * 1.5);
    s.stop(t0 + o.dur + 0.05);
  }

  private tone(o: { t?: number; f: number; f2?: number; dur: number; gain: number; type?: OscillatorType; verb?: number; attack?: number }): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t0 = o.t ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = o.type ?? 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(o.gain, t0 + (o.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g).connect(this.sfxBus);
    if (o.verb) {
      const vs = ctx.createGain();
      vs.gain.value = o.verb;
      g.connect(vs).connect(this.verbSend);
    }
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.05);
  }

  // ---------------- public SFX ----------------
  footstep(surface: Surface, strength: number): void {
    const v = 0.85 + this.rnd() * 0.3;
    const g = 0.16 * strength;
    switch (surface) {
      case 'cloud':
      case 'soft':
        this.noiseHit({ dur: 0.12, gain: g * 0.7, freq: 380 * v, q: 0.5, type: 'lowpass' });
        break;
      case 'carpet':
        this.noiseHit({ dur: 0.09, gain: g * 0.8, freq: 600 * v, q: 0.6, type: 'lowpass' });
        break;
      case 'wood':
        this.noiseHit({ dur: 0.07, gain: g, freq: 900 * v, q: 2 });
        this.tone({ f: 140 * v, dur: 0.06, gain: g * 0.6, type: 'triangle' });
        break;
      case 'tile':
        this.noiseHit({ dur: 0.05, gain: g * 1.2, freq: 3200 * v, q: 3, verb: 0.6 });
        break;
      case 'metal':
        this.noiseHit({ dur: 0.08, gain: g, freq: 2200 * v, q: 6, verb: 0.4 });
        this.tone({ f: 420 * v, dur: 0.12, gain: g * 0.3, type: 'square' });
        break;
      case 'water':
        this.noiseHit({ dur: 0.22, gain: g * 1.3, freq: 1200 * v, q: 0.8, sweepTo: 400 });
        break;
      default:
        this.noiseHit({ dur: 0.06, gain: g, freq: 1500 * v, q: 1.5, verb: 0.2 });
    }
  }
  jump(): void {
    this.noiseHit({ dur: 0.22, gain: 0.08, freq: 700, sweepTo: 2200, q: 0.8 });
  }
  land(speed: number, surface: Surface): void {
    const s = Math.min(1, speed / 14);
    this.footstep(surface, 0.6 + s);
    this.tone({ f: 90, f2: 50, dur: 0.15, gain: 0.12 * s });
  }
  whoosh(): void {
    this.noiseHit({ dur: 0.25, gain: 0.12, freq: 500, sweepTo: 1600, q: 1.2 });
  }
  chime(pitch = 1): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    [0, 4, 7, 12].forEach((n, i) => this.bell(mtof(84 + n) * pitch, t + i * 0.07, 0.9, this.sfxBus));
  }
  stamp(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    [0, 7, 12, 16, 19].forEach((n, i) => this.bell(mtof(79 + n), t + i * 0.06, 1, this.sfxBus));
  }
  pulse(): void {
    this.tone({ f: 220, f2: 880, dur: 0.6, gain: 0.12, type: 'sine', verb: 1, attack: 0.05 });
    this.tone({ f: 330, f2: 1320, dur: 0.7, gain: 0.07, type: 'triangle', verb: 1, attack: 0.08 });
    this.noiseHit({ dur: 0.7, gain: 0.08, freq: 2500, sweepTo: 6000, q: 0.5, verb: 0.8 });
  }
  swing(): void {
    this.noiseHit({ dur: 0.18, gain: 0.14, freq: 900, sweepTo: 300, q: 1.5 });
  }
  hit(): void {
    this.tone({ f: 160, f2: 60, dur: 0.18, gain: 0.25, type: 'triangle' });
    this.noiseHit({ dur: 0.12, gain: 0.22, freq: 800, q: 0.8 });
  }
  crunch(): void {
    this.noiseHit({ dur: 0.35, gain: 0.25, freq: 1200, sweepTo: 300, q: 0.7 });
    this.tone({ f: 110, f2: 40, dur: 0.3, gain: 0.2, type: 'square' });
  }
  hurt(): void {
    this.tone({ f: 520, f2: 180, dur: 0.35, gain: 0.14, type: 'sawtooth' });
    this.noiseHit({ dur: 0.2, gain: 0.15, freq: 400, q: 0.5 });
  }
  ui(kind: 'move' | 'select' | 'back' = 'move'): void {
    const f = kind === 'select' ? 880 : kind === 'back' ? 440 : 660;
    this.tone({ f, f2: f * (kind === 'back' ? 0.8 : 1.2), dur: 0.08, gain: 0.07, type: 'triangle' });
  }
  blip(pitch: number): void {
    const f = pitch * (0.92 + this.rnd() * 0.16);
    this.tone({ f, dur: 0.05, gain: 0.05, type: 'triangle', attack: 0.004 });
  }
  stinger(kind: 'watcher' | 'static' | 'sleepless' | 'reveal' | 'spotted'): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    if (kind === 'reveal') {
      [60, 64, 67, 71, 74].forEach((n, i) => this.bell(mtof(n + 12), t + i * 0.12, 0.8, this.sfxBus));
      return;
    }
    if (kind === 'spotted') {
      this.tone({ f: 880, dur: 0.25, gain: 0.08, type: 'square' });
      this.tone({ t: t + 0.12, f: 1175, dur: 0.3, gain: 0.08, type: 'square' });
      return;
    }
    const base = kind === 'watcher' ? 55 : kind === 'static' ? 80 : 40;
    for (const det of [0, 1, 6, 13]) this.tone({ f: base * Math.pow(2, det / 12), dur: 2.2, gain: 0.07, type: 'sawtooth', verb: 1.2, attack: 0.3 });
    this.noiseHit({ dur: 1.6, gain: kind === 'sleepless' ? 0.25 : 0.12, freq: kind === 'static' ? 4000 : 900, q: 0.4, verb: 1 });
  }
  wake(): void {
    this.noiseHit({ dur: 1.4, gain: 0.25, freq: 200, sweepTo: 8000, q: 0.6, verb: 1 });
    this.tone({ f: 110, f2: 880, dur: 1.2, gain: 0.12, type: 'sine', verb: 1, attack: 0.6 });
  }
  door(): void {
    this.noiseHit({ dur: 0.5, gain: 0.12, freq: 300, q: 2, verb: 0.6, rate: 0.5 });
    this.tone({ f: 70, dur: 0.3, gain: 0.15, type: 'triangle', verb: 0.5 });
  }
  rumble(dur = 2): void {
    this.noiseHit({ dur, gain: 0.3, freq: 90, q: 0.4, type: 'lowpass', verb: 0.6 });
  }
  train(): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    this.tone({ t, f: 587, dur: 1.2, gain: 0.07, type: 'triangle', verb: 1, attack: 0.05 });
    this.tone({ t, f: 740, dur: 1.2, gain: 0.06, type: 'triangle', verb: 1, attack: 0.05 });
    this.tone({ t: t + 0.6, f: 494, dur: 1.4, gain: 0.07, type: 'triangle', verb: 1, attack: 0.05 });
  }
}
