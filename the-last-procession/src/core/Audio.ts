/**
 * Fully synthesized score + sound design (no audio files): a lookahead music
 * sequencer with mood presets, event SFX, and crossfading ambience beds.
 */

export type Mood =
  | 'none'
  | 'wonder'
  | 'action'
  | 'ride'
  | 'campfire'
  | 'train'
  | 'climb'
  | 'inside'
  | 'reveal'
  | 'battle'
  | 'farewell'
  | 'credits';

type Inst = 'pad' | 'choir' | 'pluck' | 'bell' | 'bass' | 'ostinato' | 'brass' | 'kick' | 'taiko' | 'snare' | 'hat' | 'tick';

interface MoodDef {
  bpm: number;
  beatsPerBar: number;
  chords: number[][]; // midi notes, one chord per `barsPerChord` bars
  barsPerChord: number;
  layers: Partial<Record<Inst, number>>; // instrument -> gain
  drum?: { kick?: string; snare?: string; hat?: string; taiko?: string }; // 16-step strings, x = hit
  arp?: { inst: Inst; rate: 2 | 3 | 4; pattern: number[] };
  melody?: { inst: Inst; notes: (number | null)[]; stepBeats: number };
  ostinato?: boolean;
  bassPattern?: string;
}

const THEME = [74, null, 77, 76, 74, null, 69, 72, 74, null, null, null, 77, 79, 81, 79, 77, null, 76, 74, null, null, null, null];

