import * as THREE from 'three';
import { smoothstep } from '../utils/math';

export type Zone = 'road' | 'bridge' | 'gate' | 'street' | 'market' | 'broken' | 'stair' | 'plaza' | 'wood' | 'hamlet' | 'chapel' | 'ribs';

export type Node = [number, number, number, number, Zone];

/**
 * The whole chapter is one authored spline corridor. Width varies per node so streets
 * swell into plazas. Movement is clamped to the corridor, which is what keeps the game
 * linear while the scenery around it suggests a kingdom that goes on for miles.
 */
export const NODES_CH1: Node[] = [
  [0, 40, 40, 8, 'road'],
  [0, 40, -20, 8, 'road'],
  [-28, 44, -90, 8, 'road'],
  [-14, 50, -165, 8, 'road'],
  [30, 57, -230, 8, 'road'],
  [52, 64, -300, 8, 'road'],
  [30, 72, -380, 8, 'road'],
  [-12, 80, -445, 8, 'road'],
  [-22, 86, -495, 7, 'bridge'],
  [-14, 90, -565, 7, 'bridge'],
  [-2, 94, -632, 7, 'bridge'],
  [6, 100, -672, 10, 'gate'],
  [8, 104, -706, 7, 'gate'],
  [6, 106, -742, 9, 'street'],
  [-14, 108, -790, 9, 'street'],
  [-26, 110, -842, 26, 'market'],
  [-20, 111, -884, 22, 'market'],
  [2, 113, -926, 10, 'broken'],
  [24, 116, -972, 10, 'broken'],
  [22, 121, -1008, 8, 'stair'],
  [12, 129, -1042, 8, 'stair'],
  [4, 132, -1074, 14, 'plaza'],
  [0, 132, -1108, 38, 'plaza'],
  [0, 132, -1140, 30, 'plaza'],
  [0, 132, -1156, 12, 'plaza'],
];

/** Chapter II: the Witchwood, down through the stilt hamlet and the chapel ruins to the Ribs of Harrowmere. */
export const NODES_CH2: Node[] = [
  [0, 30, 40, 8, 'wood'],
  [0, 30, -20, 8, 'wood'],
  [-26, 32, -82, 7, 'wood'],
  [-12, 34, -142, 8, 'wood'],
  [22, 36, -190, 10, 'wood'],
  [32, 37, -232, 24, 'hamlet'],
  [22, 37, -276, 24, 'hamlet'],
  [2, 39, -322, 8, 'wood'],
  [-18, 42, -364, 9, 'chapel'],
  [-22, 45, -404, 12, 'chapel'],
  [-10, 48, -440, 8, 'wood'],
  [0, 50, -466, 14, 'ribs'],
  [0, 50, -505, 46, 'ribs'],
  [0, 50, -545, 46, 'ribs'],
  [0, 50, -572, 16, 'ribs'],
];

export type PathSample = {
  pos: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  width: number;
  s: number;
  zone: Zone;
};

export type Nearest = { index: number; lateral: number; sample: PathSample };

export class Path {
  readonly curve: THREE.CatmullRomCurve3;
  readonly samples: PathSample[] = [];
  readonly length: number;
  private readonly zoneStarts = new Map<Zone, number>();

  constructor(private readonly NODES: Node[] = NODES_CH1) {
    this.curve = new THREE.CatmullRomCurve3(
      NODES.map((n) => new THREE.Vector3(n[0], n[1], n[2])),
      false,
      'centripetal',
    );
    this.length = this.curve.getLength();
    const count = Math.ceil(this.length);
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i <= count; i += 1) {
      const u = i / count;
      const t = this.curve.getUtoTmapping(u, 0);
      const pos = this.curve.getPoint(t);
      const tangent = this.curve.getTangent(t);
      tangent.y = 0;
      tangent.normalize();
      const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
      const f = t * (this.NODES.length - 1);
      const k = Math.min(this.NODES.length - 2, Math.floor(f));
      const w = this.NODES[k][3] + (this.NODES[k + 1][3] - this.NODES[k][3]) * smoothstep(0, 1, f - k);
      const zone = this.NODES[Math.min(this.NODES.length - 1, Math.round(f))][4];
      const sample: PathSample = { pos, tangent, right, width: w, s: u * this.length, zone };
      this.samples.push(sample);
      if (!this.zoneStarts.has(zone)) this.zoneStarts.set(zone, sample.s);
    }
  }

  zoneStart(zone: Zone): number {
    return this.zoneStarts.get(zone) ?? 0;
  }

  at(s: number): PathSample {
    const i = Math.max(0, Math.min(this.samples.length - 1, Math.round((s / this.length) * (this.samples.length - 1))));
    return this.samples[i];
  }

  indexAt(s: number): number {
    return Math.max(0, Math.min(this.samples.length - 1, Math.round((s / this.length) * (this.samples.length - 1))));
  }

  /** Nearest sample in XZ. Uses a local window around `hint` first (linear game = coherent). */
  nearest(x: number, z: number, hint = -1): Nearest {
    let best = 0;
    let bestD = Infinity;
    const scan = (from: number, to: number, step: number) => {
      for (let i = Math.max(0, from); i <= Math.min(this.samples.length - 1, to); i += step) {
        const p = this.samples[i].pos;
        const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
    };
    if (hint >= 0) scan(hint - 60, hint + 60, 1);
    if (hint < 0 || bestD > 40 * 40) {
      scan(0, this.samples.length - 1, 4);
      scan(best - 6, best + 6, 1);
    }
    const sample = this.samples[best];
    const lateral = (x - sample.pos.x) * sample.right.x + (z - sample.pos.z) * sample.right.z;
    return { index: best, lateral, sample };
  }

  /** Distance from the path centreline in XZ (coarse, used by world generation). */
  distanceXZ(x: number, z: number, stride = 5): { d: number; index: number; side: number } {
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.samples.length; i += stride) {
      const p = this.samples[i].pos;
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    for (let i = Math.max(0, best - stride); i <= Math.min(this.samples.length - 1, best + stride); i += 1) {
      const p = this.samples[i].pos;
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    const s = this.samples[best];
    const side = Math.sign((x - s.pos.x) * s.right.x + (z - s.pos.z) * s.right.z) || 1;
    return { d: Math.sqrt(bestD), index: best, side };
  }
}
