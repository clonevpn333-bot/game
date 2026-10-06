import * as THREE from 'three';
import { Path, type PathSample, type Zone } from './Path';
import { Mats } from './Materials';
import { archFrame, gableRoof, lathe, merge, place, prep, rockGeo, spire, worldBox } from './geo';
import { createSeededRandom } from '../utils/random';
import type { TorchSpot } from './Terrain';

type MatKey =
  | 'house0'
  | 'house1'
  | 'house2'
  | 'slate'
  | 'wood'
  | 'stone'
  | 'stoneWarm'
  | 'stoneDark'
  | 'iron'
  | 'bronze'
  | 'lancet'
  | 'rose'
  | 'sigil'
  | 'clothRed'
  | 'clothGreen'
  | 'rock';

/** Collects geometry per material role and emits one merged mesh per role. */
class Kit {
  private readonly parts = new Map<MatKey, THREE.BufferGeometry[]>();
  add(key: MatKey, g: THREE.BufferGeometry): void {
    const list = this.parts.get(key) ?? [];
    list.push(g);
    this.parts.set(key, list);
  }
  build(name: string, castShadow = true): THREE.Group {
    const m = Mats();
    const mats: Record<MatKey, THREE.Material> = {
      house0: m.houses[0],
      house1: m.houses[1],
      house2: m.houses[2],
      slate: m.slate,
      wood: m.wood,
      stone: m.stone,
      stoneWarm: m.stoneWarm,
      stoneDark: m.stoneDark,
      iron: m.ironDark,
      bronze: m.bronze,
      lancet: m.lancet,
      rose: m.rose,
      sigil: m.tabard,
      clothRed: m.robeRed,
      clothGreen: m.robeGreen,
      rock: m.rock,
    };
    const g = new THREE.Group();
    g.name = name;
    for (const [key, list] of this.parts) {
      if (!list.length) continue;
      const geo = merge(list);
      if (key === 'rock') {
        const c = new Float32Array(geo.attributes.position.count * 3).fill(0.7);
        geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
      }
      const mesh = new THREE.Mesh(geo, mats[key]);
      const emissiveOnly = key === 'lancet' || key === 'rose';
      mesh.castShadow = castShadow && !emissiveOnly;
      mesh.receiveShadow = !emissiveOnly;
      mesh.name = `${name}-${key}`;
      g.add(mesh);
    }
    return g;
  }
}

export type Bell = { pivot: THREE.Object3D; phase: number; size: number; pos: THREE.Vector3 };
export type Riser = { group: THREE.Group; rise: number; delay: number; baseY: number; progress: number; s: number };
export type Obstacle = { x: number; z: number; r: number };

const yawFor = (t: THREE.Vector3) => Math.atan2(-t.z, t.x);

export class City {
  readonly group = new THREE.Group();
  readonly torches: TorchSpot[] = [];
  readonly bells: Bell[] = [];
  readonly risers: Riser[] = [];
  readonly obstacles: Obstacle[] = [];
  readonly cracks: THREE.Mesh[] = [];
  portcullis!: THREE.Mesh;
  statue!: THREE.Group;
  statuePivot!: THREE.Group;
  fountainWater!: THREE.Mesh;
  lightShafts: THREE.Mesh[] = [];
  readonly banners: THREE.Mesh[] = [];
  readonly cathedralDoor = new THREE.Vector3();
  readonly plazaCenter = new THREE.Vector3();
  private readonly rng = createSeededRandom(77);
  private readonly static = new Kit();
  private readonly houseFootprints: Array<{ x: number; z: number; r: number }> = [];

  constructor(
    private readonly path: Path,
    private readonly ground: (x: number, z: number) => number = () => -Infinity,
  ) {
    this.group.name = 'city';
    this.buildWalls();
    this.buildStreets();
    this.buildSkyline();
    this.buildMarket();
    this.buildStairWalls();
    this.buildPlaza();
    this.buildCathedral();
    this.group.add(this.static.build('city-static'));
    this.buildBanners();
  }

