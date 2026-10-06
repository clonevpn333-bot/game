import * as THREE from 'three';
import { Mats } from '../world/Materials';
import { latheG, limb, mesh } from './Rig';
import { damp } from '../utils/math';

/** Upper limb, knee/hock, fetlock: the three bends that make a horse's leg read as a horse's. */
type Leg = { upper: THREE.Group; mid: THREE.Group; low: THREE.Group; front: boolean; side: number; down: boolean };

type Gait = { name: string; hz: number; duty: number; offsets: [number, number, number, number]; reach: number; lift: number; bob: number; pitch: number };

// Footfall offsets in cycle fractions, for legs [right fore, left fore, right hind, left hind].
const GAITS: Gait[] = [
  // Four-beat walk: LH, LF, RH, RF evenly spaced.
  { name: 'walk', hz: 0.95, duty: 0.64, offsets: [0.25, 0.75, 0, 0.5], reach: 0.3, lift: 0.75, bob: 0.025, pitch: 0.015 },
  // Two-beat trot: diagonal pairs land together.
  { name: 'trot', hz: 1.45, duty: 0.46, offsets: [0.5, 0, 0, 0.5], reach: 0.42, lift: 1.05, bob: 0.06, pitch: 0.02 },
  // Three-beat canter on the right lead: LH, then RH+LF together, then RF, then a moment of air.
  { name: 'canter', hz: 1.7, duty: 0.4, offsets: [0.3, 0.52, 0, 0.3], reach: 0.55, lift: 1.2, bob: 0.08, pitch: 0.09 },
  // Four-beat transverse gallop with a long suspension.
  { name: 'gallop', hz: 2.15, duty: 0.3, offsets: [0.5, 0.6, 0, 0.1], reach: 0.72, lift: 1.4, bob: 0.07, pitch: 0.11 },
];

const smooth = (x: number) => x * x * (3 - 2 * x);

/** Ser Calder's warhorse, Ash: dark coat, blue caparison with the Order's colours. */
export class Horse {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly seat = new THREE.Object3D();
  private readonly neck = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly legs: Leg[] = [];
  private cycle = 0;
  private gait = 0;
  private prevGait = 0;
  private blend = 1;
  /** Hooves that struck the ground during the last update. */
  footfalls = 0;

