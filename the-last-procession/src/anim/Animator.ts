import * as THREE from 'three';
import { CLIPS, type ClipCtx, type ClipFn, type PoseWriter, DEG, idle, run, walk } from './Poses';
import type { Rig } from './Rig';

/** A full-body pose: one local quaternion per bone plus a hips offset. */
class Pose {
  readonly q: Float32Array;
  readonly hip = new THREE.Vector3();
  readonly touched: Uint8Array;
  constructor(readonly n: number) {
    this.q = new Float32Array(n * 4);
    this.touched = new Uint8Array(n);
    this.reset();
  }
  reset(): void {
    for (let i = 0; i < this.n; i++) {
      this.q[i * 4] = 0;
      this.q[i * 4 + 1] = 0;
      this.q[i * 4 + 2] = 0;
      this.q[i * 4 + 3] = 1;
    }
    this.touched.fill(0);
    this.hip.set(0, 0, 0);
  }
}

const tmpE = new THREE.Euler();
const tmpQ = new THREE.Quaternion();

class Writer implements PoseWriter {
  pose!: Pose;
  constructor(private readonly index: Map<string, number>) {}
  r(bone: string, x: number, y = 0, z = 0): void {
    const i = this.index.get(bone);
    if (i === undefined) return;
    tmpE.set(x * DEG, y * DEG, z * DEG, 'YXZ');
    tmpQ.setFromEuler(tmpE);
    const q = this.pose.q;
    q[i * 4] = tmpQ.x;
    q[i * 4 + 1] = tmpQ.y;
    q[i * 4 + 2] = tmpQ.z;
    q[i * 4 + 3] = tmpQ.w;
    this.pose.touched[i] = 1;
  }
  lr(bone: string, side: 'L' | 'R', x: number, y = 0, z = 0): void {
    if (side === 'L') this.r(`${bone}.L`, x, y, z);
    else this.r(`${bone}.R`, x, -y, -z);
  }
  hip(x: number, y: number, z: number): void {
    this.pose.hip.set(x, y, z);
  }
}

interface State {
  clip: string;
  ctx: ClipCtx;
  weight: number;
  target: number;
  fade: number; // seconds for a full 0↔1 transition
  speed: number;
  mask: Float32Array | null;
  oneShot: number; // >0: auto fade out after this many seconds
}

export type Mask = 'full' | 'upper' | 'arms' | 'rightArm' | 'head';

/**
 * Layered, cross-fading animator.
 *  - Base layer: one target state; old states fade out with eased weights.
 *  - Locomotion is a blend space (idle → walk → run) sharing one phase so
 *    foot contacts stay in sync while the mix changes with speed.
 *  - Overlay layer: masked actions (sword swings on horseback, talk gestures).
 */
export class Animator {
  private readonly base: State[] = [];
  private readonly over: State[] = [];
  private readonly w: Writer;
  private readonly tmp: Pose;
  private readonly acc: Pose;
  private readonly sub: Pose;
  private readonly masks = new Map<Mask, Float32Array>();
  readonly params = { speed: 0, vy: 0, turn: 0, lean: 0 };
  /** locomotion stride lengths (metres per full cycle) for walk and run */
  stride = { walk: 1.5, run: 4.6 };
  phase = 0;
  current = '';
  time = 0;

  constructor(private readonly rig: Rig) {
    const n = rig.bones.length;
    this.w = new Writer(rig.index);
    this.tmp = new Pose(n);
    this.acc = new Pose(n);
    this.sub = new Pose(n);
    const mk = (pred: (name: string) => number): Float32Array => {
      const m = new Float32Array(n);
      rig.bones.forEach((b, i) => (m[i] = pred(b.name)));
      return m;
    };
    this.masks.set('full', mk(() => 1));
    this.masks.set('upper', mk((nm) => (/^(spine|chest|neck|head|shoulder|upperArm|foreArm|hand)/.test(nm) ? (nm === 'spine' ? 0.5 : 1) : 0)));
    this.masks.set('arms', mk((nm) => (/^(shoulder|upperArm|foreArm|hand)/.test(nm) ? 1 : 0)));
    this.masks.set('rightArm', mk((nm) => (/\.R$/.test(nm) && /^(shoulder|upperArm|foreArm|hand)/.test(nm) ? 1 : 0)));
    this.masks.set('head', mk((nm) => (/^(neck|head)/.test(nm) ? 1 : 0)));
    this.play('idle', { fade: 0 });
  }