  /** Lowest rendered ground under a square footprint of half-size r: foundations reach down to it. */
  private foot(x: number, z: number, r: number): number {
    let y = Infinity;
    for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r], [r, 0], [-r, 0], [0, r], [0, -r]]) y = Math.min(y, this.ground(x + dx, z + dz));
    return y;
  }

  /** True if the whole footprint stands on ground no more than `drop` below `y` (i.e. not past the rim). */
  private solid(x: number, z: number, r: number, y: number, drop = 4): boolean {
    return this.foot(x, z, r) > y - drop;
  }

  /** A vertical box/cylinder from `bottom` up to `top`, with its base sunk to the ground beneath. */
  private footing(x: number, z: number, r: number, bottom: number): number {
    return Math.min(bottom, this.foot(x, z, r) - 1.5);
  }

  // ------------------------------------------------------------------ walls & gate
  private buildWalls(): void {
    const gs = this.path.samples.find((s) => s.zone === 'gate' && s.width < 8.2 && s.s > this.path.zoneStart('gate') + 25);
    const gate = gs ?? this.path.at(this.path.zoneStart('gate') + 34);
    const yaw = yawFor(gate.tangent);
    const k = this.static;
    const wallH = 22;
    // Curtain wall extending both ways, following the plateau rim.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 9; i += 1) {
        const off = side * (9 + i * 16);
        const p = gate.pos.clone().addScaledVector(gate.right, off);
        const bend = Math.abs(off) > 60 ? (Math.abs(off) - 60) * 0.35 : 0;
        p.addScaledVector(gate.tangent, bend);
        // The curtain wall ends where the plateau does; nothing hangs over the cliff.
        if (!this.solid(p.x, p.z, 8.5, gate.pos.y, 14)) break;
        const wb = this.footing(p.x, p.z, 8.5, gate.pos.y - 30);
        const wt = gate.pos.y + wallH;
        k.add('stone', place(worldBox(16.4, wt - wb, 5, 6), p.x, (wt + wb) / 2, p.z, yaw + side * (bend > 0 ? 0.3 : 0)));
        // Crenellations.
        for (let c = -3; c <= 3; c += 2) {
          const cp = p.clone().addScaledVector(gate.right, c * 2);
          k.add('stone', place(worldBox(1.6, 1.8, 5.4, 2), cp.x, gate.pos.y + wallH + 0.9, cp.z, yaw));
        }
        if (i % 3 === 2) {
          // Round towers with conical slate caps.
          const tp = p.clone().addScaledVector(gate.tangent, 3);
          if (!this.solid(tp.x, tp.z, 6.6, gate.pos.y, 14)) continue;
          const tb = this.footing(tp.x, tp.z, 6.6, gate.pos.y - 28);
          const tt = gate.pos.y + wallH + 12;
          k.add('stone', place(prep(new THREE.CylinderGeometry(6, 6.6, tt - tb, 10)), tp.x, (tt + tb) / 2, tp.z));
          k.add('slate', place(spire(7, 14, 10), tp.x, gate.pos.y + wallH + 12, tp.z));
          this.addLancet(tp.clone().addScaledVector(gate.tangent, 6.05), yaw, gate.pos.y + wallH, 1.2, 2.4);
        }
      }
    }
    // Gatehouse towers.
    for (const side of [-1, 1]) {
      const p = gate.pos.clone().addScaledVector(gate.right, side * 8.5);
      const gb = this.footing(p.x, p.z, 6, gate.pos.y - 6);
      k.add('stoneWarm', place(worldBox(9, gate.pos.y + 34 - gb, 12, 6), p.x, (gate.pos.y + 34 + gb) / 2, p.z, yaw));
      k.add('slate', place(spire(7.5, 18, 4), p.x, gate.pos.y + 34, p.z, Math.PI / 4 + yaw));
      for (const h of [18, 26]) this.addLancet(p.clone().addScaledVector(gate.tangent, 6.05), yaw, gate.pos.y + h, 1.1, 2.6);
      const tp = p.clone().addScaledVector(gate.tangent, 6.2);
      this.torches.push({ pos: new THREE.Vector3(tp.x, gate.pos.y + 6, tp.z).addScaledVector(gate.right, -side * 3.6), zone: 'gate', s: gate.s });
    }
    // Arch over the road.
    k.add('stoneWarm', place(archFrame(8, 10, 12, 4), gate.pos.x, gate.pos.y, gate.pos.z, yaw - Math.PI / 2));
    k.add('stoneWarm', place(worldBox(16, 10, 12, 6), gate.pos.x, gate.pos.y + 19, gate.pos.z, yaw));
    k.add('sigil', place(prep(new THREE.PlaneGeometry(4, 5)), gate.pos.x, gate.pos.y + 20, gate.pos.z).translate(gate.tangent.x * 6.1, 0, gate.tangent.z * 6.1));
    // Portcullis.
    const bars: THREE.BufferGeometry[] = [];
    for (let i = -3; i <= 3; i += 1) bars.push(place(worldBox(0.25, 10.5, 0.25, 1), i * 1.15, 5.2, 0));
    for (let j = 0; j < 5; j += 1) bars.push(place(worldBox(8, 0.22, 0.22, 1), 0, 1 + j * 2.2, 0));
    for (let i = -3; i <= 3; i += 1) bars.push(place(prep(new THREE.ConeGeometry(0.2, 0.7, 4)), i * 1.15, -0.3, 0, 0, 1, 1, 1, Math.PI));
    this.portcullis = new THREE.Mesh(merge(bars), Mats().ironDark);
    this.portcullis.position.copy(gate.pos);
    this.portcullis.rotation.y = yaw - Math.PI / 2;
    this.portcullis.castShadow = true;
    this.portcullis.userData.baseY = gate.pos.y;
    this.portcullis.userData.s = gate.s;
    this.group.add(this.portcullis);
  }

  // ------------------------------------------------------------------ houses
  private intrudes(x: number, z: number, radius: number): boolean {
    const near = this.path.nearest(x, z);
    const d = Math.abs(near.lateral);
    const along = Math.hypot(x - near.sample.pos.x, z - near.sample.pos.z);
    return Math.min(d, along) < near.sample.width / 2 + radius + 0.6;
  }

  private overlapsHouse(x: number, z: number, r: number): boolean {
    for (const f of this.houseFootprints) {
      if (Math.hypot(f.x - x, f.z - z) < f.r + r - 1.2) return true;
    }
    return false;
  }

  private house(kit: Kit, s: PathSample, side: number, setback: number, w: number, d: number, floors: number, tall = false): boolean {
    const hw = s.width / 2;
    const center = s.pos.clone().addScaledVector(s.right, side * (hw + setback + d / 2));
    const r = Math.hypot(w, d) / 2;
    if (this.intrudes(center.x, center.z, r * 0.8) || this.overlapsHouse(center.x, center.z, r * 0.7)) return false;
    if (!this.solid(center.x, center.z, r, s.pos.y, 5)) return false;
    this.houseFootprints.push({ x: center.x, z: center.z, r: r * 0.85 });
    const yaw = yawFor(s.tangent);
    const h = floors * 4;
    const y0 = s.pos.y - 0.2;
    const variant = Math.floor(this.rng() * 3);
    const wallKey = (`house${variant}`) as MatKey;
    // Stone plinth reaching down to the lowest ground under the house, so no corner ever hangs in the air.
    const pb = this.footing(center.x, center.z, Math.max(w, d) / 2 + 0.3, y0 - 7.9);
    const pt = y0 + 1.1;
    kit.add('stoneDark', place(worldBox(w + 0.4, pt - pb, d + 0.4, 4), center.x, (pt + pb) / 2, center.z, yaw));
    kit.add(wallKey, place(worldBox(w, h, d, 16), center.x, y0 + 1.1 + h / 2, center.z, yaw));
    // Jettied upper storey on taller houses.
    if (floors >= 3 && this.rng() < 0.6) {
      kit.add('wood', place(worldBox(w + 0.9, 0.5, d + 0.9, 2), center.x, y0 + 1.1 + 4, center.z, yaw));
      kit.add('wood', place(worldBox(w + 0.7, 0.4, d + 0.7, 2), center.x, y0 + 1.1 + 8, center.z, yaw));
    }
    const roofH = tall ? 9 + this.rng() * 4 : 4.5 + this.rng() * 3;
    const ridgeAlong = this.rng() < 0.65;
    const roof = ridgeAlong ? gableRoof(w, d, roofH) : gableRoof(d, w, roofH);
    kit.add('slate', place(roof, center.x, y0 + 1.1 + h, center.z, yaw + (ridgeAlong ? 0 : Math.PI / 2)));
    this.facade(kit, center, yaw, w, d, h, y0 + 1.1, floors, variant, ridgeAlong, roofH, side);
    if (this.rng() < 0.7) {
      const cx = (this.rng() - 0.5) * w * 0.6;
      const local = new THREE.Vector3(cx, 0, (this.rng() - 0.5) * d * 0.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      kit.add('stoneDark', place(worldBox(1, roofH + 2, 1, 2), center.x + local.x, y0 + 1.1 + h + roofH / 2 + 0.5, center.z + local.z, yaw));
    }
    // Door facing the street.
    const front = center.clone().addScaledVector(s.right, -side * (d / 2 + 0.05));
    kit.add('wood', place(worldBox(1.6, 2.8, 0.3, 2), front.x, y0 + 2.5, front.z, yaw));
    kit.add('stoneWarm', place(archFrame(1.8, 2.9, 0.5, 0.35), front.x, y0 + 1.1, front.z, yaw));
    // Wall torch bracket every few houses.
    if (this.rng() < 0.45) {
      const tp = front.clone().addScaledVector(s.tangent, (this.rng() < 0.5 ? -1 : 1) * (w / 2 - 1)).addScaledVector(s.right, -side * 0.5);
      kit.add('iron', place(worldBox(0.15, 0.15, 0.9, 1), tp.x, y0 + 4.2, tp.z, yaw + Math.PI / 2));
      this.torches.push({ pos: new THREE.Vector3(tp.x, y0 + 4.7, tp.z), zone: s.zone, s: s.s });
    }
    if (this.rng() < 0.25) {
      const bp = front.clone().addScaledVector(s.right, -side * 0.2);
      this.bannerSpots.push({ pos: new THREE.Vector3(bp.x, y0 + h - 0.5, bp.z), yaw, len: 4 + this.rng() * 2 });
    }
    if (tall && this.rng() < 0.5) {
      kit.add('slate', place(spire(1.6, 7, 6), center.x, y0 + 1.1 + h + roofH - 1, center.z));
    }
    return true;
  }

  /** Architectural detail: posts, girts, sills, hoods, shutters, braces, eaves, dormers. */
  private facade(kit: Kit, center: THREE.Vector3, yaw: number, w: number, d: number, h: number, wallBase: number, floors: number, variant: number, ridgeAlong: boolean, roofH: number, side: number): void {
    const up = new THREE.Vector3(0, 1, 0);
    const L = (lx: number, ly: number, lz: number) => new THREE.Vector3(lx, 0, lz).applyAxisAngle(up, yaw).add(center).setY(ly);
    const timber = variant !== 1;
    for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      if (timber) {
        const p = L(cx * (w / 2), wallBase + h / 2, cz * (d / 2));
        kit.add('wood', place(worldBox(0.36, h, 0.36, 2), p.x, p.y, p.z, yaw));
      } else {
        // Quoins: alternating long/short corner stones.
        for (let q = 0; q < h / 0.8; q += 1) {
          const long = q % 2 === 0;
          const p = L(cx * (w / 2 - (long ? 0.35 : 0.2)), wallBase + 0.4 + q * 0.8, cz * (d / 2 + 0.06));
          kit.add('stoneWarm', place(worldBox(long ? 0.9 : 0.5, 0.72, 0.16, 1), p.x, p.y, p.z, yaw));
        }
      }
    }
    for (let f = 1; f <= floors; f += 1) {
      const p = L(0, wallBase + f * 4 - 0.12, 0);
      kit.add('wood', place(worldBox(w + 0.24, 0.26, d + 0.24, 2), p.x, p.y, p.z, yaw));
    }
    const bays = Math.floor(w / 4);
    for (const fz of [-1, 1]) {
      for (let b = 0; b < bays; b += 1) {
        const bx = -w / 2 + 2 + b * 4;
        for (let f = 0; f < floors; f += 1) {
          const fy = wallBase + f * 4;
          const zf = fz * (d / 2 + 0.1);
          const sill = L(bx, fy + 0.8, zf + fz * 0.05);
          kit.add('stoneWarm', place(worldBox(1.6, 0.14, 0.34, 1), sill.x, sill.y, sill.z, yaw));
          const hood = L(bx, fy + 3.14, zf);
          kit.add(timber ? 'wood' : 'stoneWarm', place(worldBox(1.75, 0.18, 0.26, 1), hood.x, hood.y, hood.z, yaw));
          if (this.rng() < 0.4) {
            for (const sx of [-1, 1]) {
              const sh = L(bx + sx * 1.0, fy + 1.95, zf + fz * 0.1);
              kit.add('wood', place(worldBox(0.5, 2.1, 0.07, 1), sh.x, sh.y, sh.z, yaw + sx * fz * 0.45));
            }
          }
          if (timber && b < bays - 1 && (b + f) % 2 === 0) {
            const br = L(bx + 2, fy + 2, zf);
            kit.add('wood', place(worldBox(0.18, 4.1, 0.12, 1), br.x, br.y, br.z, yaw, 1, 1, 1, 0, (b + f) % 4 === 0 ? 0.62 : -0.62));
          }
        }
      }
    }
    // Eave boards and ridge beam.
    const eaveY = wallBase + h;
    for (const ez of [-1, 1]) {
      const p = ridgeAlong ? L(0, eaveY + 0.06, ez * (d / 2 + 0.55)) : L(ez * (w / 2 + 0.55), eaveY + 0.06, 0);
      kit.add('wood', place(worldBox(ridgeAlong ? w + 1.3 : 0.3, 0.32, ridgeAlong ? 0.3 : d + 1.3, 1), p.x, p.y, p.z, yaw));
    }
    const ridge = L(0, eaveY + roofH + 0.05, 0);
    kit.add('wood', place(worldBox(ridgeAlong ? w + 1.3 : 0.28, 0.28, ridgeAlong ? 0.28 : d + 1.3, 1), ridge.x, ridge.y, ridge.z, yaw));
    // Dormer on the street-side slope of tall roofs.
    if (ridgeAlong && roofH > 5.5 && w > 8) {
      const lz = -side * (d / 4);
      const dp = L((this.rng() - 0.5) * (w - 4), eaveY + roofH * 0.42, lz);
      kit.add(`house${variant}` as MatKey, place(worldBox(2, 2.2, 2, 16), dp.x, dp.y, dp.z, yaw));
      kit.add('slate', place(gableRoof(2, 2, 1.4, 0.3), dp.x, dp.y + 1.1, dp.z, yaw + Math.PI / 2));
      const facePos = L((dp.x - center.x) * 0 + 0, 0, 0);
      void facePos;
      const front = new THREE.Vector3(0, 0, -side).applyAxisAngle(up, yaw);
      this.addLancetAt(dp.x + front.x * 1.02, dp.y + 0.1, dp.z + front.z * 1.02, yaw + (side > 0 ? Math.PI : 0), 0.9, 1.5);
    }
  }

  private readonly bannerSpots: Array<{ pos: THREE.Vector3; yaw: number; len: number }> = [];

  private buildStreets(): void {
    const start = this.path.zoneStart('street');
    const end = this.path.zoneStart('plaza') - 2;
    const riserKits: Array<{ kit: Kit; s: number; baseY: number; rise: number; delay: number; rocks: THREE.Vector3[] }> = [];
    for (const side of [-1, 1]) {
      let s = start + 2;
      while (s < end) {
        const sample = this.path.at(s);
        const w = 7 + this.rng() * 5;
        const zone = sample.zone;
        const inBroken = zone === 'broken';
        const floors = zone === 'stair' ? 2 + Math.floor(this.rng() * 2) : 2 + Math.floor(this.rng() * 3);
        let kit = this.static;
        let riser: (typeof riserKits)[number] | null = null;
        if (inBroken && this.rng() < 0.55) {
          riser = { kit: new Kit(), s, baseY: sample.pos.y, rise: 7 + this.rng() * 16, delay: this.rng() * 6, rocks: [] };
          kit = riser.kit;
        }
        const placed = this.house(kit, sample, side, 0.6 + this.rng() * 0.8, w, 8 + this.rng() * 4, floors);
        // Second row: taller, peeking over the first.
        const back = this.path.at(s + w * 0.4);
        this.house(riser ? riser.kit : this.static, back, side, 13 + this.rng() * 4, 8 + this.rng() * 5, 9 + this.rng() * 4, 3 + Math.floor(this.rng() * 3), true);
        if (riser && placed) {
          riser.rocks.push(sample.pos.clone().addScaledVector(sample.right, side * (sample.width / 2 + 7)));
          riserKits.push(riser);
        }
        s += w + 0.4 + (placed ? 0 : 2);
      }
    }
    for (const r of riserKits) {
      // Rock root beneath the lifted block: revealed as it rises.
      for (const p of r.rocks) {
        r.kit.add('rock', place(rockGeo(r.s, 1), p.x, r.baseY - 14, p.z, this.rng() * 6, 9, 16, 9));
      }
      const group = r.kit.build(`riser-${Math.round(r.s)}`);
      this.group.add(group);
      this.risers.push({ group, rise: r.rise, delay: r.delay, baseY: 0, progress: 0, s: r.s });
    }
    // Lantern strings across Lantern Street.
    const lStart = this.path.zoneStart('street');
    for (let s = lStart + 8; s < this.path.zoneStart('market') - 4; s += 11) {
      const a = this.path.at(s);
      for (let i = -2; i <= 2; i += 1) {
        const p = a.pos.clone().addScaledVector(a.right, i * (a.width / 6));
        this.lanternSpots.push(new THREE.Vector3(p.x, a.pos.y + 6.2 - Math.abs(i) * 0.2 + 0.6 * (i === 0 ? -1 : 0), p.z));
      }
    }
  }

  readonly lanternSpots: THREE.Vector3[] = [];

  // ------------------------------------------------------------------ skyline
  private buildSkyline(): void {
    const k = this.static;
    const cityStart = this.path.zoneStart('gate');
    let placed = 0;
    for (let i = 0; i < 900 && placed < 70; i += 1) {
      const s = cityStart + 20 + this.rng() * (this.path.length - cityStart - 40);
      const sample = this.path.at(s);
      const side = this.rng() < 0.5 ? -1 : 1;
      if (sample.zone === 'plaza' && side < 0) continue;
      const off = sample.width / 2 + 30 + this.rng() * 66;
      const p = sample.pos.clone().addScaledVector(sample.right, side * off);
      if (this.intrudes(p.x, p.z, 10) || this.overlapsHouse(p.x, p.z, 7)) continue;
      if (!this.solid(p.x, p.z, 7, sample.pos.y, 3)) continue;
      this.houseFootprints.push({ x: p.x, z: p.z, r: 7 });
      placed += 1;
      let h = 20 + this.rng() * 40 + Math.max(0, (s - cityStart) * 0.05);
      const r = 3 + this.rng() * 3;
      const round = this.rng() < 0.5;
      const baseY = this.footing(p.x, p.z, r * 1.1, sample.pos.y - 8);
      const h0 = h;
      h += sample.pos.y - 8 - baseY;
      void h0;
      if (round) {
        k.add('stone', place(prep(new THREE.CylinderGeometry(r, r * 1.08, h, 10)), p.x, baseY + h / 2, p.z));
        k.add('slate', place(spire(r * 1.25, r * 3.2, 10), p.x, baseY + h, p.z));
      } else {
        k.add('stoneWarm', place(worldBox(r * 2, h, r * 2, 6), p.x, baseY + h / 2, p.z, this.rng()));
        k.add('slate', place(spire(r * 1.5, r * 4, 4), p.x, baseY + h, p.z, Math.PI / 4));
      }
      // A few lit windows up the tower.
      for (let w = 0; w < 3; w += 1) {
        if (this.rng() < 0.4) continue;
        const a = this.rng() * Math.PI * 2;
        this.addLancetAt(p.x + Math.cos(a) * (r + 0.05), baseY + h * (0.45 + w * 0.15), p.z + Math.sin(a) * (r + 0.05), -a + Math.PI / 2, 0.9, 2.2);
      }
      // Some towers carry a bell in an open belfry.
      if (h > 40 && this.bells.length < 7 && this.rng() < 0.45) {
        const by = baseY + h - 3;
        for (let c = 0; c < 4; c += 1) {
          const a = (c / 4) * Math.PI * 2 + Math.PI / 4;
          k.add('stone', place(worldBox(0.8, 5, 0.8, 2), p.x + Math.cos(a) * r * 0.8, by + 2.5, p.z + Math.sin(a) * r * 0.8));
        }
        this.addBell(new THREE.Vector3(p.x, by + 4.6, p.z), r * 0.45);
      }
    }
  }

  // ------------------------------------------------------------------ market
  private buildMarket(): void {
    const k = this.static;
    const ms = this.path.at(this.path.zoneStart('market') + 30);
    const c = ms.pos.clone();
    this.marketCenter.copy(c);
    // Fountain.
    k.add('stoneWarm', place(lathe([[0, 0], [4.2, 0], [4.4, 0.9], [4.0, 1.0], [3.8, 0.4], [0, 0.4]], 18), c.x, c.y, c.z));
    k.add('stoneWarm', place(lathe([[0.7, 0], [0.5, 2.2], [1.6, 2.6], [1.4, 2.9], [0.3, 3.0], [0.25, 4.2], [0.6, 4.5], [0, 4.9]], 12), c.x, c.y, c.z));
    const water = new THREE.CircleGeometry(3.85, 40, 0, Math.PI * 2);
    water.rotateX(-Math.PI / 2);
    this.fountainWater = new THREE.Mesh(water, Mats().water);
    this.fountainWater.position.set(c.x, c.y + 0.8, c.z);
    this.fountainWater.userData.base = (water.attributes.position as THREE.BufferAttribute).array.slice();
    this.group.add(this.fountainWater);
    this.obstacles.push({ x: c.x, z: c.z, r: 4.6 });

    // Statue of Saint Ossery holding a bell, on a pedestal. It topples during the tremor.
    const sp = c.clone().addScaledVector(ms.tangent, -16).addScaledVector(ms.right, 6);
    k.add('stone', place(worldBox(3.4, 3, 3.4, 2), sp.x, sp.y + 1.5, sp.z));
    k.add('stoneDark', place(worldBox(4, 0.6, 4, 2), sp.x, sp.y + 0.3, sp.z));
    this.obstacles.push({ x: sp.x, z: sp.z, r: 2.6 });
    this.statuePivot = new THREE.Group();
    this.statuePivot.position.set(sp.x + 1.6, sp.y + 3, sp.z);
    const statue = new THREE.Group();
    statue.position.set(-1.6, 0, 0);
    const sm = Mats().stone;
    const robe = new THREE.Mesh(lathe([[1.4, 0], [1.25, 1.5], [0.95, 3.5], [0.8, 4.4], [0.4, 4.7], [0, 4.75]], 10), sm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), sm);
    head.position.y = 5.1;
    const hood = new THREE.Mesh(lathe([[0.7, 0], [0.75, 0.5], [0.5, 1.05], [0, 1.2]], 10), sm);
    hood.position.y = 4.6;
    const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 1.6, 3, 6), sm);
    armL.position.set(0.7, 3.8, 0.4);
    armL.rotation.set(-0.9, 0, -0.3);
    const bell = new THREE.Mesh(lathe([[0, 1.0], [0.25, 0.95], [0.45, 0.6], [0.55, 0.15], [0.7, 0]], 10), Mats().bronze);
    bell.position.set(0.9, 3.0, 1.3);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.06, 4, 16), Mats().gold);
    halo.position.set(0, 5.3, -0.4);
    statue.add(robe, head, hood, armL, bell, halo);
    statue.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    this.statuePivot.add(statue);
    this.statue = statue;
    this.group.add(this.statuePivot);

    // Market stalls ring the plaza edge.
    const stalls = 9;
    for (let i = 0; i < stalls; i += 1) {
      const a = (i / stalls) * Math.PI * 2 + 0.3;
      const rad = 9.5 + (i % 2) * 1.5;
      const p = c.clone().add(new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad));
      const near = this.path.nearest(p.x, p.z);
      if (Math.abs(near.lateral) > near.sample.width / 2 - 2.5) continue;
      if (Math.abs(near.lateral) < 3.4) continue; // keep the main lane open
      const yaw = -a;
      for (const [dx, dz] of [[-1.3, -0.9], [1.3, -0.9], [-1.3, 0.9], [1.3, 0.9]]) {
        const lp = new THREE.Vector3(dx, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        k.add('wood', place(worldBox(0.18, 2.6, 0.18, 1), p.x + lp.x, p.y + 1.3, p.z + lp.z));
      }
      k.add('wood', place(worldBox(2.8, 0.15, 1.6, 2), p.x, p.y + 1.0, p.z, yaw));
      k.add(i % 2 ? 'clothRed' : 'clothGreen', place(worldBox(3.2, 0.08, 2.4, 2), p.x, p.y + 2.65, p.z, yaw, 1, 1, 1, 0.25));
      // Crates and barrels.
      const cp = new THREE.Vector3(1.9, 0, 0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw).add(p);
      k.add('wood', place(worldBox(0.9, 0.9, 0.9, 1), cp.x, p.y + 0.45, cp.z, this.rng()));
      k.add('wood', place(prep(new THREE.CylinderGeometry(0.45, 0.4, 1.1, 8)), cp.x - 0.4, p.y + 0.55, cp.z + 1.1));
      this.obstacles.push({ x: p.x, z: p.z, r: 1.9 });
    }
    // Two braziers.
    for (const side of [-1, 1]) {
      const bp = c.clone().addScaledVector(ms.right, side * 8).addScaledVector(ms.tangent, 7);
      k.add('iron', place(lathe([[0.15, 0], [0.12, 1.2], [0.7, 1.4], [0.8, 1.9], [0.0, 1.6]], 8), bp.x, bp.y, bp.z));
      this.torches.push({ pos: new THREE.Vector3(bp.x, bp.y + 2.3, bp.z), zone: 'market', s: ms.s });
      this.obstacles.push({ x: bp.x, z: bp.z, r: 0.8 });
    }
  }

  readonly marketCenter = new THREE.Vector3();

  private buildStairWalls(): void {
    const k = this.static;
    for (const s of this.path.samples) {
      if (s.zone !== 'stair' || Math.round(s.s) % 4 !== 0) continue;
      const yaw = yawFor(s.tangent);
      for (const side of [-1, 1]) {
        const p = s.pos.clone().addScaledVector(s.right, side * (s.width / 2 + 0.8));
        k.add('stoneWarm', place(worldBox(4.2, 3.4, 1.4, 4), p.x, s.pos.y + 0.6, p.z, yaw));
        if (Math.round(s.s) % 12 === 0) {
          k.add('stoneWarm', place(worldBox(1.8, 4.6, 1.8, 2), p.x, s.pos.y + 1.2, p.z, yaw));
          this.torches.push({ pos: new THREE.Vector3(p.x, s.pos.y + 4.1, p.z), zone: 'stair', s: s.s });
        }
      }
    }
  }

  // ------------------------------------------------------------------ plaza
  private buildPlaza(): void {
    const k = this.static;
    const center = this.path.at(this.path.zoneStart('plaza') + 34);
    this.plazaCenter.copy(center.pos);
    const yaw = yawFor(center.tangent);
    // West balustrade above the abyss.
    for (let i = -9; i <= 9; i += 1) {
      const s = this.path.at(center.s + i * 3.2);
      const p = s.pos.clone().addScaledVector(s.right, -(s.width / 2 + 0.4));
      k.add('stone', place(worldBox(0.5, 1.2, 3.2, 2), p.x, s.pos.y + 0.6, p.z, yawFor(s.tangent)));
      k.add('stoneWarm', place(worldBox(0.9, 0.25, 3.3, 2), p.x, s.pos.y + 1.3, p.z, yawFor(s.tangent)));
      if (i % 3 === 0) {
        k.add('stoneWarm', place(worldBox(1.1, 1.7, 1.1, 2), p.x, s.pos.y + 0.85, p.z));
      }
    }
    // East cloister arcade.
    for (let i = -7; i <= 7; i += 1) {
      const s = this.path.at(center.s + i * 4.4);
      const p = s.pos.clone().addScaledVector(s.right, s.width / 2 + 3);
      k.add('stoneWarm', place(archFrame(3.4, 5.2, 1.2, 0.6), p.x, s.pos.y, p.z, yawFor(s.tangent) + Math.PI / 2 - Math.PI / 2));
      k.add('stoneWarm', place(worldBox(4.6, 2.2, 1.6, 2), p.x, s.pos.y + 6.9, p.z, yawFor(s.tangent)));
      k.add('stone', place(worldBox(4.6, 12, 6, 4), p.addScaledVector(s.right, 4).x, s.pos.y + 5, p.z, yawFor(s.tangent)));
    }
    // Kneeling knight statues along the processional way.
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i += 1) {
        const s = this.path.at(center.s - 20 + i * 18);
        const p = s.pos.clone().addScaledVector(s.right, side * (s.width / 2 - 3));
        k.add('stoneDark', place(worldBox(2.4, 1.6, 2.4, 2), p.x, s.pos.y + 0.8, p.z, yaw));
        k.add('stone', place(lathe([[1.0, 0], [0.9, 1.2], [0.7, 2.4], [0.3, 2.7], [0.5, 3.2], [0, 3.6]], 8), p.x, s.pos.y + 1.6, p.z));
        k.add('stone', place(worldBox(0.2, 3.6, 0.5, 1), p.x - side * 0.2, s.pos.y + 2.8, p.z + 0.9, 0, 1, 1, 1, 0.1));
        this.obstacles.push({ x: p.x, z: p.z, r: 1.7 });
        this.torches.push({ pos: new THREE.Vector3(p.x, s.pos.y + 4.4, p.z).addScaledVector(s.tangent, 1.6), zone: 'plaza', s: s.s });
      }
    }
  }

  // ------------------------------------------------------------------ cathedral
  private buildCathedral(): void {
    const k = this.static;
    const end = this.path.samples[this.path.samples.length - 1];
    const O = end.pos.clone().addScaledVector(end.tangent, 14);
    this.cathedralDoor.copy(O);
    const baseY = O.y;
    const zf = O.z; // facade plane (cathedral extends toward -z)
    const x0 = O.x;
    // Front steps.
    for (let i = 0; i < 4; i += 1) {
      k.add('stoneWarm', place(worldBox(30 - i * 2, 0.5, 3, 2), x0, baseY + 0.25 + i * 0.5 - 0.5, zf + 6 - i * 1.6));
    }
    // Nave and aisles.
    k.add('stone', place(worldBox(26, 40, 110, 8), x0, baseY + 20, zf - 55));
    k.add('stone', place(worldBox(12, 22, 100, 8), x0 - 19, baseY + 11, zf - 58));
    k.add('stone', place(worldBox(12, 22, 100, 8), x0 + 19, baseY + 11, zf - 58));
    k.add('slate', place(gableRoof(110, 26, 16, 0.8), x0, baseY + 40, zf - 55, Math.PI / 2));
    k.add('slate', place(gableRoof(100, 12, 5, 0.6), x0 - 19, baseY + 22, zf - 58, Math.PI / 2));
    k.add('slate', place(gableRoof(100, 12, 5, 0.6), x0 + 19, baseY + 22, zf - 58, Math.PI / 2));
    // Transept.
    k.add('stone', place(worldBox(76, 36, 22, 8), x0, baseY + 18, zf - 74));
    k.add('slate', place(gableRoof(76, 22, 13, 0.8), x0, baseY + 36, zf - 74));
    // Flying buttresses and pinnacles.
    for (let i = 0; i < 8; i += 1) {
      const z = zf - 14 - i * 12.5;
      if (Math.abs(z - (zf - 74)) < 14) continue;
      for (const side of [-1, 1]) {
        k.add('stoneWarm', place(worldBox(3, 30, 3.2, 4), x0 + side * 29, baseY + 15, z));
        k.add('stoneWarm', place(spire(1.8, 8, 4), x0 + side * 29, baseY + 30, z, Math.PI / 4));
        k.add('stoneWarm', place(worldBox(1.3, 1.3, 16, 4), x0 + side * 21, baseY + 28, z, Math.PI / 2, 1, 1, 1, side * 0.55));
        k.add('stoneWarm', place(spire(0.9, 5, 4), x0 + side * 13, baseY + 40, z));
        this.addLancetAt(x0 + side * 13.06, baseY + 28, z + 6, side > 0 ? Math.PI / 2 : -Math.PI / 2, 2.4, 9);
        this.addLancetAt(x0 + side * 25.06, baseY + 10, z + 6, side > 0 ? Math.PI / 2 : -Math.PI / 2, 1.8, 6);
      }
    }
    // West-front towers.
    for (const side of [-1, 1]) {
      const tx = x0 + side * 18;
      const tz = zf - 6;
      k.add('stoneWarm', place(worldBox(15, 74, 15, 8), tx, baseY + 37, tz));
      for (const cx of [-1, 1]) for (const cz of [-1, 1]) {
        k.add('stoneWarm', place(worldBox(2.2, 78, 2.2, 4), tx + cx * 7.6, baseY + 39, tz + cz * 7.6));
        k.add('stoneWarm', place(spire(1.6, 10, 4), tx + cx * 7.6, baseY + 78, tz + cz * 7.6, Math.PI / 4));
      }
      // Belfry with open arches and a great bell.
      k.add('stone', place(prep(new THREE.CylinderGeometry(6.4, 6.4, 3, 8)), tx, baseY + 75.5, tz));
      for (let c = 0; c < 8; c += 1) {
        const a = (c / 8) * Math.PI * 2;
        k.add('stone', place(worldBox(1.2, 16, 1.2, 2), tx + Math.cos(a) * 6, baseY + 85, tz + Math.sin(a) * 6));
      }
      k.add('stone', place(prep(new THREE.CylinderGeometry(6.6, 6.6, 2.5, 8)), tx, baseY + 94, tz));
      k.add('slate', place(spire(7.2, 48, 8), tx, baseY + 95, tz, Math.PI / 8));
      k.add('bronze', place(prep(new THREE.SphereGeometry(0.9, 8, 6)), tx, baseY + 143.5, tz));
      this.addBell(new THREE.Vector3(tx, baseY + 91.5, tz), 3.2);
      for (const h of [24, 44, 60]) this.addLancetAt(tx, baseY + h, zf + 1.56, 0, 2, 7);
    }
    // Central crossing spire.
    k.add('stone', place(prep(new THREE.CylinderGeometry(9, 9.5, 24, 8)), x0, baseY + 50, zf - 74));
    k.add('slate', place(spire(9.5, 86, 8), x0, baseY + 62, zf - 74, Math.PI / 8));
    for (let c = 0; c < 8; c += 1) {
      const a = (c / 8) * Math.PI * 2;
      k.add('stoneWarm', place(spire(1.2, 12, 4), x0 + Math.cos(a) * 9.5, baseY + 62, zf - 74 + Math.sin(a) * 9.5));
    }
    // Facade: portal, gallery of kings, rose window, gable.
    k.add('stoneWarm', place(worldBox(22, 46, 4, 6), x0, baseY + 23, zf - 0.5));
    k.add('stoneWarm', place(archFrame(9, 15, 3, 2.6), x0, baseY, zf + 2.4));
    k.add('stoneWarm', place(archFrame(11.5, 17.5, 1.2, 1.2), x0, baseY, zf + 3.6));
    k.add('wood', place(worldBox(9, 15, 0.6, 3), x0, baseY + 7.5, zf + 1.4));
    k.add('stoneWarm', place(spire(11, 14, 4), x0, baseY + 46, zf - 0.5, Math.PI / 4, 1, 1, 0.25));
    for (let i = -4; i <= 4; i += 1) {
      k.add('stoneDark', place(archFrame(1.4, 3.4, 0.6, 0.3), x0 + i * 2.3, baseY + 21, zf + 1.6));
      k.add('stone', place(lathe([[0.5, 0], [0.4, 1.5], [0.25, 2.3], [0.3, 2.6], [0, 3]], 6), x0 + i * 2.3, baseY + 21, zf + 1.4));
    }
    const rose = new THREE.Mesh(new THREE.CircleGeometry(7, 32), Mats().rose);
    rose.position.set(x0, baseY + 32, zf + 1.56);
    this.group.add(rose);
    k.add('stoneWarm', place(prep(new THREE.TorusGeometry(7.4, 0.8, 6, 32)), x0, baseY + 32, zf + 1.6));
    this.torches.push({ pos: new THREE.Vector3(x0 - 6, baseY + 4, zf + 4), zone: 'plaza', s: end.s });
    this.torches.push({ pos: new THREE.Vector3(x0 + 6, baseY + 4, zf + 4), zone: 'plaza', s: end.s });
    // God-rays from the rose window and the open doors.
    this.lightShafts.push(this.makeShaft(new THREE.Vector3(x0, baseY + 32, zf + 2), 7, 70, -0.55, '#ffb860'));
    // Chapter-end anchor: the cathedral sits on the very crown of the sleeping Founder.
  }

  private makeShaft(origin: THREE.Vector3, radius: number, length: number, pitch: number, color: string): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(radius, radius * 2.4, length, 16, 1, true);
    geo.translate(0, -length / 2, 0);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uStrength: { value: 0.32 } },
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uTime, uStrength; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float fall = pow(vUv.y, 1.6);
          float dust = 0.75 + 0.25 * sin(vUv.x * 40.0 + uTime * 0.7) * sin(vUv.y * 13.0 - uTime * 0.4);
          gl_FragColor = vec4(uColor * edge * fall * dust * uStrength, 1.0); }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    mesh.rotation.x = Math.PI / 2 + pitch;
    mesh.renderOrder = 5;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    return mesh;
  }

  private addBell(pos: THREE.Vector3, size: number): void {
    const pivot = new THREE.Group();
    pivot.position.copy(pos);
    const bell = new THREE.Mesh(
      lathe([[0, 0], [0.32, -0.05], [0.5, -0.35], [0.56, -0.75], [0.72, -1.05], [0.78, -1.15], [0.6, -1.12]], 14),
      Mats().bronze,
    );
    bell.scale.setScalar(size);
    const yoke = new THREE.Mesh(worldBox(size * 2.6, size * 0.25, size * 0.3, 2), Mats().wood);
    yoke.position.y = size * 0.05;
    pivot.add(bell, yoke);
    pivot.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    this.group.add(pivot);
    this.bells.push({ pivot, phase: this.rng() * Math.PI * 2, size, pos: pos.clone() });
  }

  private addLancet(pos: THREE.Vector3, yaw: number, y: number, w: number, h: number): void {
    this.addLancetAt(pos.x, y, pos.z, yaw - Math.PI / 2, w, h);
  }

  private addLancetAt(x: number, y: number, z: number, rotY: number, w: number, h: number): void {
    const g = prep(new THREE.PlaneGeometry(w, h));
    this.static.add('lancet', place(g, x, y, z, rotY));
  }

  private buildBanners(): void {
    const m = Mats();
    const mat = m.tabard.clone();
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = BannerTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float hang = max(-position.y, 0.0);
         transformed.z += sin(uTime * 2.1 + hang * 1.3 + modelMatrix[3].x) * 0.12 * hang;
         transformed.x += sin(uTime * 1.3 + modelMatrix[3].z) * 0.04 * hang;`,
      );
    };
    mat.customProgramCacheKey = () => 'banner';
    for (const b of this.bannerSpots.slice(0, 26)) {
      const g = new THREE.PlaneGeometry(1.6, b.len, 1, 6);
      g.translate(0, -b.len / 2, 0);
      const mesh = new THREE.Mesh(g, mat);
      mesh.position.copy(b.pos);
      mesh.rotation.y = b.yaw;
      this.banners.push(mesh);
      this.group.add(mesh);
    }
  }

  /** Visible fissures across the broken street, revealed during the tremor. */
  addCracks(zones: Zone[]): void {
    for (const s of this.path.samples) {
      if (!zones.includes(s.zone) || Math.round(s.s) % 9 !== 0) continue;
      const geo = new THREE.PlaneGeometry(s.width * 1.3, 4.5);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, Mats().crackGlow.clone());
      mesh.position.set(s.pos.x, s.pos.y + 0.09, s.pos.z);
      mesh.rotation.y = yawFor(s.tangent) + Math.PI / 2 + (this.rng() - 0.5) * 0.8;
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0;
      mesh.renderOrder = 3;
      this.cracks.push(mesh);
      this.group.add(mesh);
    }
  }
}

export const BannerTime = { value: 0 };