  constructor() {
    const m = Mats();
    this.root.add(this.body);
    this.body.position.y = 1.25;
    // Barrel, deep chest and rounded quarters.
    const torso = new THREE.SphereGeometry(0.5, 10, 8);
    torso.scale(0.86, 0.92, 1.75);
    this.body.add(mesh(torso, m.horseCoat));
    this.body.add(mesh(new THREE.SphereGeometry(0.45, 10, 8).scale(0.95, 1.05, 0.95), m.horseCoat, 0, 0.04, 0.66));
    this.body.add(mesh(new THREE.SphereGeometry(0.48, 10, 8).scale(1, 1, 0.95), m.horseCoat, 0, 0.08, -0.7));
    for (const sx of [-1, 1]) this.body.add(mesh(new THREE.SphereGeometry(0.3, 8, 6).scale(0.6, 1.1, 1), m.horseCoat, sx * 0.24, -0.04, -0.76));
    // Caparison: open cloth skirt around the barrel.
    const cap = new THREE.CylinderGeometry(0.55, 0.64, 0.7, 9, 1, true);
    cap.scale(1, 1, 1.7);
    this.body.add(mesh(cap, m.barding, 0, -0.12, 0));
    // Saddle with high cantle.
    this.body.add(mesh(latheG([[0.3, 0], [0.32, 0.06], [0.0, 0.08]], 8).scale(1, 1, 1.4), m.leather, 0, 0.42, 0.05));
    this.body.add(mesh(new THREE.BoxGeometry(0.4, 0.22, 0.06), m.leather, 0, 0.55, -0.3));
    this.seat.position.set(0, 0.5, 0.02);
    this.body.add(this.seat);
    // Neck & head.
    this.neck.position.set(0, 0.25, 0.82);
    this.neck.rotation.x = 0.75;
    this.body.add(this.neck);
    const neckG = latheG([[0.27, 0], [0.24, 0.3], [0.19, 0.65], [0.15, 0.92]], 9);
    neckG.scale(0.82, 1, 1.15);
    this.neck.add(mesh(neckG, m.horseCoat));
    for (let i = 0; i < 7; i += 1) {
      const g = new THREE.PlaneGeometry(0.07, 0.3);
      this.neck.add(mesh(g, m.horseMane, 0, 0.1 + i * 0.12, -0.17 + i * 0.005, 0.25, Math.PI / 2, 0));
    }
    this.head.position.set(0, 0.88, 0.02);
    this.head.rotation.x = 1.4;
    this.neck.add(this.head);
    const skull = latheG([[0.0, -0.02], [0.15, 0.04], [0.16, 0.18], [0.12, 0.38], [0.1, 0.52], [0.07, 0.6], [0.0, 0.62]], 9);
    skull.scale(0.82, 1, 1.05);
    this.head.add(mesh(skull, m.horseCoat));
    // Chanfron (face armour).
    this.head.add(mesh(new THREE.BoxGeometry(0.12, 0.45, 0.04), m.plate, 0, 0.3, 0.13, -0.1));
    for (const sx of [-1, 1]) {
      this.head.add(mesh(new THREE.ConeGeometry(0.04, 0.14, 5), m.horseCoat, sx * 0.07, 0.0, -0.08, -0.6, 0, sx * 0.2));
      this.head.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), m.visorDark, sx * 0.12, 0.17, 0.05));
    }
    // Tail.
    this.tail.position.set(0, 0.3, -1.08);
    this.body.add(this.tail);
    this.tail.add(mesh(latheG([[0.06, 0], [0.1, -0.3], [0.09, -0.7], [0.0, -0.85]], 8), m.horseMane));
    this.tail.rotation.x = 0.5;
    // Legs: forelegs hang from the shoulder with a forward knee; hind legs from the stifle with
    // the backward-pointing hock. Rest angles give the classic zig-zag silhouette.
    for (const front of [true, false]) {
      for (const side of [-1, 1]) {
        const upper = new THREE.Group();
        upper.position.set(side * 0.25, front ? -0.12 : -0.02, front ? 0.62 : -0.68);
        this.body.add(upper);
        const upLen = front ? 0.5 : 0.56;
        upper.add(mesh(limb(front ? 0.13 : 0.17, 0.08, upLen, 8), m.horseCoat));
        const mid = new THREE.Group();
        mid.position.y = -upLen;
        upper.add(mid);
        const midLen = front ? 0.4 : 0.42;
        mid.add(mesh(new THREE.SphereGeometry(0.07, 6, 5), m.horseCoat));
        mid.add(mesh(limb(0.06, 0.05, midLen, 7), m.horseCoat));
        const low = new THREE.Group();
        low.position.y = -midLen;
        mid.add(low);
        low.add(mesh(new THREE.SphereGeometry(0.06, 6, 5), m.horseMane));
        low.add(mesh(limb(0.05, 0.06, 0.16, 7), m.horseMane));
        low.add(mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.08, 8), m.ironDark, 0, -0.18, 0.02));
        this.legs.push({ upper, mid, low, front, side, down: true });
      }
    }
    this.root.traverse((o) => {
      const me = o as THREE.Mesh;
      if (me.isMesh) me.castShadow = true;
    });
  }

  private pickGait(speed: number): number {
    // Hysteresis so the horse doesn't flicker between gaits at the boundaries.
    const up = [2.6, 6.8, 11.2];
    const down = [2.0, 6.0, 10.2];
    let g = this.gait;
    while (g < 3 && speed > up[g]) g += 1;
    while (g > 0 && speed < down[g - 1]) g -= 1;
    return g;
  }

  /** Per-leg joint angles for one gait at cycle position c. */
  private legPose(gait: Gait, leg: Leg, idx: number, c: number, amt: number): [number, number, number, boolean] {
    const u = (((c - gait.offsets[idx]) % 1) + 1) % 1;
    const A = gait.reach * amt;
    let swing: number;
    let flex = 0;
    let fet = 0;
    const down = u < gait.duty;
    if (down) {
      // Stance: the hoof is planted and the body rolls over it, leg sweeping front→back.
      const f = u / gait.duty;
      swing = A * (2 * f - 1);
      fet = Math.sin(f * Math.PI) * 0.35 * amt; // fetlock sinks under load
    } else {
      // Swing: fold up and reach forward for the next stride.
      const f = (u - gait.duty) / (1 - gait.duty);
      swing = A * (1 - 2 * smooth(f));
      flex = Math.sin(Math.min(1, f * 1.15) * Math.PI) * gait.lift * amt;
      fet = flex * 0.7;
    }
    // Positive x-rotation carries the hoof backward.
    if (leg.front) return [swing - flex * 0.25, flex * 1.25, fet * 0.6, down];
    return [swing + flex * 0.45 + 0.18, -flex * 1.1 - 0.22, fet * 0.5 + 0.06, down];
  }

  /** speed in m/s. Gaits: walk → trot → canter → gallop, with proper footfall order. */
  update(dt: number, speed: number, time: number): number {
    const g = this.pickGait(speed);
    if (g !== this.gait) {
      this.prevGait = this.gait;
      this.gait = g;
      this.blend = 0;
    }
    this.blend = Math.min(1, this.blend + dt / 0.35);
    const cur = GAITS[this.gait];
    const prev = GAITS[this.prevGait];
    const moving = speed > 0.3;
    const amt = moving ? Math.min(1, speed / 1.2) : 0;
    // Within a gait the stride quickens a little with speed.
    const lo = [0, 2.6, 6.8, 11.2][this.gait];
    const hz = cur.hz * (1 + Math.min(0.35, (speed - lo) * 0.05));
    if (moving) this.cycle = (this.cycle + dt * hz) % 1;
    const w = smooth(this.blend);
    this.footfalls = 0;
    this.legs.forEach((leg, i) => {
      const a = this.legPose(cur, leg, i, this.cycle, amt);
      const b = w < 1 ? this.legPose(prev, leg, i, this.cycle, amt) : a;
      const rest: [number, number, number] = leg.front ? [0, 0, 0] : [0.18, -0.22, 0.06];
      const target = moving ? [0, 1, 2].map((k) => (b[k] as number) + ((a[k] as number) - (b[k] as number)) * w) : rest;
      leg.upper.rotation.x = damp(leg.upper.rotation.x, target[0] as number, 30, dt);
      leg.mid.rotation.x = damp(leg.mid.rotation.x, target[1] as number, 30, dt);
      leg.low.rotation.x = damp(leg.low.rotation.x, target[2] as number, 30, dt);
      if (moving && a[3] && !leg.down) this.footfalls += 1;
      leg.down = moving ? a[3] : true;
    });
    // Body: the walk nods, the trot bounces twice a stride, canter and gallop rock fore and aft.
    const c = this.cycle * Math.PI * 2;
    const bobA = (prev.bob + (cur.bob - prev.bob) * w) * amt;
    const pitchA = (prev.pitch + (cur.pitch - prev.pitch) * w) * amt;
    const twoBeat = this.gait <= 1;
    const bob = moving ? (twoBeat ? Math.abs(Math.sin(c)) - 0.5 : Math.sin(c + 0.6)) * bobA : Math.sin(time * 1.5) * 0.008;
    this.body.position.y = damp(this.body.position.y, 1.25 + bob, 24, dt);
    const pitch = moving ? Math.sin(c + 1.2) * pitchA : 0;
    this.body.rotation.x = damp(this.body.rotation.x, pitch, 16, dt);
    // The head and neck counter the body's rock: it is how a horse balances.
    const nod = moving ? (twoBeat ? Math.sin(c * 2) * 0.06 : -Math.sin(c + 1.2) * 0.16) * amt : Math.sin(time * 0.7) * 0.04;
    this.neck.rotation.x = damp(this.neck.rotation.x, 0.72 + nod + (this.gait >= 2 ? 0.25 : this.gait * 0.08) * amt, 10, dt);
    this.head.rotation.x = damp(this.head.rotation.x, 1.4 - nod * 0.4 - (this.gait >= 3 ? 0.15 : 0), 10, dt);
    this.tail.rotation.x = damp(this.tail.rotation.x, 0.5 + Math.min(1, speed / 14) * 0.7 + Math.sin(time * 3) * 0.06, 6, dt);
    this.tail.rotation.z = Math.sin(time * 1.3) * 0.15 * (1 - Math.min(1, speed / 14) * 0.6);
    return this.footfalls;
  }
}