  private ctx(variant = 0): ClipCtx {
    return { t: 0, dt: 0, phase: this.phase, speed: 0, vy: 0, turn: 0, p: 0, variant };
  }

  /** Cross-fade the base layer to a clip. */
  play(clip: string, o: { fade?: number; speed?: number; variant?: number; restart?: boolean } = {}): void {
    const fade = o.fade ?? 0.3;
    const top = this.base[this.base.length - 1];
    if (top && top.clip === clip && top.target === 1 && !o.restart) {
      if (o.speed !== undefined) top.speed = o.speed;
      return;
    }
    for (const s of this.base) {
      s.target = 0;
      s.fade = Math.max(0.0001, fade);
    }
    const st: State = { clip, ctx: this.ctx(o.variant ?? 0), weight: fade <= 0 ? 1 : 0, target: 1, fade: Math.max(0.0001, fade), speed: o.speed ?? 1, mask: null, oneShot: 0 };
    if (fade <= 0) this.base.length = 0;
    this.base.push(st);
    this.current = clip;
  }

  /** Masked overlay action; with `duration` it fades itself out. */
  overlay(clip: string, o: { mask?: Mask; fade?: number; duration?: number; variant?: number; speed?: number } = {}): void {
    for (const s of this.over) {
      s.target = 0;
      s.fade = o.fade ?? 0.2;
    }
    this.over.push({ clip, ctx: this.ctx(o.variant ?? 0), weight: 0, target: 1, fade: o.fade ?? 0.2, speed: o.speed ?? 1, mask: this.masks.get(o.mask ?? 'upper')!, oneShot: o.duration ?? 0 });
  }

  clearOverlay(fade = 0.3): void {
    for (const s of this.over) {
      s.target = 0;
      s.fade = fade;
    }
  }

  get stateTime(): number {
    const top = this.base[this.base.length - 1];
    return top ? top.ctx.t : 0;
  }

  setVariant(v: number): void {
    const top = this.base[this.base.length - 1];
    if (top) top.ctx.variant = v;
  }

  private evalClip(st: State, out: Pose): void {
    out.reset();
    this.w.pose = out;
    const c = st.ctx;
    c.speed = this.params.speed;
    c.vy = this.params.vy;
    c.turn = this.params.turn;
    if (st.clip === 'move') this.locomotion(out, c);
    else {
      if (st.clip === 'ride' || st.clip === 'pillion' || st.clip === 'climb') c.phase = this.phase;
      const fn: ClipFn = CLIPS[st.clip] ?? idle;
      fn(this.w, c);
    }
  }

  /** idle/walk/run blend space evaluated at a shared phase. */
  private locomotion(out: Pose, c: ClipCtx): void {
    const s = this.params.speed;
    const wIdle = 1 - smooth01(s / 0.7);
    const wRun = smooth01((s - 2.3) / 2.4);
    c.phase = this.phase;
    // walk
    this.evalInto(walk, c, out);
    if (wRun > 0.001) {
      this.evalInto(run, c, this.sub);
      blend(out, this.sub, wRun);
    }
    if (wIdle > 0.001) {
      this.evalInto(idle, { ...c, t: this.time }, this.sub);
      blend(out, this.sub, wIdle);
    }
    // lean into speed and turns (additive)
    this.w.pose = out;
    const leanF = Math.min(1, s / 7) * 6 + this.params.lean;
    const bank = Math.max(-1, Math.min(1, this.params.turn * s * 0.05)) * 10;
    addEuler(out, this.rig.index.get('hips')!, leanF * 0.5, 0, -bank);
    addEuler(out, this.rig.index.get('spine')!, leanF * 0.5, 0, -bank * 0.4);
  }

  private evalInto(fn: ClipFn, c: ClipCtx, out: Pose): void {
    out.reset();
    this.w.pose = out;
    fn(this.w, c);
  }

