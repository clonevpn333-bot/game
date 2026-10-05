import * as THREE from 'three';
import { createSeededRandom } from '../utils/random';

type MusicMode = 'silence' | 'calm' | 'dread' | 'boss' | 'eye' | 'title';

const BELL_PARTIALS: Array<[number, number, number]> = [
  // ratio, gain, decay seconds (scaled by bell size)
  [0.5, 0.5, 9],
  [1.0, 0.8, 7],
  [1.183, 0.45, 5],
  [1.506, 0.35, 4],
  [2.0, 0.55, 4],
  [2.514, 0.22, 2.6],
  [2.662, 0.2, 2.4],
  [3.011, 0.16, 2],
  [4.166, 0.12, 1.4],
  [5.433, 0.07, 1.0],
];

/**
 * All audio is synthesised at runtime: no asset files. There are three buses
 * (ambience, music, sfx), a shared convolution "cathedral" reverb, simple stereo
 * placement, and ducking during hitstop.
 */
export class Audio {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private music!: GainNode;
  private amb!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private noise!: AudioBuffer;
  private readonly rng = createSeededRandom(5150);
  private readonly levels = { wind: 0.5, rain: 0.6, crowd: 0, rumble: 0, fire: 0 };
  private bedGains: Partial<Record<keyof Audio['levels'], GainNode>> = {};
  private windFilter!: BiquadFilterNode;
  private mode: MusicMode = 'silence';
  private musicNodes: AudioNode[] = [];
  private musicGain!: GainNode;
  private chordTimer = 0;
  private chordIndex = 0;
  private drumTimer = 0;
  private voices: Array<{ osc: OscillatorNode[]; gain: GainNode }> = [];
  muted = false;
  volume = 0.8;
  readonly listener = new THREE.Vector3();
  listenerYaw = 0;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.music = ctx.createGain();
    this.amb = ctx.createGain();
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.amb.connect(this.master);
    this.music.gain.value = 0.55;
    this.amb.gain.value = 0.8;
    // Generated impulse response: long stone-hall tail.
    const len = ctx.sampleRate * 4.5;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch += 1) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i += 1) d[i] = (this.rng() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.5;
    this.reverbSend.connect(this.reverb).connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i += 1) nd[i] = this.rng() * 2 - 1;
    this.startBeds();
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    this.musicGain.connect(this.music);
    this.musicGain.connect(this.reverbSend);
    this.setMusic(this.mode, true);
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.ctx.currentTime, 0.05);
  }

  duck(amount: number, seconds: number): void {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this.amb.gain.cancelScheduledValues(t);
    this.amb.gain.setValueAtTime(0.8 * amount, t);
    this.amb.gain.linearRampToValueAtTime(0.8, t + seconds);
  }

  // ------------------------------------------------------------------ beds
  private noiseSource(): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = 0.8 + this.rng() * 0.4;
    return src;
  }

  private startBeds(): void {
    const ctx = this.ctx!;
    const mk = (key: keyof Audio['levels'], chain: (src: AudioNode) => AudioNode) => {
      const src = this.noiseSource();
      const g = ctx.createGain();
      g.gain.value = 0;
      chain(src).connect(g).connect(this.amb);
      src.start();
      this.bedGains[key] = g;
    };
    mk('wind', (src) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 500;
      bp.Q.value = 0.8;
      this.windFilter = bp;
      return src.connect(bp);
    });
    mk('rain', (src) => {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 1800;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 9000;
      return src.connect(hp).connect(lp);
    });
    mk('crowd', (src) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 620;
      bp.Q.value = 2.5;
      const bp2 = ctx.createBiquadFilter();
      bp2.type = 'peaking';
      bp2.frequency.value = 1100;
      bp2.gain.value = 6;
      return src.connect(bp).connect(bp2);
    });
    mk('rumble', (src) => {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 70;
      lp.Q.value = 3;
      const boost = ctx.createGain();
      boost.gain.value = 6;
      return src.connect(lp).connect(boost);
    });
    mk('fire', (src) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400;
      bp.Q.value = 1.4;
      return src.connect(bp);
    });
  }

  setBeds(levels: Partial<Audio['levels']>): void {
    Object.assign(this.levels, levels);
  }

  // ------------------------------------------------------------------ music
  setMusic(mode: MusicMode, force = false): void {
    if (mode === this.mode && !force) return;
    this.mode = mode;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.musicGain.gain.cancelScheduledValues(t);
    this.musicGain.gain.setTargetAtTime(mode === 'silence' ? 0 : mode === 'boss' ? 0.6 : mode === 'title' ? 0.45 : 0.4, t, 1.5);
    if (!this.voices.length) this.buildVoices();
    this.chordTimer = 0;
  }

  private buildVoices(): void {
    const ctx = this.ctx!;
    // Choir: per voice two detuned saws through "ah" formants.
    for (let v = 0; v < 4; v += 1) {
      const gain = ctx.createGain();
      gain.gain.value = 0.0;
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.frequency.value = 700;
      f1.Q.value = 6;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.frequency.value = 1150;
      f2.Q.value = 7;
      const mixG = ctx.createGain();
      mixG.gain.value = 0.9;
      f1.connect(mixG);
      f2.connect(mixG);
      mixG.connect(gain).connect(this.musicGain);
      const oscs: OscillatorNode[] = [];
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.detune.value = det;
        o.frequency.value = 110;
        o.connect(f1);
        o.connect(f2);
        o.start();
        oscs.push(o);
      }
      // Slow vibrato.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 4.5 + v * 0.3;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 4;
      lfo.connect(lfoG);
      for (const o of oscs) lfoG.connect(o.detune);
      lfo.start();
      this.voices.push({ osc: oscs, gain });
      this.musicNodes.push(gain);
    }
    // Low drone.
    const drone = ctx.createOscillator();
    drone.type = 'triangle';
    drone.frequency.value = 36.7;
    const dg = ctx.createGain();
    dg.gain.value = 0.35;
    drone.connect(dg).connect(this.musicGain);
    drone.start();
    this.voices.push({ osc: [drone], gain: dg });
  }

  private nextChord(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // D minor modal progressions; the eye and boss use darker, dissonant voicings.
    const calm = [[62, 65, 69, 74], [58, 65, 70, 74], [60, 64, 67, 72], [57, 64, 69, 73]];
    const dread = [[62, 63, 69, 74], [61, 65, 68, 73], [62, 65, 68, 71], [58, 61, 65, 70]];
    const boss = [[50, 57, 62, 63], [49, 56, 61, 64], [50, 53, 58, 62], [48, 55, 61, 63]];
    const eye = [[38, 45, 50, 51], [37, 44, 49, 52]];
    const title = [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 61]];
    const set = this.mode === 'boss' ? boss : this.mode === 'dread' ? dread : this.mode === 'eye' ? eye : this.mode === 'title' ? title : calm;
    const chord = set[this.chordIndex % set.length];
    this.chordIndex += 1;
    chord.forEach((note, i) => {
      const v = this.voices[i];
      if (!v) return;
      const f = 440 * Math.pow(2, (note - 69 - 12) / 12);
      for (const o of v.osc) o.frequency.setTargetAtTime(f, t, 0.6);
      v.gain.gain.setTargetAtTime(this.mode === 'silence' ? 0 : 0.11, t, 1.2);
    });
    const droneV = this.voices[4];
    if (droneV) droneV.osc[0].frequency.setTargetAtTime(440 * Math.pow(2, (chord[0] - 69 - 24) / 12), t, 1);
  }

  // ------------------------------------------------------------------ spatial helper
  private out(pos?: THREE.Vector3, gain = 1, reverb = 0.25): AudioNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    let dist = 0;
    let pan = 0;
    if (pos) {
      const dx = pos.x - this.listener.x;
      const dz = pos.z - this.listener.z;
      dist = Math.hypot(dx, dz, pos.y - this.listener.y);
      const ang = Math.atan2(dx, dz) - this.listenerYaw;
      pan = Math.max(-1, Math.min(1, -Math.sin(ang)));
    }
    g.gain.value = gain / (1 + dist * 0.06);
    const p = ctx.createStereoPanner();
    p.pan.value = pan * 0.8;
    g.connect(p).connect(this.sfx);
    if (reverb > 0) {
      const s = ctx.createGain();
      s.gain.value = reverb;
      g.connect(s).connect(this.reverbSend);
    }
    return g;
  }

  private burst(dest: AudioNode, t: number, dur: number, type: BiquadFilterType, freq: number, q: number, gain: number, attack = 0.005): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.9 + this.rng() * 0.2;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(t, this.rng() * 1.5);
    src.stop(t + dur + 0.05);
  }

  private tone(dest: AudioNode, t: number, type: OscillatorType, f0: number, f1: number, dur: number, gain: number, attack = 0.005): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private get ok(): boolean {
    return !!this.ctx && this.ctx.state === 'running';
  }

  // ------------------------------------------------------------------ sfx
  bell(pos: THREE.Vector3 | undefined, size: number, delay = 0, gain = 0.5): void {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const base = 260 / Math.max(0.4, size);
    const dest = this.out(pos, gain, 0.9);
    for (const [ratio, g, decay] of BELL_PARTIALS) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = base * ratio * (1 + (this.rng() - 0.5) * 0.004);
      const gg = ctx.createGain();
      gg.gain.setValueAtTime(0, t);
      gg.gain.linearRampToValueAtTime(g * 0.4, t + 0.004);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + decay * Math.min(2, size * 0.8 + 0.4));
      o.connect(gg).connect(dest);
      o.start(t);
      o.stop(t + decay * Math.min(2, size * 0.8 + 0.4) + 0.1);
    }
    this.burst(dest, t, 0.08, 'bandpass', 3000, 2, 0.3);
  }

  swing(heavy: boolean): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(undefined, heavy ? 0.6 : 0.4, 0.1);
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 2;
    f.frequency.setValueAtTime(400, t);
    f.frequency.exponentialRampToValueAtTime(heavy ? 1600 : 2600, t + 0.12);
    f.frequency.exponentialRampToValueAtTime(500, t + 0.3);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(1, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + (heavy ? 0.4 : 0.28));
    src.connect(f).connect(g).connect(d);
    src.start(t, this.rng());
    src.stop(t + 0.5);
  }

  hit(pos: THREE.Vector3, kind: string, heavy: boolean): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(pos, heavy ? 0.9 : 0.7, 0.3);
    if (kind === 'mite') {
      // Crunching carapace.
      this.burst(d, t, 0.12, 'bandpass', 1400, 1.5, 0.9);
      this.burst(d, t + 0.02, 0.2, 'lowpass', 500, 1, 0.7);
      this.tone(d, t, 'square', 220, 90, 0.08, 0.15);
    } else {
      // Metal and stone: short inharmonic clang.
      const base = kind === 'boss' ? 180 : 420;
      for (const r of [1, 2.76, 5.4, 8.93]) this.tone(d, t, 'sine', base * r, base * r * 0.98, 0.25 + (heavy ? 0.25 : 0), 0.18 / r);
      this.burst(d, t, 0.09, 'highpass', 2500, 0.7, 0.6);
      this.tone(d, t, 'sine', 90, 45, 0.25, heavy ? 0.6 : 0.35);
    }
  }

  hurt(heavy: boolean): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(undefined, 0.7, 0.15);
    this.tone(d, t, 'sawtooth', 160, 95, 0.25, 0.25, 0.01);
    this.burst(d, t, 0.25, 'bandpass', 700, 3, 0.5);
    this.tone(d, t, 'sine', 70, 40, heavy ? 0.4 : 0.2, heavy ? 0.8 : 0.5);
  }

  roll(): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(undefined, 0.35, 0.05);
    this.burst(d, t, 0.35, 'bandpass', 900, 0.8, 0.8, 0.06);
    this.burst(d, t + 0.3, 0.15, 'highpass', 4000, 0.5, 0.4);
  }

  footstep(pos: THREE.Vector3, heavy: boolean, stone = true): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(pos, heavy ? 0.55 : 0.32, 0.08);
    this.burst(d, t, 0.07, 'lowpass', stone ? 900 : 500, 1, 0.9);
    this.tone(d, t, 'sine', heavy ? 70 : 110, 50, 0.08, heavy ? 0.5 : 0.25);
    if (this.rng() < 0.6) this.burst(d, t + 0.02, 0.06, 'highpass', 6000, 0.5, 0.15);
  }

  hoof(pos: THREE.Vector3): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(pos, 0.35, 0.05);
    this.tone(d, t, 'sine', 140, 60, 0.07, 0.6);
    this.burst(d, t, 0.04, 'bandpass', 1800, 2, 0.4);
  }

  thunder(distance: number): void {
    if (!this.ok) return;
    const delay = Math.min(4, distance / 340);
    const t = this.ctx!.currentTime + delay;
    const d = this.out(undefined, 0.9, 0.6);
    this.burst(d, t, 3.2, 'lowpass', 180, 0.7, 1.2, 0.08);
    this.burst(d, t + 0.1, 1.2, 'lowpass', 600, 0.5, 0.5, 0.02);
    this.burst(d, t + 0.6, 2.4, 'lowpass', 120, 0.5, 0.8, 0.3);
  }

  bark(pos: THREE.Vector3): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(pos, 0.5, 0.3);
    this.tone(d, t, 'sawtooth', 520, 300, 0.12, 0.35, 0.01);
    this.burst(d, t, 0.1, 'bandpass', 1200, 4, 0.5);
  }

  scream(pos: THREE.Vector3, pitch = 1): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime + this.rng() * 0.3;
    const d = this.out(pos, 0.25, 0.5);
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(500 * pitch, t);
    o.frequency.linearRampToValueAtTime(820 * pitch, t + 0.25);
    o.frequency.linearRampToValueAtTime(420 * pitch, t + 1.1);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1300;
    f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    o.connect(f).connect(g).connect(d);
    o.start(t);
    o.stop(t + 1.3);
  }

  crows(): void {
    if (!this.ok) return;
    for (let i = 0; i < 9; i += 1) {
      const t = this.ctx!.currentTime + this.rng() * 1.6;
      const d = this.out(undefined, 0.18, 0.4);
      this.tone(d, t, 'sawtooth', 900, 600, 0.18, 0.4, 0.01);
      this.burst(d, t, 0.15, 'bandpass', 1600, 3, 0.3);
    }
  }

  crumble(pos: THREE.Vector3, size = 1): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(pos, 0.6 * size, 0.5);
    for (let i = 0; i < 6; i += 1) this.burst(d, t + i * 0.07 * this.rng(), 0.3 + this.rng() * 0.4, 'lowpass', 300 + this.rng() * 900, 1, 0.5);
    this.tone(d, t, 'sine', 60, 30, 0.8, 0.8 * size);
  }

  slam(pos: THREE.Vector3): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(pos, 1.0, 0.7);
    this.tone(d, t, 'sine', 80, 28, 1.0, 1.0);
    this.burst(d, t, 0.6, 'lowpass', 400, 0.8, 0.9);
    this.bell(pos, 1.6, 0, 0.25);
  }

  toll(pos: THREE.Vector3, big: boolean): void {
    this.bell(pos, big ? 3 : 0.9, 0, big ? 0.9 : 0.4);
  }

  telegraph(pos: THREE.Vector3, kind: string): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(pos, 0.3, 0.3);
    if (kind.startsWith('boss')) {
      this.tone(d, t, 'sawtooth', 55, 70, 0.7, 0.35, 0.2);
      this.burst(d, t, 0.6, 'bandpass', 300, 5, 0.4, 0.2);
    } else if (kind === 'mite') {
      this.burst(d, t, 0.3, 'bandpass', 3200, 8, 0.5, 0.02);
      this.tone(d, t, 'square', 1300, 1800, 0.25, 0.08);
    } else {
      this.tone(d, t, 'triangle', 300, 380, 0.4, 0.15, 0.1);
    }
  }

  flask(): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(undefined, 0.4, 0.6);
    this.tone(d, t, 'sine', 880, 1320, 0.6, 0.25, 0.05);
    this.tone(d, t + 0.08, 'sine', 1320, 1760, 0.8, 0.15, 0.05);
  }

  candle(): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(undefined, 0.5, 0.9);
    this.burst(d, t, 0.6, 'bandpass', 800, 0.7, 0.6, 0.15);
    [587, 740, 880, 1175].forEach((f, i) => this.tone(d, t + 0.15 + i * 0.12, 'sine', f, f, 1.6, 0.12, 0.02));
  }

  stinger(kind: 'death' | 'victory' | 'eye' | 'title'): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(undefined, 0.6, 1);
    const sets: Record<string, number[]> = {
      death: [38, 45, 49, 53],
      victory: [50, 57, 62, 66, 69],
      eye: [26, 27, 33, 38, 39],
      title: [50, 57, 62],
    };
    for (const n of sets[kind]) {
      const f = 440 * Math.pow(2, (n - 69) / 12);
      this.tone(d, t, 'sawtooth', f, f * (kind === 'eye' ? 0.94 : 1), kind === 'eye' ? 7 : 4, 0.06, 0.6);
    }
    if (kind === 'eye') {
      this.tone(d, t, 'sine', 50, 18, 6, 1.0, 1.5);
      this.burst(d, t, 6, 'lowpass', 120, 1, 1.2, 2);
    }
  }

  roar(pos?: THREE.Vector3): void {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const d = this.out(pos, 1.2, 0.8);
    for (const [f, det] of [[70, 0], [104, 7], [140, -9]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.detune.value = det;
      o.frequency.setValueAtTime(f * 0.7, t);
      o.frequency.linearRampToValueAtTime(f * 1.3, t + 0.6);
      o.frequency.linearRampToValueAtTime(f * 0.6, t + 2.4);
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.setValueAtTime(300, t);
      fl.frequency.linearRampToValueAtTime(1400, t + 0.6);
      fl.frequency.linearRampToValueAtTime(400, t + 2.4);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
      o.connect(fl).connect(g).connect(d);
      o.start(t);
      o.stop(t + 2.7);
    }
    this.burst(d, t, 2.4, 'bandpass', 600, 0.8, 0.9, 0.3);
  }

  flap(pos: THREE.Vector3): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    this.burst(this.out(pos, 0.9, 0.3), t, 0.45, 'lowpass', 220, 0.7, 1.2, 0.12);
  }

  fire(pos: THREE.Vector3, seconds: number): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(pos, 0.9, 0.4);
    this.burst(d, t, seconds, 'lowpass', 900, 0.6, 1.0, 0.15);
    this.burst(d, t, seconds, 'bandpass', 2400, 0.8, 0.35, 0.2);
  }

  cackle(pos?: THREE.Vector3): void {
    if (!this.ok) return;
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const d = this.out(pos, 0.35, 0.7);
    for (let i = 0; i < 6; i += 1) {
      const st = t + i * 0.14;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(700 - i * 30, st);
      o.frequency.exponentialRampToValueAtTime(420 - i * 20, st + 0.12);
      const fl = ctx.createBiquadFilter();
      fl.type = 'bandpass';
      fl.frequency.value = 1500;
      fl.Q.value = 4;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.4, st + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, st + 0.13);
      o.connect(fl).connect(g).connect(d);
      o.start(st);
      o.stop(st + 0.15);
    }
  }

  zap(pos: THREE.Vector3): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(pos, 0.4, 0.5);
    this.tone(d, t, 'square', 900, 180, 0.35, 0.12, 0.01);
    this.burst(d, t, 0.3, 'highpass', 3000, 0.7, 0.4);
  }

  ui(): void {
    if (!this.ok) return;
    const t = this.ctx!.currentTime;
    const d = this.out(undefined, 0.2, 0.2);
    this.tone(d, t, 'triangle', 660, 640, 0.15, 0.3);
  }

  update(dt: number): void {
    if (!this.ctx || !this.bedGains.wind) return;
    const t = this.ctx.currentTime;
    for (const key of Object.keys(this.levels) as Array<keyof Audio['levels']>) {
      const g = this.bedGains[key];
      if (g) g.gain.setTargetAtTime(this.levels[key] * (key === 'rumble' ? 0.9 : key === 'fire' ? 0.12 : 0.35), t, 0.4);
    }
    this.windFilter.frequency.setTargetAtTime(380 + Math.sin(t * 0.21) * 160 + Math.sin(t * 0.67) * 90, t, 0.5);
    if (this.mode !== 'silence') {
      this.chordTimer -= dt;
      if (this.chordTimer <= 0) {
        this.chordTimer = this.mode === 'boss' ? 4.2 : 9;
        this.nextChord();
      }
    }
    if (this.mode === 'boss') {
      this.drumTimer -= dt;
      if (this.drumTimer <= 0) {
        this.drumTimer = 60 / 76;
        const d = this.out(undefined, 0.5, 0.4);
        this.tone(d, t, 'sine', 90, 38, 0.5, 0.9);
        if (this.rng() < 0.35) this.tone(d, t + 60 / 76 / 2, 'sine', 80, 40, 0.3, 0.5);
      }
    }
  }
}