const MOODS: Record<Exclude<Mood, 'none'>, MoodDef> = {
  wonder: {
    bpm: 62, beatsPerBar: 4, barsPerChord: 2,
    chords: [[50, 57, 62, 64, 69], [46, 53, 58, 62, 65], [41, 53, 57, 60, 65], [48, 55, 60, 64, 67]],
    layers: { pad: 0.16, choir: 0.08, bell: 0.07, bass: 0.1 },
    melody: { inst: 'bell', notes: THEME, stepBeats: 1 },
  },
  action: {
    bpm: 138, beatsPerBar: 4, barsPerChord: 1,
    chords: [[38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [36, 48, 55, 60, 64], [33, 45, 52, 57, 61]],
    layers: { pad: 0.08, ostinato: 0.07, bass: 0.13, brass: 0.07, taiko: 0.34, snare: 0.12, hat: 0.04, kick: 0.25 },
    drum: { taiko: 'x.....x...x.....', kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xx' },
    ostinato: true,
    bassPattern: 'x.x.x.x.x.x.x.x.',
  },
  ride: {
    bpm: 126, beatsPerBar: 4, barsPerChord: 2,
    chords: [[38, 50, 57, 62, 65], [41, 53, 57, 60, 65], [36, 48, 55, 60, 64], [34, 46, 53, 58, 62]],
    layers: { pad: 0.1, ostinato: 0.06, bass: 0.12, taiko: 0.22, hat: 0.035, brass: 0.05, bell: 0.05 },
    drum: { taiko: 'x..x..x.x..x..x.', hat: 'x.xx.xx.xx.xx.xx' },
    ostinato: true,
    bassPattern: 'x..x..x.x..x..x.',
    melody: { inst: 'bell', notes: THEME, stepBeats: 1 },
  },
  campfire: {
    bpm: 74, beatsPerBar: 4, barsPerChord: 1,
    chords: [[41, 57, 60, 65, 69], [40, 55, 60, 64, 67], [38, 57, 62, 65, 69], [34, 53, 58, 62, 65]],
    layers: { pad: 0.07, pluck: 0.09, bass: 0.06 },
    arp: { inst: 'pluck', rate: 2, pattern: [0, 2, 3, 4, 3, 2, 1, 2] },
  },
  train: {
    bpm: 112, beatsPerBar: 4, barsPerChord: 2,
    chords: [[38, 50, 57, 62, 65], [43, 55, 58, 62, 67], [36, 48, 55, 60, 64], [45, 52, 57, 61, 64]],
    layers: { pad: 0.08, bass: 0.12, hat: 0.05, kick: 0.2, snare: 0.08, ostinato: 0.055, brass: 0.05 },
    drum: { kick: 'x...x...x...x...', hat: '.xx.xx.xx.xx.xx.', snare: '....x.......x..x' },
    ostinato: true,
    bassPattern: 'x...x.x.x...x.x.',
  },
  climb: {
    bpm: 88, beatsPerBar: 4, barsPerChord: 2,
    chords: [[38, 50, 57, 62, 65], [39, 51, 58, 63, 67], [38, 50, 57, 62, 65], [36, 48, 55, 60, 63]],
    layers: { pad: 0.12, choir: 0.05, bass: 0.1, taiko: 0.2, ostinato: 0.04 },
    drum: { taiko: 'x.......x.....x.' },
    ostinato: true,
  },
  inside: {
    bpm: 70, beatsPerBar: 4, barsPerChord: 2,
    chords: [[45, 57, 60, 64, 69], [41, 57, 60, 65, 69], [38, 57, 62, 65, 69], [40, 56, 59, 64, 68]],
    layers: { pad: 0.1, choir: 0.08, tick: 0.05, bell: 0.05, bass: 0.07 },
    drum: { hat: 'x...x...x...x...' },
    arp: { inst: 'bell', rate: 2, pattern: [4, 2, 3, 1] },
  },
  reveal: {
    bpm: 58, beatsPerBar: 4, barsPerChord: 2,
    chords: [[38, 50, 57, 62, 66, 69], [34, 46, 53, 58, 62, 65], [41, 53, 57, 60, 65, 69], [36, 48, 55, 60, 64, 67]],
    layers: { pad: 0.16, choir: 0.14, bass: 0.12, bell: 0.06, taiko: 0.18 },
    drum: { taiko: 'x...............' },
    melody: { inst: 'bell', notes: THEME, stepBeats: 1 },
  },
  battle: {
    bpm: 132, beatsPerBar: 4, barsPerChord: 1,
    chords: [[38, 50, 57, 62, 65], [34, 46, 53, 58, 62], [41, 53, 57, 60, 65], [36, 48, 55, 60, 64]],
    layers: { pad: 0.1, choir: 0.06, ostinato: 0.07, bass: 0.13, brass: 0.08, taiko: 0.36, snare: 0.12, kick: 0.25, hat: 0.03 },
    drum: { taiko: 'x..x..x.x.....x.', kick: 'x.......x.......', snare: '....x.......x.xx', hat: 'x.x.x.x.x.x.x.x.' },
    ostinato: true,
    bassPattern: 'x.x.x.x.x.x.x.x.',
  },
  farewell: {
    bpm: 66, beatsPerBar: 4, barsPerChord: 1,
    chords: [[50, 62, 66, 69, 74], [49, 61, 64, 69, 73], [47, 62, 66, 71, 74], [43, 59, 62, 67, 71]],
    layers: { pad: 0.12, choir: 0.06, pluck: 0.08, bass: 0.07, bell: 0.06 },
    arp: { inst: 'pluck', rate: 2, pattern: [0, 2, 4, 3, 2, 3, 4, 2] },
    melody: { inst: 'bell', notes: THEME.map((n) => (n === null ? null : n === 77 ? 78 : n === 72 ? 73 : n)), stepBeats: 1 },
  },
  credits: {
    bpm: 76, beatsPerBar: 4, barsPerChord: 1,
    chords: [[50, 62, 66, 69, 74], [46, 58, 62, 65, 70], [41, 57, 60, 65, 69], [45, 57, 61, 64, 69]],
    layers: { pad: 0.12, choir: 0.06, pluck: 0.08, bass: 0.09, bell: 0.07, taiko: 0.12 },
    drum: { taiko: 'x.......x.......' },
    arp: { inst: 'pluck', rate: 2, pattern: [0, 2, 4, 3, 1, 3, 4, 2] },
    melody: { inst: 'bell', notes: THEME, stepBeats: 1 },
  },
};

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export type AmbienceKey = 'wind' | 'fire' | 'crowd' | 'rumble' | 'machine' | 'rail';

export class Audio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  private noise!: AudioBuffer;
  private moodGain: GainNode | null = null;
  private mood: Mood = 'none';
  private pendingMood: Mood = 'none';
  private schedTimer = 0;
  private nextStepTime = 0;
  private step = 0;
  private readonly amb = new Map<AmbienceKey, { gain: GainNode; target: number }>();
  private pendingAmb: Partial<Record<AmbienceKey, number>> = {};
  muted = false;
  musicVolume = 0.8;
  intensity = 1; // 0..1 scales drums for dynamic set pieces

  /** Must be called from a user gesture. */
  unlock(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.ambBus.connect(this.master);
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(3.2, 2.4);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.6;
    this.reverbSend.connect(this.reverb).connect(this.master);
    this.noise = this.makeNoise();
    this.startAmbienceBeds();
    const moodToStart = this.pendingMood;
    this.mood = 'none';
    if (moodToStart !== 'none') this.setMusic(moodToStart);
    for (const [k, v] of Object.entries(this.pendingAmb)) this.setAmbience(k as AmbienceKey, v ?? 0);
    this.schedTimer = window.setInterval(() => this.schedule(), 25);
  }

  get ready(): boolean {
    return !!this.ctx;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // ---------------------------------------------------------------- music
  setMusic(mood: Mood): void {
    this.pendingMood = mood;
    if (!this.ctx || mood === this.mood) return;
    const ctx = this.ctx;
    if (this.moodGain) {
      const g = this.moodGain;
      g.gain.cancelScheduledValues(ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.2);
      setTimeout(() => g.disconnect(), 2600);
    }
    this.mood = mood;
    this.moodGain = null;
    if (mood === 'none') return;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(1, ctx.currentTime + 1.6);
    g.connect(this.musicBus);
    const send = ctx.createGain();
    send.gain.value = 0.45;
    g.connect(send).connect(this.reverbSend);
    this.moodGain = g;
    this.step = 0;
    this.nextStepTime = ctx.currentTime + 0.08;
  }

  get currentMood(): Mood {
    return this.mood;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || this.mood === 'none' || !this.moodGain) return;
    const def = MOODS[this.mood];
    const stepDur = 60 / def.bpm / 4; // 16th notes
    while (this.nextStepTime < ctx.currentTime + 0.15) {
      this.playStep(def, this.step, this.nextStepTime, stepDur);
      this.step++;
      this.nextStepTime += stepDur;
    }
  }

  private playStep(def: MoodDef, step: number, t: number, sd: number): void {
    const out = this.moodGain!;
    const stepsPerBar = def.beatsPerBar * 4;
    const bar = Math.floor(step / stepsPerBar);
    const s = step % stepsPerBar;
    const chord = def.chords[Math.floor(bar / def.barsPerChord) % def.chords.length];
    const L = def.layers;
    const chordDur = stepsPerBar * def.barsPerChord * sd;
    const firstOfChord = s === 0 && bar % def.barsPerChord === 0;
    const inten = this.intensity;
    if (firstOfChord) {
      if (L.pad) for (const n of chord.slice(1)) this.voice('pad', mtof(n), t, chordDur * 1.05, L.pad / chord.length, out);
      if (L.choir) for (const n of chord.slice(2)) this.voice('choir', mtof(n + 12), t, chordDur * 1.05, L.choir / 3, out);
    }
    if (L.bass) {
      const pat = def.bassPattern;
      if (pat ? pat[s] === 'x' : s === 0 || s === 8) this.voice('bass', mtof(chord[0] - (chord[0] > 45 ? 12 : 0)), t, pat ? sd * 1.8 : sd * 7, L.bass, out);
    }
    if (def.ostinato && L.ostinato && s % 2 === 0) {
      const seq = [chord[1], chord[2], chord[1], chord[3]];
      this.voice('ostinato', mtof(seq[(s / 2) % 4] + 12), t, sd * 1.6, L.ostinato * (0.6 + inten * 0.4), out);
    }
    if (L.brass && s === 0 && bar % 2 === 0) for (const n of chord.slice(1, 4)) this.voice('brass', mtof(n), t, sd * 6, (L.brass * inten) / 2, out);
    if (def.drum) {
      const d = def.drum;
      if (L.kick && d.kick?.[s] === 'x') this.voice('kick', 0, t, 0.4, L.kick * inten, out);
      if (L.taiko && d.taiko?.[s] === 'x') this.voice('taiko', 0, t, 0.8, L.taiko * (0.5 + inten * 0.5), out);
      if (L.snare && d.snare?.[s] === 'x') this.voice('snare', 0, t, 0.2, L.snare * inten, out);
      if ((L.hat || L.tick) && d.hat?.[s] === 'x') this.voice(L.tick ? 'tick' : 'hat', 0, t, 0.05, (L.hat ?? L.tick ?? 0) * inten, out);
    }
    if (def.arp) {
      const per = 16 / (def.arp.rate * 4);
      if (s % per === 0) {
        const idx = Math.floor(step / per) % def.arp.pattern.length;
        const deg = def.arp.pattern[idx];
        const note = chord[Math.min(chord.length - 1, deg)] + 12;
        this.voice(def.arp.inst, mtof(note), t, sd * per * 3, L[def.arp.inst] ?? 0.05, out);
      }
    }
    if (def.melody && s % (def.melody.stepBeats * 4) === 0 && bar % 8 >= 4) {
      const mStep = Math.floor(step / (def.melody.stepBeats * 4));
      const n = def.melody.notes[mStep % def.melody.notes.length];
      if (n !== null) this.voice(def.melody.inst, mtof(n), t, sd * 10, (L[def.melody.inst] ?? 0.05) * 1.3, out);
    }
  }

  private voice(inst: Inst, f: number, t: number, dur: number, vol: number, out: AudioNode): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(out);
    const env = (a: number, peak: number, rel: number) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(peak, t + a);
      g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    };
    const osc = (type: OscillatorType, freq: number, detune = 0, dest: AudioNode = g) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(dest);
      o.start(t);
      o.stop(t + dur + 2);
      return o;
    };
    switch (inst) {
      case 'pad': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 900;
        lp.Q.value = 0.4;
        lp.connect(g);
        osc('sawtooth', f, -9, lp);
        osc('sawtooth', f, 8, lp);
        osc('triangle', f / 2, 0, lp);
        env(dur * 0.35, vol, dur * 0.4);
        break;
      }
      case 'choir': {
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 800;
        bp.Q.value = 1.4;
        bp.connect(g);
        const o1 = osc('sawtooth', f, -6, bp);
        const o2 = osc('sawtooth', f, 6, bp);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.2;
        const lg = ctx.createGain();
        lg.gain.value = 9;
        lfo.connect(lg);
        lg.connect(o1.detune);
        lg.connect(o2.detune);
        lfo.start(t);
        lfo.stop(t + dur + 2);
        env(dur * 0.4, vol, dur * 0.4);
        break;
      }
      case 'pluck': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(4000, t);
        lp.frequency.exponentialRampToValueAtTime(500, t + 0.4);
        lp.connect(g);
        osc('triangle', f, 0, lp);
        osc('square', f * 2, 4, lp).frequency.value = f;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 1.6));
        break;
      }
      case 'bell': {
        const mod = ctx.createOscillator();
        mod.frequency.value = f * 3.51;
        const mg = ctx.createGain();
        mg.gain.setValueAtTime(f * 2.2, t);
        mg.gain.exponentialRampToValueAtTime(1, t + 1.5);
        mod.connect(mg);
        const car = osc('sine', f);
        mg.connect(car.frequency);
        mod.start(t);
        mod.stop(t + 4);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
        break;
      }
      case 'bass': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 320;
        lp.connect(g);
        osc('sawtooth', f, 0, lp);
        osc('sine', f, 0, g);
        env(0.02, vol, Math.min(0.3, dur * 0.3));
        break;
      }
      case 'ostinato': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 2200;
        lp.connect(g);
        osc('sawtooth', f, -5, lp);
        osc('sawtooth', f, 5, lp);
        env(0.01, vol, 0.08);
        break;
      }
      case 'brass': {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(300, t);
        lp.frequency.linearRampToValueAtTime(1800, t + 0.12);
        lp.frequency.linearRampToValueAtTime(900, t + dur);
        lp.connect(g);
        osc('sawtooth', f, -4, lp);
        osc('sawtooth', f, 4, lp);
        env(0.06, vol, 0.25);
        break;
      }
      case 'kick':
      case 'taiko': {
        const o = osc('sine', inst === 'taiko' ? 110 : 140);
        o.frequency.setValueAtTime(inst === 'taiko' ? 110 : 140, t);
        o.frequency.exponentialRampToValueAtTime(inst === 'taiko' ? 38 : 45, t + 0.25);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (inst === 'taiko' ? 0.9 : 0.35));
        if (inst === 'taiko') this.noiseBurst(t, 0.12, 900, vol * 0.5, out, 'lowpass');
        break;
      }
      case 'snare':
        this.noiseBurst(t, 0.16, 1800, vol, out, 'bandpass');
        break;
      case 'hat':
        this.noiseBurst(t, 0.04, 8000, vol, out, 'highpass');
        break;
      case 'tick':
        this.noiseBurst(t, 0.02, 5000, vol, out, 'bandpass', 8);
        break;
    }
  }

  private noiseBurst(t: number, dur: number, freq: number, vol: number, out: AudioNode, type: BiquadFilterType, q = 1): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  // ---------------------------------------------------------------- sfx
  private now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private sfxOut(reverb = 0.2): AudioNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(this.sfxBus);
    if (reverb > 0) {
      const s = ctx.createGain();
      s.gain.value = reverb;
      g.connect(s).connect(this.reverbSend);
    }
    return g;
  }

  sfx(name: string, vol = 1, pitch = 1): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = this.now();
    switch (name) {
      case 'stomp': {
        // giant footfall: sub thump + long rumble + debris crackle
        const out = this.sfxOut(0.6);
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(70 * pitch, t);
        o.frequency.exponentialRampToValueAtTime(24, t + 1.2);
        g.gain.setValueAtTime(0.9 * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 2.4);
        this.noiseBurst(t, 2.5, 180, 0.5 * vol, out, 'lowpass');
        this.noiseBurst(t + 0.05, 0.9, 2200, 0.12 * vol, out, 'bandpass', 0.6);
        break;
      }
      case 'boom': {
        const out = this.sfxOut(0.5);
        this.noiseBurst(t, 1.8, 400, 0.7 * vol, out, 'lowpass');
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(90, t);
        o.frequency.exponentialRampToValueAtTime(30, t + 0.8);
        g.gain.setValueAtTime(0.7 * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 1.3);
        break;
      }
      case 'crash':
        this.noiseBurst(t, 0.8, 1200, 0.45 * vol, this.sfxOut(0.35), 'bandpass', 0.5);
        this.noiseBurst(t, 1.2, 250, 0.4 * vol, this.sfxOut(0.3), 'lowpass');
        break;
      case 'swing': {
        const out = this.sfxOut(0.1);
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.Q.value = 2;
        f.frequency.setValueAtTime(600 * pitch, t);
        f.frequency.exponentialRampToValueAtTime(3200 * pitch, t + 0.16);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.35 * vol, t + 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
        src.connect(f).connect(g).connect(out);
        src.start(t, Math.random());
        src.stop(t + 0.3);
        break;
      }
      case 'hit': {
        const out = this.sfxOut(0.15);
        this.noiseBurst(t, 0.12, 1500, 0.5 * vol, out, 'bandpass', 0.8);
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.setValueAtTime(180 * pitch, t);
        o.frequency.exponentialRampToValueAtTime(60, t + 0.15);
        g.gain.setValueAtTime(0.6 * vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 0.25);
        break;
      }
      case 'clang': {
        const out = this.sfxOut(0.4);
        for (const r of [1, 2.76, 5.4]) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = 520 * pitch * r;
          g.gain.setValueAtTime((0.22 * vol) / r, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7 / r + 0.2);
          o.connect(g).connect(out);
          o.start(t);
          o.stop(t + 1);
        }
        this.noiseBurst(t, 0.05, 4000, 0.3 * vol, out, 'highpass');
        break;
      }
      case 'bell': {
        // cathedral bell toll with inharmonic partials
        const out = this.sfxOut(0.8);
        const base = 98 * pitch;
        for (const [r, a] of [[0.5, 0.4], [1, 0.5], [1.19, 0.25], [1.5, 0.2], [2, 0.18], [2.74, 0.1]] as const) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.value = base * r;
          g.gain.setValueAtTime(a * vol * 0.6, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 5 / Math.sqrt(r));
          o.connect(g).connect(out);
          o.start(t);
          o.stop(t + 6);
        }
        break;
      }
      case 'jump':
        this.noiseBurst(t, 0.18, 900, 0.18 * vol, this.sfxOut(0), 'bandpass', 1.2);
        break;
      case 'land':
        this.noiseBurst(t, 0.12, 300, 0.35 * vol, this.sfxOut(0.05), 'lowpass');
        break;
      case 'step':
        this.noiseBurst(t, 0.06, 500 * pitch, 0.12 * vol, this.sfxOut(0), 'lowpass');
        break;
      case 'hoof': {
        const out = this.sfxOut(0.05);
        this.noiseBurst(t, 0.07, 420, 0.32 * vol, out, 'lowpass');
        this.noiseBurst(t, 0.03, 2400, 0.08 * vol, out, 'bandpass');
        break;
      }
      case 'hurt': {
        const out = this.sfxOut(0.1);
        this.noiseBurst(t, 0.2, 700, 0.5 * vol, out, 'lowpass');
        this.blip(t + 0.02, 150, 0.22, 0.25 * vol, out, 'sawtooth', 0.6);
        break;
      }
      case 'whoosh': {
        const out = this.sfxOut(0.2);
        const src = ctx.createBufferSource();
        src.buffer = this.noise;
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.setValueAtTime(300, t);
        f.frequency.exponentialRampToValueAtTime(1600, t + 0.5);
        f.frequency.exponentialRampToValueAtTime(200, t + 1.1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.4 * vol, t + 0.45);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        src.connect(f).connect(g).connect(out);
        src.start(t, Math.random());
        src.stop(t + 1.3);
        break;
      }
      case 'shimmer': {
        const out = this.sfxOut(0.9);
        [74, 78, 81, 86, 90].forEach((m, i) => this.blip(t + i * 0.07, mtof(m) * pitch, 1.4, 0.07 * vol, out, 'sine', 1));
        break;
      }
      case 'choir': {
        const out = this.sfxOut(0.9);
        for (const m of [62, 66, 69, 74]) this.voice('choir', mtof(m), t, 4, 0.08 * vol, out);
        break;
      }
      case 'ui':
        this.blip(t, 880 * pitch, 0.08, 0.08 * vol, this.sfxOut(0.1), 'triangle', 1);
        break;
      case 'confirm': {
        const out = this.sfxOut(0.3);
        this.blip(t, 660, 0.15, 0.08 * vol, out, 'triangle', 1);
        this.blip(t + 0.08, 990, 0.3, 0.08 * vol, out, 'triangle', 1);
        break;
      }
      case 'gear':
        this.noiseBurst(t, 0.5, 160, 0.3 * vol, this.sfxOut(0.4), 'bandpass', 4);
        break;
      case 'cannon':
        this.sfx('boom', vol * 0.7, pitch);
        this.noiseBurst(t, 0.3, 3000, 0.2 * vol, this.sfxOut(0.4), 'highpass');
        break;
      case 'creak': {
        const out = this.sfxOut(0.5);
        this.blip(t, 70 * pitch, 1.4, 0.18 * vol, out, 'sawtooth', 0.7);
        break;
      }
    }
  }

  private blip(t: number, f: number, dur: number, vol: number, out: AudioNode, type: OscillatorType, endRatio: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (endRatio !== 1) o.frequency.exponentialRampToValueAtTime(f * endRatio, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Retro "voice" babble while a line is typed out. */
  voiceBlip(speaker: string): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const base: Record<string, number> = { KAEL: 150, LYRA: 330, MAREN: 190, VESK: 105, CROWD: 240 };
    const f = (base[speaker] ?? 200) * (0.85 + Math.random() * 0.35);
    const out = this.sfxOut(0.05);
    const t = this.now();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 4;
    bp.Q.value = 1.5;
    bp.connect(out);
    this.blip(t, f, 0.07, 0.07, bp, 'square', 1.1);
  }

  // ---------------------------------------------------------------- ambience beds
  private startAmbienceBeds(): void {
    const ctx = this.ctx!;
    const mk = (key: AmbienceKey, type: BiquadFilterType, freq: number, q: number, lfoRate: number) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = 0;
      if (lfoRate > 0) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = lfoRate;
        const lg = ctx.createGain();
        lg.gain.value = freq * 0.5;
        lfo.connect(lg).connect(f.frequency);
        lfo.start();
      }
      src.connect(f).connect(g).connect(this.ambBus);
      src.start();
      this.amb.set(key, { gain: g, target: 0 });
    };
    mk('wind', 'bandpass', 500, 0.7, 0.13);
    mk('fire', 'highpass', 2500, 0.5, 7.5);
    mk('crowd', 'bandpass', 900, 0.9, 0.6);
    mk('rumble', 'lowpass', 90, 1, 0.07);
    mk('machine', 'bandpass', 140, 6, 0.5);
    mk('rail', 'bandpass', 1300, 2, 9);
  }

  setAmbience(key: AmbienceKey, level: number): void {
    this.pendingAmb[key] = level;
    const a = this.amb.get(key);
    if (!a || !this.ctx) return;
    const scale: Record<AmbienceKey, number> = { wind: 0.22, fire: 0.08, crowd: 0.12, rumble: 0.4, machine: 0.2, rail: 0.06 };
    a.target = level;
    a.gain.gain.setTargetAtTime(level * scale[key], this.ctx.currentTime, 0.6);
  }

  clearAmbience(): void {
    for (const k of ['wind', 'fire', 'crowd', 'rumble', 'machine', 'rail'] as AmbienceKey[]) this.setAmbience(k, 0);
  }

  dispose(): void {
    clearInterval(this.schedTimer);
    void this.ctx?.close();
    this.ctx = null;
  }
}