  update(dt: number): void {
    this.time += dt;
    // shared locomotion phase advances with distance travelled
    const s = this.params.speed;
    const wRun = smooth01((s - 2.3) / 2.4);
    const stride = this.stride.walk + (this.stride.run - this.stride.walk) * wRun;
    const top = this.base[this.base.length - 1];
    let rate = s / stride;
    if (top && (top.clip === 'ride' || top.clip === 'pillion')) rate = 0.9 + s * 0.11;
    if (top && top.clip === 'climb') rate = s * 0.7;
    this.phase = (this.phase + rate * dt) % 1;

    stepWeights(this.base, dt);
    stepWeights(this.over, dt);
    // base: weighted sequential slerp (weights renormalised)
    this.acc.reset();
    let total = 0;
    for (const st of this.base) {
      st.ctx.t += dt * st.speed;
      st.ctx.dt = dt;
      if (st.weight <= 0.0001) continue;
      this.evalClip(st, this.tmp);
      const w = ease(st.weight);
      total += w;
      if (total === w) copy(this.acc, this.tmp);
      else blend(this.acc, this.tmp, w / total);
    }
    // overlays: masked blend on top
    for (const st of this.over) {
      st.ctx.t += dt * st.speed;
      if (st.oneShot > 0 && st.ctx.t > st.oneShot) st.target = 0;
      if (st.weight <= 0.0001) continue;
      this.evalClip(st, this.tmp);
      blend(this.acc, this.tmp, ease(st.weight), st.mask!);
    }
    this.apply();
  }

  private apply(): void {
    const q = this.acc.q;
    this.rig.bones.forEach((b, i) => {
      b.quaternion.set(q[i * 4], q[i * 4 + 1], q[i * 4 + 2], q[i * 4 + 3]);
    });
    const hips = this.rig.byName.get('hips')!;
    const rest = this.rig.rest.get('hips')!;
    hips.position.set(rest.x + this.acc.hip.x, rest.y + this.acc.hip.y, rest.z + this.acc.hip.z);
  }
}

function smooth01(x: number): number {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}
function ease(w: number): number {
  return w * w * (3 - 2 * w);
}

function stepWeights(list: State[], dt: number): void {
  for (const s of list) {
    const d = dt / s.fade;
    s.weight = s.target > s.weight ? Math.min(s.target, s.weight + d) : Math.max(s.target, s.weight - d);
  }
  for (let i = list.length - 1; i >= 0; i--) if (list[i].target === 0 && list[i].weight <= 0) list.splice(i, 1);
}

function copy(dst: Pose, src: Pose): void {
  dst.q.set(src.q);
  dst.hip.copy(src.hip);
}

/** dst = slerp-ish(dst, src, w) per bone (normalised lerp with sign fix), optional mask. */
function blend(dst: Pose, src: Pose, w: number, mask?: Float32Array): void {
  const a = dst.q;
  const b = src.q;
  for (let i = 0; i < dst.n; i++) {
    const k = mask ? w * mask[i] : w;
    if (k <= 0) continue;
    const o = i * 4;
    let bx = b[o];
    let by = b[o + 1];
    let bz = b[o + 2];
    let bw = b[o + 3];
    if (a[o] * bx + a[o + 1] * by + a[o + 2] * bz + a[o + 3] * bw < 0) {
      bx = -bx;
      by = -by;
      bz = -bz;
      bw = -bw;
    }
    const x = a[o] + (bx - a[o]) * k;
    const y = a[o + 1] + (by - a[o + 1]) * k;
    const z = a[o + 2] + (bz - a[o + 2]) * k;
    const ww = a[o + 3] + (bw - a[o + 3]) * k;
    const l = Math.hypot(x, y, z, ww) || 1;
    a[o] = x / l;
    a[o + 1] = y / l;
    a[o + 2] = z / l;
    a[o + 3] = ww / l;
  }
  if (!mask) dst.hip.lerp(src.hip, w);
  else dst.hip.lerp(src.hip, w * 0.0);
}

const addQ = new THREE.Quaternion();
function addEuler(p: Pose, i: number, x: number, y: number, z: number): void {
  if (i === undefined) return;
  tmpE.set(x * DEG, y * DEG, z * DEG, 'YXZ');
  addQ.setFromEuler(tmpE);
  const o = i * 4;
  tmpQ.set(p.q[o], p.q[o + 1], p.q[o + 2], p.q[o + 3]).multiply(addQ);
  p.q[o] = tmpQ.x;
  p.q[o + 1] = tmpQ.y;
  p.q[o + 2] = tmpQ.z;
  p.q[o + 3] = tmpQ.w;
}
