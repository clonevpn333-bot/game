/* All sound is synthesised — wind that thickens with altitude, footsteps, the
 * horn, impacts, fire. No audio files ship with the game. */
export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.master = null;
  }

  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);

    // wind: filtered noise, two layers
    this.noise = this.makeNoise();
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 420;
    this.windFilter.Q.value = 0.6;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0.0;
    this.noise.connect(this.windFilter).connect(this.windGain).connect(this.master);

    this.gustLfo = this.ctx.createOscillator();
    this.gustLfo.frequency.value = 0.11;
    this.gustGain = this.ctx.createGain();
    this.gustGain.gain.value = 260;
    this.gustLfo.connect(this.gustGain).connect(this.windFilter.frequency);
    this.gustLfo.start();
  }

  makeNoise() {
    const len = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.2;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start();
    return src;
  }

  /** @param altitude metres, @param speed m/s, @param falling boolean */
  setAmbience(altitude, speed, falling) {
    if (!this.ctx) return;
    const alt = Math.min(1, Math.max(0, altitude / 1400));
    const target = 0.035 + alt * 0.16 + (falling ? 0.42 : 0) + Math.min(0.06, speed * 0.006);
    this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.35);
    this.windFilter.Q.value = 0.5 + alt * 1.4;
  }

  tone({ freq = 440, dur = 0.2, type = 'sine', gain = 0.2, sweep = 0, delay = 0, attack = 0.005 }) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + sweep), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  burst({ dur = 0.18, gain = 0.25, freq = 900, type = 'lowpass' }) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  step(hard) { this.burst({ dur: 0.09, gain: hard ? 0.16 : 0.09, freq: hard ? 1400 : 700 }); }
  grip() { this.burst({ dur: 0.12, gain: 0.10, freq: 2200, type: 'highpass' }); }
  land(speed) {
    this.burst({ dur: 0.24, gain: Math.min(0.5, 0.08 + speed * 0.012), freq: 320 });
    if (speed > 12) this.tone({ freq: 90, dur: 0.5, type: 'sine', gain: 0.28, sweep: -50 });
  }
  hurt() { this.tone({ freq: 220, dur: 0.35, type: 'sawtooth', gain: 0.14, sweep: -120 }); }
  pickup() { this.tone({ freq: 620, dur: 0.14, type: 'triangle', gain: 0.14, sweep: 240 }); }
  ping() { this.tone({ freq: 1180, dur: 0.24, type: 'sine', gain: 0.12, sweep: -180 }); }
  horn() {
    for (const [i, f] of [196, 262, 392].entries()) {
      this.tone({ freq: f, dur: 1.5, type: 'sawtooth', gain: 0.13, delay: i * 0.02, attack: 0.06 });
    }
  }
  chute() { this.burst({ dur: 0.7, gain: 0.4, freq: 500 }); }
  fireLit() { this.burst({ dur: 0.9, gain: 0.3, freq: 900 }); this.tone({ freq: 320, dur: 0.6, type: 'triangle', gain: 0.1, sweep: 120 }); }
  heli() { this.tone({ freq: 62, dur: 1.4, type: 'square', gain: 0.06 }); }
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: 0.5, type: 'triangle', gain: 0.14, delay: i * 0.13 })); }
  death() { [330, 262, 196, 147].forEach((f, i) => this.tone({ freq: f, dur: 0.6, type: 'sine', gain: 0.13, delay: i * 0.16 })); }
  setVolume(v) { if (this.master) this.master.gain.value = v; }
}
