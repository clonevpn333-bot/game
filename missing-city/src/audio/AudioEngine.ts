import * as THREE from 'three';
import type { Surface } from '../core/Physics';

export interface LoopHandle {
  gain: GainNode;
  setVolume(v: number, time?: number): void;
  setPos(p: THREE.Vector3): void;
  stop(fade?: number): void;
  alive: boolean;
  extra?: Record<string, AudioParam | AudioNode>;
}

type Bus = 'sfx' | 'amb' | 'music' | 'ui' | 'voice';

const NOTE = (n: string): number => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(n);
  if (!m) return 440;
  const idx: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  let semi = idx[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semi / 12);
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private comp!: DynamicsCompressorNode;
  private buses = {} as Record<Bus, GainNode>;
  private reverbIn!: GainNode;
  private convA!: ConvolverNode;
  private convB!: ConvolverNode;
  private convGainA!: GainNode;
  private convGainB!: GainNode;
  private useA = true;
  private noise = {} as Record<'white' | 'pink' | 'brown' | 'drops', AudioBuffer>;
  private steps = {} as Record<Surface, AudioBuffer[]>;
  private shot!: AudioBuffer;
  private rainLoop: LoopHandle | null = null;
  private rainFilter!: BiquadFilterNode;
  private worldMuffle!: BiquadFilterNode;
  private loops = new Set<LoopHandle>();
  private schedulers = new Set<number>();
  volumes = { master: 0.9, music: 0.7, sfx: 0.9, amb: 0.9, voice: 0.9 };
  private duck = 1;
  started = false;

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -16;
    this.comp.ratio.value = 3.5;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this.volumes.master;
    this.worldMuffle = ctx.createBiquadFilter();
    this.worldMuffle.type = 'lowpass';
    this.worldMuffle.frequency.value = 20000;
    this.worldMuffle.connect(this.master);
    this.master.connect(this.comp).connect(ctx.destination);
    for (const b of ['sfx', 'amb', 'music', 'ui', 'voice'] as Bus[]) {
      const g = ctx.createGain();
      g.gain.value = b === 'music' ? this.volumes.music : b === 'amb' ? this.volumes.amb : b === 'voice' ? this.volumes.voice : this.volumes.sfx;
      g.connect(b === 'music' || b === 'ui' ? this.master : this.worldMuffle);
      this.buses[b] = g;
    }
    this.reverbIn = ctx.createGain();
    this.convA = ctx.createConvolver();
    this.convB = ctx.createConvolver();
    this.convGainA = ctx.createGain();
    this.convGainB = ctx.createGain();
    this.convGainB.gain.value = 0;
    this.reverbIn.connect(this.convA).connect(this.convGainA).connect(this.worldMuffle);
    this.reverbIn.connect(this.convB).connect(this.convGainB).connect(this.worldMuffle);
    this.convA.buffer = this.makeImpulse(1.8, 2.5);
    this.buildBuffers();
    this.started = true;
  }

  setVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.buses.music.gain.setTargetAtTime(this.volumes.music, t, 0.05);
    this.buses.sfx.gain.setTargetAtTime(this.volumes.sfx * this.duck, t, 0.05);
    this.buses.amb.gain.setTargetAtTime(this.volumes.amb * this.duck, t, 0.05);
    this.buses.voice.gain.setTargetAtTime(this.volumes.voice, t, 0.05);
  }

  /** Pause/menu: muffle the world. */
  setMuffle(amount: number): void {
    if (!this.ctx) return;
    const f = amount > 0 ? THREE.MathUtils.lerp(20000, 500, amount) : 20000;
    this.worldMuffle.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.08);
  }

  setDuck(v: number): void {
    this.duck = v;
    this.setVolumes();
  }

  /** Swap the room reverb with a crossfade. */
  setReverb(seconds: number, wet = 0.35, decay = 2.5): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const buf = this.makeImpulse(seconds, decay);
    this.useA = !this.useA;
    const [conv, gIn, gOut] = this.useA ? [this.convA, this.convGainA, this.convGainB] : [this.convB, this.convGainB, this.convGainA];
    conv.buffer = buf;
    gIn.gain.setTargetAtTime(1, t, 0.4);
    gOut.gain.setTargetAtTime(0, t, 0.4);
    this.reverbIn.gain.setTargetAtTime(wet, t, 0.3);
  }

  updateListener(cam: THREE.Camera): void {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const p = new THREE.Vector3();
    const f = new THREE.Vector3();
    const u = new THREE.Vector3();
    cam.getWorldPosition(p);
    cam.getWorldDirection(f);
    u.set(0, 1, 0).applyQuaternion(cam.getWorldQuaternion(new THREE.Quaternion()));
    const t = this.ctx.currentTime;
    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, t, 0.02);
      l.positionY.setTargetAtTime(p.y, t, 0.02);
      l.positionZ.setTargetAtTime(p.z, t, 0.02);
      l.forwardX.setTargetAtTime(f.x, t, 0.02);
      l.forwardY.setTargetAtTime(f.y, t, 0.02);
      l.forwardZ.setTargetAtTime(f.z, t, 0.02);
      l.upX.setTargetAtTime(u.x, t, 0.02);
      l.upY.setTargetAtTime(u.y, t, 0.02);
      l.upZ.setTargetAtTime(u.z, t, 0.02);
    } else {
      (l as unknown as { setPosition: (x: number, y: number, z: number) => void }).setPosition(p.x, p.y, p.z);
    }
  }

  // ---------------------------------------------------------------- buffers
  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // early reflections cluster + diffuse tail
        const er = i < ctx.sampleRate * 0.08 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.9 : 0;
        d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - t, decay) + er) * 0.6;
      }
    }
    return buf;
  }

  private buildBuffers(): void {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const mk = (secs: number, ch = 1) => ctx.createBuffer(ch, Math.floor(sr * secs), sr);
    // noises
    const white = mk(4);
    const pink = mk(4);
    const brown = mk(4);
    const w = white.getChannelData(0);
    const p = pink.getChannelData(0);
    const br = brown.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < w.length; i++) {
      const x = Math.random() * 2 - 1;
      w[i] = x;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852;
      b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11;
      b6 = x * 0.115926;
      last = (last + 0.02 * x) / 1.02;
      br[i] = last * 3.5;
    }
    // sparse drop clicks (rain on surfaces, gutters)
    const drops = mk(6, 2);
    for (let c = 0; c < 2; c++) {
      const d = drops.getChannelData(c);
      for (let k = 0; k < 900; k++) {
        const at = Math.floor(Math.random() * (d.length - 800));
        const amp = Math.random() ** 2 * 0.5;
        const f = 0.15 + Math.random() * 0.4;
        for (let i = 0; i < 600; i++) d[at + i] += Math.sin(i * f) * amp * Math.exp(-i / 60);
      }
    }
    this.noise = { white, pink, brown, drops };

    // footsteps
    const surfaces: Surface[] = ['concrete', 'wet', 'tile', 'wood', 'metal', 'carpet', 'dirt', 'glass'];
    for (const s of surfaces) {
      this.steps[s] = [];
      for (let v = 0; v < 4; v++) {
        const len = s === 'wet' ? 0.22 : s === 'metal' ? 0.3 : 0.14;
        const b = mk(len);
        const d = b.getChannelData(0);
        let lp = 0;
        let lp2 = 0;
        for (let i = 0; i < d.length; i++) {
          const t = i / sr;
          const n = Math.random() * 2 - 1;
          const cut = s === 'carpet' ? 0.05 : s === 'wood' ? 0.12 : s === 'tile' ? 0.6 : s === 'dirt' ? 0.35 : 0.25;
          lp += (n - lp) * cut;
          lp2 += (lp - lp2) * 0.5;
          const heel = Math.exp(-t * (s === 'carpet' ? 60 : 90));
          const toe = t > 0.035 ? Math.exp(-(t - 0.035) * 110) * 0.7 : 0;
          let x = (s === 'tile' || s === 'glass' ? n * 0.6 + lp : lp2) * (heel + toe);
          x += Math.sin(t * 2 * Math.PI * (70 + v * 8)) * Math.exp(-t * 50) * (s === 'wood' ? 0.9 : 0.45);
          if (s === 'wet') x += (Math.random() * 2 - 1) * 0.25 * Math.exp(-Math.abs(t - 0.05) * 40) ;
          if (s === 'metal') x += (Math.sin(t * 2 * Math.PI * 610) + 0.6 * Math.sin(t * 2 * Math.PI * 1380)) * Math.exp(-t * 18) * 0.25;
          if (s === 'glass') x += Math.sin(t * 2 * Math.PI * (2400 + Math.random() * 900)) * Math.exp(-t * 60) * 0.2;
          d[i] = x * 0.8;
        }
        this.steps[s].push(b);
      }
    }

    // gunshot
    this.shot = mk(0.9);
    const sd = this.shot.getChannelData(0);
    let slp = 0;
    for (let i = 0; i < sd.length; i++) {
      const t = i / sr;
      const n = Math.random() * 2 - 1;
      slp += (n - slp) * (0.9 - Math.min(0.85, t * 3));
      const crack = t < 0.004 ? n : 0;
      sd[i] = Math.tanh((crack * 1.2 + slp * Math.exp(-t * 14) * 1.4 + Math.sin(2 * Math.PI * (55 - t * 30) * t) * Math.exp(-t * 9) * 1.3) * 1.6) * 0.9;
    }
  }

  // ---------------------------------------------------------------- helpers
  private out(bus: Bus, pos?: THREE.Vector3, refDist = 2, reverb = 0.3): AudioNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    if (pos) {
      const pan = ctx.createPanner();
      pan.panningModel = 'equalpower';
      pan.distanceModel = 'inverse';
      pan.refDistance = refDist;
      pan.maxDistance = 200;
      pan.rolloffFactor = 1.1;
      if (pan.positionX) {
        pan.positionX.value = pos.x;
        pan.positionY.value = pos.y;
        pan.positionZ.value = pos.z;
      } else {
        (pan as unknown as { setPosition: (x: number, y: number, z: number) => void }).setPosition(pos.x, pos.y, pos.z);
      }
      g.connect(pan);
      pan.connect(this.buses[bus]);
      if (reverb > 0) {
        const s = ctx.createGain();
        s.gain.value = reverb;
        pan.connect(s).connect(this.reverbIn);
      }
    } else {
      g.connect(this.buses[bus]);
      if (reverb > 0) {
        const s = ctx.createGain();
        s.gain.value = reverb;
        g.connect(s).connect(this.reverbIn);
      }
    }
    return g;
  }

  private noiseSrc(kind: 'white' | 'pink' | 'brown' | 'drops', loop = true): AudioBufferSourceNode {
    const s = this.ctx!.createBufferSource();
    s.buffer = this.noise[kind];
    s.loop = loop;
    if (loop) s.loopStart = Math.random() * 2;
    return s;
  }

  private makeLoop(gain: GainNode, nodes: AudioScheduledSourceNode[], panner?: PannerNode, cleanup?: () => void): LoopHandle {
    const ctx = this.ctx!;
    const h: LoopHandle = {
      gain,
      alive: true,
      setVolume: (v, time = 0.3) => gain.gain.setTargetAtTime(v, ctx.currentTime, time / 3),
      setPos: (p) => {
        if (!panner) return;
        if (panner.positionX) {
          panner.positionX.setTargetAtTime(p.x, ctx.currentTime, 0.03);
          panner.positionY.setTargetAtTime(p.y, ctx.currentTime, 0.03);
          panner.positionZ.setTargetAtTime(p.z, ctx.currentTime, 0.03);
        }
      },
      stop: (fade = 0.5) => {
        if (!h.alive) return;
        h.alive = false;
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + fade);
        for (const n of nodes) {
          try {
            n.stop(t + fade + 0.05);
          } catch {
            /* already stopped */
          }
        }
        cleanup?.();
        this.loops.delete(h);
      },
    };
    this.loops.add(h);
    return h;
  }

  private spatialGain(bus: Bus, pos?: THREE.Vector3, ref = 2, reverb = 0.25): { g: GainNode; pan?: PannerNode } {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    if (!pos) {
      g.connect(this.buses[bus]);
      if (reverb) {
        const s = ctx.createGain();
        s.gain.value = reverb;
        g.connect(s).connect(this.reverbIn);
      }
      return { g };
    }
    const pan = ctx.createPanner();
    pan.panningModel = 'equalpower';
    pan.distanceModel = 'inverse';
    pan.refDistance = ref;
    pan.rolloffFactor = 1.2;
    pan.maxDistance = 300;
    if (pan.positionX) {
      pan.positionX.value = pos.x;
      pan.positionY.value = pos.y;
      pan.positionZ.value = pos.z;
    }
    g.connect(pan).connect(this.buses[bus]);
    if (reverb) {
      const s = ctx.createGain();
      s.gain.value = reverb;
      pan.connect(s).connect(this.reverbIn);
    }
    return { g, pan };
  }

  stopAllLoops(fade = 1): void {
    for (const l of [...this.loops]) l.stop(fade);
    for (const id of this.schedulers) clearInterval(id);
    this.schedulers.clear();
    this.rainLoop = null;
  }

  // ---------------------------------------------------------------- ambience
  /** Rain bed: hiss + body + drops. intensity 0..1, indoor muffles. */
  setRain(intensity: number, indoor = false): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (!this.rainLoop && intensity > 0) {
      const g = ctx.createGain();
      g.gain.value = 0;
      this.rainFilter = ctx.createBiquadFilter();
      this.rainFilter.type = 'lowpass';
      this.rainFilter.frequency.value = 9000;
      g.connect(this.rainFilter).connect(this.buses.amb);
      const hiss = this.noiseSrc('pink');
      const hf = ctx.createBiquadFilter();
      hf.type = 'bandpass';
      hf.frequency.value = 2600;
      hf.Q.value = 0.4;
      const hg = ctx.createGain();
      hg.gain.value = 0.55;
      hiss.connect(hf).connect(hg).connect(g);
      const body = this.noiseSrc('brown');
      const bf = ctx.createBiquadFilter();
      bf.type = 'lowpass';
      bf.frequency.value = 500;
      const bg = ctx.createGain();
      bg.gain.value = 0.4;
      body.connect(bf).connect(bg).connect(g);
      const drops = this.noiseSrc('drops');
      const dg = ctx.createGain();
      dg.gain.value = 0.5;
      drops.connect(dg).connect(g);
      hiss.start();
      body.start();
      drops.start();
      this.rainLoop = this.makeLoop(g, [hiss, body, drops]);
    }
    if (!this.rainLoop) return;
    this.rainLoop.setVolume(intensity * (indoor ? 0.35 : 0.8), 1.2);
    this.rainFilter.frequency.setTargetAtTime(indoor ? 700 : 9000, ctx.currentTime, 0.4);
  }

  wind(vol = 0.3): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g } = this.spatialGain('amb', undefined, 2, 0);
    g.gain.value = 0;
    const src = this.noiseSrc('brown');
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 400;
    f.Q.value = 0.8;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 250;
    lfo.connect(lg).connect(f.frequency);
    src.connect(f).connect(g);
    src.start();
    lfo.start();
    g.gain.setTargetAtTime(vol, ctx.currentTime, 1);
    return this.makeLoop(g, [src, lfo]);
  }

  /** Mains hum from a fridge / transformer / neon sign. */
  hum(pos: THREE.Vector3, vol = 0.08, base = 60, buzz = 0): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g, pan } = this.spatialGain('amb', pos, 1.5, 0.1);
    g.gain.value = 0;
    const nodes: AudioScheduledSourceNode[] = [];
    for (const [m, a] of [[1, 1], [2, 0.6], [3, 0.25], [5, 0.1]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = base * m + Math.random() * 0.4;
      const og = ctx.createGain();
      og.gain.value = a * 0.3;
      o.connect(og).connect(g);
      o.start();
      nodes.push(o);
    }
    if (buzz > 0) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = base * 2;
      const bf = ctx.createBiquadFilter();
      bf.type = 'bandpass';
      bf.frequency.value = 3200;
      bf.Q.value = 2;
      const bg = ctx.createGain();
      bg.gain.value = buzz;
      o.connect(bf).connect(bg).connect(g);
      o.start();
      nodes.push(o);
    }
    g.gain.setTargetAtTime(vol, ctx.currentTime, 0.5);
    return this.makeLoop(g, nodes, pan);
  }

  /** Classic US phone ring cadence (2s on, 4s off) from a position. */
  phoneRing(pos: THREE.Vector3, vol = 0.35, cell = false): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g, pan } = this.spatialGain('sfx', pos, 2.5, 0.3);
    g.gain.value = vol;
    const gate = ctx.createGain();
    gate.gain.value = 0;
    gate.connect(g);
    const nodes: AudioScheduledSourceNode[] = [];
    const freqs = cell ? [1318, 1568] : [440, 480];
    for (const f of freqs) {
      const o = ctx.createOscillator();
      o.type = cell ? 'square' : 'sine';
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = cell ? 0.08 : 0.4;
      o.connect(og).connect(gate);
      o.start();
      nodes.push(o);
    }
    // amplitude bell-like warble
    const am = ctx.createOscillator();
    am.frequency.value = 20;
    const amg = ctx.createGain();
    amg.gain.value = 0.3;
    am.connect(amg).connect(gate.gain);
    am.start();
    nodes.push(am);
    const sched = () => {
      const t = ctx.currentTime + 0.05;
      if (cell) {
        for (let i = 0; i < 6; i++) {
          gate.gain.setValueAtTime(0.7, t + i * 0.25);
          gate.gain.setValueAtTime(0, t + i * 0.25 + 0.15);
        }
      } else {
        gate.gain.setValueAtTime(0.7, t);
        gate.gain.setValueAtTime(0, t + 2);
      }
    };
    sched();
    const id = window.setInterval(sched, cell ? 3000 : 6000);
    this.schedulers.add(id);
    return this.makeLoop(g, nodes, pan, () => {
      clearInterval(id);
      this.schedulers.delete(id);
    });
  }

  /** Pedestrian crossing chirp. */
  crossingChirp(pos: THREE.Vector3, vol = 0.12): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g, pan } = this.spatialGain('amb', pos, 3, 0.4);
    g.gain.value = vol;
    const o = ctx.createOscillator();
    o.frequency.value = 2800;
    const gate = ctx.createGain();
    gate.gain.value = 0;
    o.connect(gate).connect(g);
    o.start();
    const sched = () => {
      const t = ctx.currentTime + 0.05;
      for (let i = 0; i < 4; i++) {
        const s = t + i * 1.0;
        gate.gain.setValueAtTime(0.0001, s);
        gate.gain.exponentialRampToValueAtTime(0.6, s + 0.005);
        gate.gain.exponentialRampToValueAtTime(0.0001, s + 0.06);
        o.frequency.setValueAtTime(2900, s);
        o.frequency.exponentialRampToValueAtTime(1900, s + 0.06);
      }
    };
    sched();
    const id = window.setInterval(sched, 4000);
    this.schedulers.add(id);
    return this.makeLoop(g, [o], pan, () => {
      clearInterval(id);
      this.schedulers.delete(id);
    });
  }

  /** Lo-fi store muzak from a ceiling speaker. */
  muzak(pos: THREE.Vector3, vol = 0.12): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g, pan } = this.spatialGain('amb', pos, 3, 0.15);
    g.gain.value = vol;
    const speaker = ctx.createBiquadFilter();
    speaker.type = 'bandpass';
    speaker.frequency.value = 1100;
    speaker.Q.value = 0.5;
    speaker.connect(g);
    const chords = [
      ['F3', 'A3', 'C4', 'E4'], ['E3', 'G3', 'B3', 'D4'], ['D3', 'F3', 'A3', 'C4'], ['G3', 'B3', 'D4', 'F4'],
      ['C3', 'E3', 'G3', 'B3'], ['A2', 'C3', 'E3', 'G3'], ['D3', 'F3', 'A3', 'C4'], ['G2', 'B2', 'D3', 'F3'],
    ];
    const melody = ['A4', 'G4', 'E4', 'F4', 'D4', 'E4', 'C4', 'B3', 'C4', 'E4', 'G4', 'A4', 'F4', 'D4', 'B3', 'G3'];
    let bar = 0;
    const beat = 0.72;
    const sched = () => {
      const t0 = ctx.currentTime + 0.1;
      const ch = chords[bar % chords.length];
      for (const n of ch) this.epiano(NOTE(n), t0, beat * 3.6, 0.06, speaker);
      this.epiano(NOTE(ch[0]) / 2, t0, beat * 1.8, 0.09, speaker);
      this.epiano(NOTE(ch[2]) / 2, t0 + beat * 2, beat * 1.8, 0.07, speaker);
      this.epiano(NOTE(melody[(bar * 2) % melody.length]), t0 + beat, beat * 1.5, 0.05, speaker);
      this.epiano(NOTE(melody[(bar * 2 + 1) % melody.length]), t0 + beat * 2.5, beat * 1.3, 0.05, speaker);
      bar++;
    };
    sched();
    const id = window.setInterval(sched, beat * 4 * 1000);
    this.schedulers.add(id);
    const dummy = ctx.createOscillator();
    dummy.frequency.value = 0;
    dummy.start();
    return this.makeLoop(g, [dummy], pan, () => {
      clearInterval(id);
      this.schedulers.delete(id);
    });
  }

  private epiano(freq: number, t: number, dur: number, vol: number, dest: AudioNode): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = freq * 2.001;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(vol * 0.3, t + dur * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const g2 = ctx.createGain();
    g2.gain.value = 0.25;
    o.connect(g).connect(dest);
    o2.connect(g2).connect(g);
    o.start(t);
    o2.start(t);
    o.stop(t + dur + 0.05);
    o2.stop(t + dur + 0.05);
  }

  /** Emergency Alert System attention tone + broadcast drone from a TV. */
  emergencyBroadcast(pos: THREE.Vector3, vol = 0.18): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g, pan } = this.spatialGain('sfx', pos, 2, 0.2);
    g.gain.value = vol;
    const tv = ctx.createBiquadFilter();
    tv.type = 'bandpass';
    tv.frequency.value = 1400;
    tv.Q.value = 0.6;
    tv.connect(g);
    const toneGate = ctx.createGain();
    toneGate.gain.value = 0;
    toneGate.connect(tv);
    const nodes: AudioScheduledSourceNode[] = [];
    for (const f of [853, 960]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = 0.35;
      o.connect(og).connect(toneGate);
      o.start();
      nodes.push(o);
    }
    const st = this.noiseSrc('white');
    const sg = ctx.createGain();
    sg.gain.value = 0.04;
    st.connect(sg).connect(tv);
    st.start();
    nodes.push(st);
    const sched = () => {
      const t = ctx.currentTime + 0.05;
      // data burst chirps
      for (let i = 0; i < 9; i++) {
        toneGate.gain.setValueAtTime(i % 2 ? 0 : 0.5, t + i * 0.09);
      }
      toneGate.gain.setValueAtTime(0, t + 0.9);
      toneGate.gain.setValueAtTime(0.9, t + 1.4);
      toneGate.gain.setValueAtTime(0, t + 6.4);
    };
    sched();
    const id = window.setInterval(sched, 16000);
    this.schedulers.add(id);
    return this.makeLoop(g, nodes, pan, () => {
      clearInterval(id);
      this.schedulers.delete(id);
    });
  }

  /** Low continuous rumble / drone used for tension and deep spaces. */
  drone(vol = 0.2, base = 41, dissonance = 0.0, bus: Bus = 'amb'): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g } = this.spatialGain(bus, undefined, 2, 0.2);
    g.gain.value = 0;
    const nodes: AudioScheduledSourceNode[] = [];
    const ratios = [1, 1.5, 2.0, 2.0 + dissonance * 0.12, 3.01];
    for (const r of ratios) {
      const o = ctx.createOscillator();
      o.type = r > 2.5 ? 'triangle' : 'sine';
      o.frequency.value = base * r * (1 + (Math.random() - 0.5) * 0.004);
      const og = ctx.createGain();
      og.gain.value = 0.22 / r;
      o.connect(og).connect(g);
      o.start();
      nodes.push(o);
    }
    const n = this.noiseSrc('brown');
    const nf = ctx.createBiquadFilter();
    nf.type = 'lowpass';
    nf.frequency.value = 120;
    const ng = ctx.createGain();
    ng.gain.value = 0.35;
    n.connect(nf).connect(ng).connect(g);
    n.start();
    nodes.push(n);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.05;
    const lg = ctx.createGain();
    lg.gain.value = 60;
    lfo.connect(lg).connect(nf.frequency);
    lfo.start();
    nodes.push(lfo);
    g.gain.setTargetAtTime(vol, ctx.currentTime, 1.5);
    return this.makeLoop(g, nodes);
  }

  /** Crowd murmur heard through an Echo. */
  crowdMurmur(vol = 0.15): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g } = this.spatialGain('amb', undefined, 2, 0.5);
    g.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    lp.connect(g);
    const nodes: AudioScheduledSourceNode[] = [];
    for (let i = 0; i < 5; i++) {
      const src = this.noiseSrc('pink');
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.Q.value = 6;
      f1.frequency.value = 500 + i * 180;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 2.5 + Math.random() * 3;
      const lg = ctx.createGain();
      lg.gain.value = 250 + Math.random() * 200;
      lfo.connect(lg).connect(f1.frequency);
      const am = ctx.createOscillator();
      am.frequency.value = 3 + Math.random() * 4;
      const amg = ctx.createGain();
      amg.gain.value = 0.5;
      const vg = ctx.createGain();
      vg.gain.value = 0.5;
      am.connect(amg).connect(vg.gain);
      src.connect(f1).connect(vg).connect(lp);
      src.start();
      lfo.start();
      am.start();
      nodes.push(src, lfo, am);
    }
    g.gain.setTargetAtTime(vol, ctx.currentTime, 0.4);
    return this.makeLoop(g, nodes);
  }

  /** Helicopter cabin: rotor thump + turbine whine. */
  helicopter(vol = 0.5, interior = true): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g } = this.spatialGain('amb', undefined, 2, 0.05);
    g.gain.value = 0;
    const nodes: AudioScheduledSourceNode[] = [];
    const n = this.noiseSrc('brown');
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = interior ? 260 : 600;
    const thump = ctx.createGain();
    thump.gain.value = 0.2;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 5.6;
    const lg = ctx.createGain();
    lg.gain.value = 0.8;
    lfo.connect(lg).connect(thump.gain);
    n.connect(lp).connect(thump).connect(g);
    const t = ctx.createOscillator();
    t.type = 'sawtooth';
    t.frequency.value = 1150;
    const tf = ctx.createBiquadFilter();
    tf.type = 'bandpass';
    tf.frequency.value = 1150;
    tf.Q.value = 8;
    const tg = ctx.createGain();
    tg.gain.value = 0.05;
    t.connect(tf).connect(tg).connect(g);
    const h = this.noiseSrc('pink');
    const hf = ctx.createBiquadFilter();
    hf.type = 'highpass';
    hf.frequency.value = 3000;
    const hg = ctx.createGain();
    hg.gain.value = interior ? 0.05 : 0.12;
    h.connect(hf).connect(hg).connect(g);
    for (const s of [n, lfo, t, h]) {
      s.start();
      nodes.push(s);
    }
    g.gain.setTargetAtTime(vol, ctx.currentTime, 0.8);
    return this.makeLoop(g, nodes, undefined, undefined);
  }

  /** Subway tunnel wind with slow movement. */
  tunnelWind(vol = 0.25): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const { g } = this.spatialGain('amb', undefined, 2, 0.4);
    g.gain.value = 0;
    const n = this.noiseSrc('pink');
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 220;
    f.Q.value = 1.4;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.03;
    const lg = ctx.createGain();
    lg.gain.value = 140;
    lfo.connect(lg).connect(f.frequency);
    n.connect(f).connect(g);
    n.start();
    lfo.start();
    g.gain.setTargetAtTime(vol, ctx.currentTime, 1);
    return this.makeLoop(g, [n, lfo]);
  }

  // ---------------------------------------------------------------- one-shots
  footstep(surface: Surface, intensity: number, pos?: THREE.Vector3): void {
    if (!this.ctx) return;
    const set = this.steps[surface] ?? this.steps.concrete;
    const src = this.ctx.createBufferSource();
    src.buffer = set[Math.floor(Math.random() * set.length)];
    src.playbackRate.value = 0.88 + Math.random() * 0.24;
    const g = this.out('sfx', pos, 1.5, 0.35);
    (g as GainNode).gain.value = 0.25 * intensity;
    src.connect(g);
    src.start();
  }

  gunshot(pos?: THREE.Vector3, vol = 1): void {
    if (!this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.shot;
    src.playbackRate.value = 0.95 + Math.random() * 0.1;
    const g = this.out('sfx', pos, 4, 0.9) as GainNode;
    g.gain.value = 0.7 * vol;
    src.connect(g);
    src.start();
  }

  click(kind: 'dry' | 'reload' | 'slide' | 'ui' | 'switch' | 'key' = 'ui', pos?: THREE.Vector3): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const g = this.out(kind === 'ui' ? 'ui' : 'sfx', pos, 1, kind === 'ui' ? 0 : 0.2) as GainNode;
    const parts = kind === 'reload' ? [0, 0.18, 0.45] : kind === 'slide' ? [0, 0.08] : [0];
    for (const off of parts) {
      const o = ctx.createOscillator();
      o.type = kind === 'ui' ? 'sine' : 'square';
      o.frequency.setValueAtTime(kind === 'ui' ? 1500 : kind === 'key' ? 900 : 2400, t + off);
      o.frequency.exponentialRampToValueAtTime(kind === 'ui' ? 900 : 300, t + off + 0.04);
      const eg = ctx.createGain();
      eg.gain.setValueAtTime(0, t + off);
      eg.gain.linearRampToValueAtTime(kind === 'ui' ? 0.12 : 0.18, t + off + 0.002);
      eg.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.05);
      o.connect(eg).connect(g);
      o.start(t + off);
      o.stop(t + off + 0.06);
    }
  }

  /** DTMF keypad tone for a digit. */
  dtmf(d: string, pos?: THREE.Vector3): void {
    if (!this.ctx) return;
    const rows = [697, 770, 852, 941];
    const cols = [1209, 1336, 1477];
    const keys = '123456789*0#';
    const i = Math.max(0, keys.indexOf(d));
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const g = this.out('sfx', pos, 1, 0.1) as GainNode;
    for (const f of [rows[Math.floor(i / 3)], cols[i % 3]]) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const eg = ctx.createGain();
      eg.gain.setValueAtTime(0.08, t);
      eg.gain.setValueAtTime(0.0001, t + 0.12);
      o.connect(eg).connect(g);
      o.start(t);
      o.stop(t + 0.14);
    }
  }

  /** Short pleasant/denied chime. */
  chime(ok: boolean, pos?: THREE.Vector3): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const g = this.out('sfx', pos, 1.5, 0.2) as GainNode;
    const notes = ok ? [880, 1318] : [330, 311];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = ok ? 'sine' : 'square';
      o.frequency.value = f;
      const eg = ctx.createGain();
      eg.gain.setValueAtTime(0, t + i * 0.12);
      eg.gain.linearRampToValueAtTime(ok ? 0.12 : 0.05, t + i * 0.12 + 0.01);
      eg.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.35);
      o.connect(eg).connect(g);
      o.start(t + i * 0.12);
      o.stop(t + i * 0.12 + 0.4);
    });
  }

  /** Noise-based one-shot with envelope + filter. */
  private burst(opts: {
    pos?: THREE.Vector3; dur: number; vol: number; type?: BiquadFilterType; freq: number; freqEnd?: number; q?: number;
    attack?: number; noise?: 'white' | 'pink' | 'brown'; reverb?: number; bus?: Bus; ref?: number; reverse?: boolean;
  }): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = this.noiseSrc(opts.noise ?? 'white', false);
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'lowpass';
    f.frequency.setValueAtTime(opts.freq, t);
    if (opts.freqEnd) f.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + opts.dur);
    f.Q.value = opts.q ?? 0.7;
    const eg = ctx.createGain();
    const a = opts.attack ?? 0.005;
    if (opts.reverse) {
      eg.gain.setValueAtTime(0.0001, t);
      eg.gain.exponentialRampToValueAtTime(opts.vol, t + opts.dur);
      eg.gain.linearRampToValueAtTime(0, t + opts.dur + 0.02);
    } else {
      eg.gain.setValueAtTime(0, t);
      eg.gain.linearRampToValueAtTime(opts.vol, t + a);
      eg.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    }
    const out = this.out(opts.bus ?? 'sfx', opts.pos, opts.ref ?? 2, opts.reverb ?? 0.3);
    src.connect(f).connect(eg).connect(out);
    src.start(t, Math.random() * 2);
    src.stop(t + opts.dur + 0.1);
  }

  private tone(opts: {
    pos?: THREE.Vector3; freq: number; freqEnd?: number; dur: number; vol: number; type?: OscillatorType;
    attack?: number; delay?: number; bus?: Bus; reverb?: number; dest?: AudioNode;
  }): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + (opts.delay ?? 0);
    const o = ctx.createOscillator();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(opts.freq, t);
    if (opts.freqEnd) o.frequency.exponentialRampToValueAtTime(opts.freqEnd, t + opts.dur);
    const eg = ctx.createGain();
    const a = opts.attack ?? 0.01;
    eg.gain.setValueAtTime(0, t);
    eg.gain.linearRampToValueAtTime(opts.vol, t + a);
    eg.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur);
    const out = opts.dest ?? this.out(opts.bus ?? 'sfx', opts.pos, 2, opts.reverb ?? 0.3);
    o.connect(eg).connect(out);
    o.start(t);
    o.stop(t + opts.dur + 0.05);
  }

  impact(kind: 'flesh' | 'concrete' | 'metal' | 'glass' | 'wood' | 'melee' | 'thud', pos?: THREE.Vector3, vol = 1): void {
    if (!this.ctx) return;
    switch (kind) {
      case 'flesh':
        this.burst({ pos, dur: 0.18, vol: 0.5 * vol, freq: 900, freqEnd: 200, noise: 'pink' });
        this.tone({ pos, freq: 120, freqEnd: 50, dur: 0.15, vol: 0.4 * vol });
        break;
      case 'concrete':
        this.burst({ pos, dur: 0.12, vol: 0.3 * vol, freq: 3000, freqEnd: 600, type: 'bandpass', q: 1 });
        break;
      case 'metal':
        this.tone({ pos, freq: 1800 + Math.random() * 800, dur: 0.4, vol: 0.12 * vol, type: 'triangle' });
        this.tone({ pos, freq: 3700, dur: 0.25, vol: 0.06 * vol });
        this.burst({ pos, dur: 0.06, vol: 0.2 * vol, freq: 5000, type: 'highpass' });
        break;
      case 'glass':
        for (let i = 0; i < 6; i++) this.tone({ pos, freq: 2500 + Math.random() * 3000, dur: 0.3 + Math.random() * 0.4, vol: 0.05 * vol, delay: Math.random() * 0.25 });
        this.burst({ pos, dur: 0.4, vol: 0.3 * vol, freq: 4000, type: 'highpass' });
        break;
      case 'wood':
        this.tone({ pos, freq: 220, freqEnd: 120, dur: 0.12, vol: 0.4 * vol, type: 'triangle' });
        this.burst({ pos, dur: 0.1, vol: 0.2 * vol, freq: 800 });
        break;
      case 'melee':
        this.burst({ pos, dur: 0.22, vol: 0.25 * vol, freq: 600, freqEnd: 3000, type: 'bandpass', q: 2, reverse: true });
        break;
      case 'thud':
        this.tone({ pos, freq: 90, freqEnd: 40, dur: 0.4, vol: 0.6 * vol });
        this.burst({ pos, dur: 0.3, vol: 0.3 * vol, freq: 400, noise: 'brown' });
        break;
    }
  }

  whoosh(pos?: THREE.Vector3, vol = 0.3): void {
    this.burst({ pos, dur: 0.3, vol, freq: 400, freqEnd: 2500, type: 'bandpass', q: 1.5, noise: 'pink', reverb: 0.1 });
  }

  door(kind: 'open' | 'close' | 'creak' | 'metal' | 'locked' | 'slide', pos?: THREE.Vector3): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    if (kind === 'creak') {
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(180, t);
      for (let i = 0; i < 12; i++) o.frequency.linearRampToValueAtTime(150 + Math.random() * 140, t + 0.1 + i * 0.1);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1200;
      f.Q.value = 6;
      const eg = ctx.createGain();
      eg.gain.setValueAtTime(0, t);
      eg.gain.linearRampToValueAtTime(0.08, t + 0.2);
      eg.gain.linearRampToValueAtTime(0, t + 1.3);
      o.connect(f).connect(eg).connect(this.out('sfx', pos, 2, 0.4));
      o.start(t);
      o.stop(t + 1.4);
    } else if (kind === 'locked') {
      this.impact('wood', pos, 0.6);
      this.tone({ pos, freq: 600, dur: 0.06, vol: 0.1, type: 'square', delay: 0.05 });
      this.tone({ pos, freq: 500, dur: 0.06, vol: 0.1, type: 'square', delay: 0.15 });
    } else if (kind === 'slide') {
      this.burst({ pos, dur: 0.8, vol: 0.12, freq: 1800, type: 'bandpass', q: 0.8, noise: 'pink', attack: 0.2 });
      this.tone({ pos, freq: 70, dur: 0.9, vol: 0.15, attack: 0.3 });
    } else if (kind === 'metal') {
      this.impact('metal', pos, 1);
      this.impact('thud', pos, 0.7);
    } else {
      this.impact(kind === 'close' ? 'thud' : 'wood', pos, kind === 'close' ? 0.8 : 0.5);
      if (kind === 'open') this.door('creak', pos);
    }
  }

  paper(): void {
    this.burst({ dur: 0.25, vol: 0.15, freq: 3500, type: 'bandpass', q: 0.6, bus: 'ui', reverb: 0 });
    this.burst({ dur: 0.18, vol: 0.1, freq: 6000, type: 'highpass', bus: 'ui', reverb: 0 });
  }

  pickup(): void {
    this.click('slide');
    this.tone({ freq: 1200, dur: 0.1, vol: 0.05, bus: 'ui', reverb: 0, delay: 0.05 });
  }

  /** Echo enter: reversed swell into a soft boom. */
  echoEnter(): void {
    if (!this.ctx) return;
    this.burst({ dur: 0.9, vol: 0.35, freq: 300, freqEnd: 6000, type: 'bandpass', q: 1.2, noise: 'pink', reverse: true, bus: 'ui', reverb: 0.8 });
    this.tone({ freq: 55, freqEnd: 32, dur: 2.2, vol: 0.5, delay: 0.85, bus: 'ui', reverb: 0.6 });
    this.tone({ freq: 880, freqEnd: 440, dur: 1.6, vol: 0.05, delay: 0.85, bus: 'ui', reverb: 1, type: 'triangle' });
  }

  echoExit(): void {
    if (!this.ctx) return;
    this.tone({ freq: 400, freqEnd: 40, dur: 0.4, vol: 0.3, bus: 'ui', reverb: 0.4, type: 'sawtooth' });
    this.burst({ dur: 0.12, vol: 0.4, freq: 2000, type: 'highpass', bus: 'ui', reverb: 0.5 });
  }

  echoWarn(): void {
    this.tone({ freq: 1760, dur: 0.12, vol: 0.05, bus: 'ui', reverb: 0.3, type: 'triangle' });
  }

  reversedSwell(vol = 0.3, dur = 2.5): void {
    this.burst({ dur, vol, freq: 200, freqEnd: 4000, type: 'bandpass', q: 0.9, noise: 'pink', reverse: true, bus: 'amb', reverb: 1 });
  }

  /** Whispering voices from a direction. */
  whisper(pos?: THREE.Vector3, vol = 0.12, dur = 1.8): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = this.noiseSrc('white', false);
    const out = this.out('amb', pos, 1.5, 0.8);
    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, t);
    const syll = Math.floor(dur * 4);
    for (let i = 0; i < syll; i++) {
      const s = t + (i / syll) * dur;
      eg.gain.linearRampToValueAtTime(vol * (0.4 + Math.random() * 0.6), s + 0.05);
      eg.gain.linearRampToValueAtTime(vol * 0.1, s + 0.2);
    }
    eg.gain.linearRampToValueAtTime(0, t + dur);
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.Q.value = 5;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.Q.value = 7;
    for (let i = 0; i < syll; i++) {
      const s = t + (i / syll) * dur;
      f1.frequency.setValueAtTime(500 + Math.random() * 600, s);
      f2.frequency.setValueAtTime(1500 + Math.random() * 1400, s);
    }
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    const mix = ctx.createGain();
    src.connect(f1).connect(mix);
    src.connect(f2).connect(mix);
    mix.connect(hp).connect(eg).connect(out);
    src.start(t, Math.random() * 2);
    src.stop(t + dur + 0.1);
  }

  /**
   * Formant "voice" — used for Remnant mimicry and distorted dialogue blips.
   * vowels: sequence of 'a' | 'e' | 'i' | 'o' | 'u'
   */
  voice(pos: THREE.Vector3 | undefined, opts: { pitch?: number; vowels?: string; dur?: number; vol?: number; distort?: number; stutter?: number; bus?: Bus }): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = opts.dur ?? 1.2;
    const pitch = opts.pitch ?? 180;
    const vowels = (opts.vowels ?? 'eaio').split('');
    const F: Record<string, [number, number, number]> = {
      a: [800, 1150, 2900], e: [400, 1600, 2700], i: [300, 2200, 3000], o: [450, 800, 2830], u: [325, 700, 2530],
    };
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(pitch, t);
    const vib = ctx.createOscillator();
    vib.frequency.value = 5.5;
    const vg = ctx.createGain();
    vg.gain.value = pitch * 0.03;
    vib.connect(vg).connect(o.frequency);
    o.frequency.linearRampToValueAtTime(pitch * (0.85 + Math.random() * 0.3), t + dur);
    const sum = ctx.createGain();
    const filters = [0, 1, 2].map((k) => {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = k === 0 ? 6 : 10;
      const fg = ctx.createGain();
      fg.gain.value = [1, 0.6, 0.25][k];
      o.connect(f).connect(fg).connect(sum);
      return f;
    });
    vowels.forEach((v, i) => {
      const s = t + (i / vowels.length) * dur;
      const fm = F[v] ?? F.a;
      filters.forEach((f, k) => f.frequency.linearRampToValueAtTime(fm[k], s + 0.08));
    });
    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, t);
    eg.gain.linearRampToValueAtTime(opts.vol ?? 0.2, t + 0.05);
    eg.gain.setValueAtTime(opts.vol ?? 0.2, t + dur - 0.15);
    eg.gain.linearRampToValueAtTime(0, t + dur);
    if (opts.stutter) {
      const steps = Math.floor(dur * 20);
      for (let i = 0; i < steps; i++) {
        if (Math.random() < opts.stutter) eg.gain.setValueAtTime(0, t + i * 0.05);
      }
    }
    let node: AudioNode = sum;
    if (opts.distort) {
      const ws = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      const k = opts.distort * 50;
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1;
        curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
      }
      ws.curve = curve;
      sum.connect(ws);
      node = ws;
    }
    node.connect(eg).connect(this.out(opts.bus ?? 'sfx', pos, 2, 0.6));
    o.start(t);
    vib.start(t);
    o.stop(t + dur + 0.05);
    vib.stop(t + dur + 0.05);
  }

  /** Remnant screech: FM + noise. */
  screech(pos?: THREE.Vector3, vol = 0.3, pitch = 1): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const car = ctx.createOscillator();
    car.type = 'sawtooth';
    car.frequency.setValueAtTime(520 * pitch, t);
    car.frequency.exponentialRampToValueAtTime(1300 * pitch, t + 0.25);
    car.frequency.exponentialRampToValueAtTime(380 * pitch, t + 0.9);
    const mod = ctx.createOscillator();
    mod.frequency.value = 377 * pitch;
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(900, t);
    mg.gain.linearRampToValueAtTime(200, t + 0.9);
    mod.connect(mg).connect(car.frequency);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 1.2;
    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, t);
    eg.gain.linearRampToValueAtTime(vol, t + 0.04);
    eg.gain.exponentialRampToValueAtTime(0.0001, t + 1.0);
    car.connect(f).connect(eg).connect(this.out('sfx', pos, 3, 0.6));
    car.start(t);
    mod.start(t);
    car.stop(t + 1.05);
    mod.stop(t + 1.05);
    this.burst({ pos, dur: 0.6, vol: vol * 0.5, freq: 2500, type: 'bandpass', q: 3 });
  }

  /** Rapid clicking / time stutter of a Remnant. */
  stutterClicks(pos?: THREE.Vector3, vol = 0.15, count = 10): void {
    if (!this.ctx) return;
    for (let i = 0; i < count; i++) {
      this.tone({ pos, freq: 1200 + Math.random() * 2400, dur: 0.02, vol, type: 'square', delay: i * (0.03 + Math.random() * 0.05), reverb: 0.4 });
    }
  }

  growl(pos?: THREE.Vector3, vol = 0.2): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(52, t + 1.2);
    const am = ctx.createOscillator();
    am.frequency.value = 23;
    const ag = ctx.createGain();
    ag.gain.value = 0.5;
    const vg = ctx.createGain();
    vg.gain.value = 0.5;
    am.connect(ag).connect(vg.gain);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 600;
    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, t);
    eg.gain.linearRampToValueAtTime(vol, t + 0.2);
    eg.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(vg).connect(f).connect(eg).connect(this.out('sfx', pos, 2, 0.5));
    o.start(t);
    am.start(t);
    o.stop(t + 1.35);
    am.stop(t + 1.35);
  }

  heartbeat(vol = 0.4): void {
    this.tone({ freq: 62, freqEnd: 38, dur: 0.18, vol, bus: 'ui', reverb: 0 });
    this.tone({ freq: 58, freqEnd: 36, dur: 0.18, vol: vol * 0.7, delay: 0.22, bus: 'ui', reverb: 0 });
  }

  thunder(dist = 0.5): void {
    if (!this.ctx) return;
    const delay = dist * 2.5;
    window.setTimeout(() => {
      this.burst({ dur: 0.25, vol: 0.4 * (1 - dist * 0.6), freq: 2500, type: 'lowpass', noise: 'white', bus: 'amb', reverb: 0.5 });
      this.burst({ dur: 4.5, vol: 0.7, freq: 500, freqEnd: 80, noise: 'brown', bus: 'amb', reverb: 0.7, attack: 0.15 });
    }, delay * 1000);
  }

  explosion(pos?: THREE.Vector3, vol = 1): void {
    this.burst({ pos, dur: 2.5, vol: 0.9 * vol, freq: 1600, freqEnd: 60, noise: 'brown', reverb: 0.9, ref: 8 });
    this.burst({ pos, dur: 0.4, vol: 0.6 * vol, freq: 6000, freqEnd: 800, noise: 'white', reverb: 0.7, ref: 8 });
    this.tone({ pos, freq: 50, freqEnd: 25, dur: 2.0, vol: 0.9 * vol, reverb: 0.5 });
    this.impact('glass', pos, 1);
  }

  rumble(dur = 3, vol = 0.5): void {
    this.burst({ dur, vol, freq: 140, freqEnd: 50, noise: 'brown', bus: 'amb', reverb: 0.6, attack: dur * 0.3 });
    this.tone({ freq: 34, dur, vol: vol * 0.7, attack: dur * 0.3, bus: 'amb' });
  }

  elevatorDing(pos?: THREE.Vector3): void {
    this.tone({ pos, freq: NOTE('E5'), dur: 1.4, vol: 0.12, reverb: 0.4 });
    this.tone({ pos, freq: NOTE('E6') * 1.003, dur: 0.8, vol: 0.03, reverb: 0.4 });
  }

  /** Subway PA chime, three falling notes. */
  paChime(pos?: THREE.Vector3): void {
    ['E5', 'C5', 'G4'].forEach((n, i) => {
      this.tone({ pos, freq: NOTE(n), dur: 1.4, vol: 0.12, delay: i * 0.45, reverb: 0.9, ref: 6 } as never);
    });
  }

  /** Garbled PA speech (formants) - subtitles carry the words. */
  paVoice(pos: THREE.Vector3 | undefined, seconds: number): void {
    const n = Math.max(1, Math.floor(seconds / 0.7));
    for (let i = 0; i < n; i++) {
      window.setTimeout(() => this.voice(pos, { pitch: 120 + Math.random() * 20, vowels: 'aoeiuoa'.slice(i % 3, i % 3 + 4), dur: 0.6, vol: 0.06, distort: 0.6, bus: 'sfx' }), i * 700);
    }
  }

  trainPass(pos?: THREE.Vector3, dur = 7, vol = 0.8): void {
    this.burst({ pos, dur, vol, freq: 300, freqEnd: 120, noise: 'brown', attack: dur * 0.45, reverb: 0.8, ref: 10 });
    this.burst({ pos, dur: dur * 0.9, vol: vol * 0.25, freq: 3200, type: 'bandpass', q: 9, attack: dur * 0.5, reverb: 0.8, ref: 10 });
    for (let i = 0; i < 18; i++) {
      window.setTimeout(() => this.impact('metal', pos, 0.25), (dur * 0.25 + i * 0.18) * 1000);
    }
  }

  trainDoors(pos?: THREE.Vector3): void {
    this.burst({ pos, dur: 0.9, vol: 0.3, freq: 4000, type: 'highpass', attack: 0.05, reverb: 0.6 });
    this.tone({ pos, freq: NOTE('A5'), dur: 0.4, vol: 0.08, delay: 0.1 });
    this.tone({ pos, freq: NOTE('F5'), dur: 0.6, vol: 0.08, delay: 0.45 });
  }

  // ---------------------------------------------------------------- music
  private musicGain(): AudioNode {
    const g = this.ctx!.createGain();
    g.gain.value = 1;
    g.connect(this.buses.music);
    const s = this.ctx!.createGain();
    s.gain.value = 0.45;
    g.connect(s).connect(this.reverbIn);
    return g;
  }

  /** A single music-box tine. */
  musicBoxNote(freq: number, delay: number, vol = 0.07, dest?: AudioNode): void {
    const d = dest ?? this.musicGain();
    this.tone({ freq, dur: 2.2, vol, delay, attack: 0.002, dest: d });
    this.tone({ freq: freq * 3.01, dur: 0.6, vol: vol * 0.25, delay, attack: 0.001, dest: d });
    this.tone({ freq: freq * 5.4, dur: 0.25, vol: vol * 0.08, delay, attack: 0.001, dest: d });
  }

  /** Ellie's theme on a music box. Returns duration. */
  ellieTheme(vol = 0.07, slow = 1): number {
    if (!this.ctx) return 0;
    const mel: [string, number][] = [
      ['E5', 1], ['G5', 1], ['A5', 2], ['G5', 1], ['E5', 1], ['D5', 2],
      ['C5', 1], ['D5', 1], ['E5', 1], ['G5', 1], ['E5', 3], ['', 1],
      ['E5', 1], ['G5', 1], ['A5', 2], ['C6', 1], ['B5', 1], ['A5', 2],
      ['G5', 1], ['E5', 1], ['D5', 1], ['E5', 1], ['C5', 4],
    ];
    const bass = ['A3', 'F3', 'C4', 'G3', 'A3', 'F3', 'G3', 'C4'];
    const beat = 0.42 * slow;
    const dest = this.musicGain();
    let t = 0;
    for (const [n, d] of mel) {
      if (n) this.musicBoxNote(NOTE(n), t, vol, dest);
      t += d * beat;
    }
    bass.forEach((b, i) => this.musicBoxNote(NOTE(b), i * 4 * beat, vol * 0.6, dest));
    return t;
  }

  /** Soft synth pad chord. */
  pad(notes: string[], dur: number, vol = 0.05, attack = 2, delay = 0): void {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const dest = this.musicGain();
    const t = ctx.currentTime + delay;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.linearRampToValueAtTime(1600, t + attack + dur * 0.3);
    lp.frequency.linearRampToValueAtTime(500, t + dur);
    const eg = ctx.createGain();
    eg.gain.setValueAtTime(0, t);
    eg.gain.linearRampToValueAtTime(vol, t + attack);
    eg.gain.setValueAtTime(vol, t + Math.max(attack, dur - 2));
    eg.gain.linearRampToValueAtTime(0, t + dur);
    lp.connect(eg).connect(dest);
    for (const n of notes) {
      for (const det of [-6, 0, 7]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = NOTE(n);
        o.detune.value = det;
        const og = ctx.createGain();
        og.gain.value = 0.12;
        o.connect(og).connect(lp);
        o.start(t);
        o.stop(t + dur + 0.1);
      }
    }
  }

  /** Felt piano note (additive + decay). */
  piano(note: string, delay = 0, vol = 0.08, dur = 3): void {
    if (!this.ctx) return;
    const dest = this.musicGain();
    const f = NOTE(note);
    this.tone({ freq: f, dur, vol, delay, attack: 0.004, dest });
    this.tone({ freq: f * 2.002, dur: dur * 0.6, vol: vol * 0.35, delay, attack: 0.003, dest });
    this.tone({ freq: f * 3.005, dur: dur * 0.3, vol: vol * 0.12, delay, attack: 0.002, dest });
  }

  /** Play a sequence of piano notes: [note, beatOffset] */
  pianoPhrase(seq: [string, number][], beat = 0.6, vol = 0.07): void {
    for (const [n, b] of seq) this.piano(n, b * beat, vol, 3.5);
  }

  /** Cinematic hit: low boom + dissonant cluster. */
  stinger(kind: 'reveal' | 'scare' | 'soft' = 'reveal'): void {
    if (!this.ctx) return;
    const dest = this.musicGain();
    if (kind === 'scare') {
      this.tone({ freq: 46, freqEnd: 30, dur: 2.5, vol: 0.6, dest });
      for (const n of ['C5', 'C#5', 'D5', 'G#5']) this.tone({ freq: NOTE(n), dur: 1.6, vol: 0.04, type: 'sawtooth', attack: 0.01, dest });
      this.burst({ dur: 0.7, vol: 0.4, freq: 3000, type: 'bandpass', bus: 'music', reverb: 0.8 });
    } else if (kind === 'reveal') {
      this.tone({ freq: 41, dur: 6, vol: 0.5, attack: 0.05, dest });
      this.pad(['A2', 'E3', 'A3', 'C4', 'D#4'], 7, 0.05, 0.4);
    } else {
      this.pad(['C3', 'G3', 'E4'], 6, 0.035, 2);
    }
  }

  /** Low tension bed for encounters; returns handle. */
  tensionBed(vol = 0.12): LoopHandle | null {
    if (!this.ctx) return null;
    const ctx = this.ctx;
    const dest = this.ctx.createGain();
    dest.gain.value = 0;
    dest.connect(this.buses.music);
    const nodes: AudioScheduledSourceNode[] = [];
    for (const [f, a] of [[55, 0.3], [58.3, 0.2], [110, 0.12], [164.8, 0.06]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 300;
      const og = ctx.createGain();
      og.gain.value = a;
      o.connect(lp).connect(og).connect(dest);
      o.start();
      nodes.push(o);
    }
    // pulse
    const pulse = ctx.createOscillator();
    pulse.frequency.value = 1.6;
    const pg = ctx.createGain();
    pg.gain.value = vol * 0.4;
    pulse.connect(pg).connect(dest.gain);
    pulse.start();
    nodes.push(pulse);
    dest.gain.setTargetAtTime(vol, ctx.currentTime, 1);
    return this.makeLoop(dest, nodes);
  }
}

export const audio = new AudioEngine();
export { NOTE };
