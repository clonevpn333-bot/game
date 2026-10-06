import * as THREE from 'three';
import { Path } from './Path';
import { MARSH_WATER, Terrain, windSway, type TorchSpot } from './Terrain';
import { Mats } from './Materials';
import { archFrame, gableRoof, lathe, place, prep, rockGeo, spire, worldBox } from './geo';
import { Kit, Scatter, bladeGeo, bladeTex, flowWater, mtx, velmourOnHorizon, waterMesh } from './Kit';
import { barkMaterial, broadleafTree, deadTree, foliageMaterial, forest, leafTex } from './Trees';
import { createSeededRandom } from '../utils/random';

/**
 * Chapter III world: the Mere of Saint Merrow. Reed flats and black water, a causeway of old
 * pilgrim stones, a village that sank in a single night, and the drowned cathedral where the
 * dead monks still sing the first half of the Hymn.
 */
export class Marsh {
  readonly group = new THREE.Group();
  readonly torches: TorchSpot[] = [];
  readonly obstacles: Array<{ x: number; z: number; r: number }> = [];
  readonly arenaCenter = new THREE.Vector3();
  readonly altar = new THREE.Vector3();
  readonly bellHalf = new THREE.Group();
  readonly water: THREE.Mesh;
  private readonly rng = createSeededRandom(313);
  private readonly eye: THREE.Sprite;
  private readonly glows: THREE.MeshStandardMaterial[] = [];

  constructor(
    private readonly path: Path,
    private readonly terrain: Terrain,
  ) {
    this.group.name = 'marsh';
    const box = new THREE.Box3().setFromPoints(path.samples.map((s) => s.pos));
    const c = box.getCenter(new THREE.Vector3());
    this.water = waterMesh(2600, '#0c1618', 0.92);
    this.water.position.set(c.x, MARSH_WATER, c.z);
    this.group.add(this.water);
    this.vegetation(box);
    this.causeway();
    this.village();
    this.cathedral();
    this.founderHand();
    this.eye = velmourOnHorizon(this.group, new THREE.Vector3(1900, -40, -200), 0.9, '#0a1214');
  }

  /** Lowest rendered ground under a footprint: structures sit on (or sink into) it, never above it. */
  private footY(p: THREE.Vector3, r: number): number {
    let y = Infinity;
    for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) y = Math.min(y, this.terrain.groundAt(p.x + dx, p.z + dz));
    return y;
  }

  // ------------------------------------------------------------------ reeds, drowned trees, stones
  private vegetation(box: THREE.Box3): void {
    const sc = new Scatter();
    const reedMat = windSway(new THREE.MeshStandardMaterial({ map: bladeTex([150, 150, 90], 'reed'), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1, color: '#d8d4b0' }), 0.05, 'reed');
    const reeds = sc.set(bladeGeo(2.2, 2.0), reedMat, false);
    const grassMat = windSway(new THREE.MeshStandardMaterial({ map: bladeTex([80, 96, 52], 'marshgrass', false), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 1 }), 0.08, 'mgrass');
    const grass = sc.set(bladeGeo(1.2, 0.9), grassMat, false);
    const rockG = rockGeo(31, 2);
    const rockMat = new THREE.MeshStandardMaterial({ map: Mats().rock.map, bumpMap: Mats().rock.map, bumpScale: 3, color: '#5a6a5a', roughness: 0.6 });
    const rocks = sc.set(rockG, rockMat, true);
    const pads = sc.set(new THREE.CircleGeometry(0.45, 7).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2a4a26', roughness: 0.6, side: THREE.DoubleSide }), false);
    const trees = forest([
      { geo: deadTree(911, 11), wood: barkMaterial(true, '#6a6458'), leaves: null, shadow: true },
      { geo: deadTree(912, 8), wood: barkMaterial(true, '#6a6458'), leaves: null, shadow: true },
      { geo: broadleafTree(913, 13, true, 1.4), wood: barkMaterial(true, '#5a5448'), leaves: foliageMaterial(leafTex([40, 54, 36], 'willow'), '#9aa890', 'willow', 0.01), shadow: true },
    ]);
    for (let i = 0; i < 5200; i += 1) {
      const x = box.min.x - 260 + this.rng() * (box.max.x - box.min.x + 520);
      const z = box.min.z - 200 + this.rng() * (box.max.z - box.min.z + 400);
      const { d, index } = this.path.distanceXZ(x, z, 6);
      const s = this.path.samples[index];
      const hw = s.width / 2;
      if (d < hw + 1.2) continue;
      if ((s.zone === 'nave' || s.zone === 'choir') && d < hw + 16) continue;
      const y = this.terrain.groundAt(x, z);
      const depth = MARSH_WATER - y;
      const r = this.rng();
      const p = new THREE.Vector3(x, y - 0.1, z);
      if (depth > -1.2 && depth < 1.1 && r < 0.55) sc.add(reeds, mtx(p, this.rng() * 6, 0.8 + this.rng() * 0.7, 0.8 + this.rng() * 0.6));
      else if (depth < -0.1 && r < 0.75) sc.add(grass, mtx(p, this.rng() * 6, 0.9 + this.rng()));
      else if (depth > 0.1 && depth < 1.5 && r < 0.8 && d < 60) sc.add(pads, mtx(new THREE.Vector3(x, MARSH_WATER + 0.02, z), this.rng() * 6, 0.6 + this.rng() * 0.8));
      else if (r < 0.86 && d > hw + 6) {
        if (this.rng() > (d < 60 ? 0.35 : 0.12)) continue;
        const kind = d < 80 && this.rng() < 0.5 ? 2 : Math.floor(this.rng() * 2);
        const k = 0.7 + this.rng() * 0.6;
        trees.add(kind, mtx(new THREE.Vector3(x, y - 0.6, z), this.rng() * 6, k, k, (this.rng() - 0.5) * 0.25), d < 50);
        if (d < hw + 10) this.obstacles.push({ x, z, r: 0.9 });
      } else if (r < 0.92 && this.rng() < 0.4) sc.add(rocks, mtx(new THREE.Vector3(x, y - 0.5, z), this.rng() * 6, 0.6 + this.rng() * 2.2, 0.5 + this.rng(), 0.4));
    }
    // Reed walls that crowd right up to the path edges.
    for (const s of this.path.samples) {
      if (s.zone === 'nave' || s.zone === 'choir' || this.rng() > 0.7) continue;
      for (const side of [-1, 1]) {
        const p = s.pos.clone().addScaledVector(s.right, side * (s.width / 2 + 1.4 + this.rng() * 3));
        p.y = Math.min(this.terrain.groundAt(p.x, p.z), MARSH_WATER + 0.3) - 0.1;
        sc.add(reeds, mtx(p, this.rng() * 6, 0.7 + this.rng() * 0.6));
      }
    }
    sc.build(this.group);
    trees.build(this.group);
  }

  // ------------------------------------------------------------------ the pilgrim causeway
  private causeway(): void {
    const kit = new Kit();
    const m = Mats();
    const mossy = m.stoneDark.clone();
    mossy.color.set('#6a7468');
    for (const s of this.path.samples) {
      if (s.zone !== 'causeway' && s.zone !== 'shore') continue;
      const yaw = Math.atan2(s.tangent.x, s.tangent.z);
      if (s.zone === 'causeway' && Math.round(s.s) % 3 === 0) {
        // The raised embankment the road runs on.
        const h = s.pos.y - (MARSH_WATER - 2.4);
        kit.add(mossy, place(worldBox(s.width + 1.6, h, 3.4, 3), s.pos.x, s.pos.y - 0.32 - h / 2, s.pos.z, yaw));
      }
      if (Math.round(s.s) % 2 === 0 && this.rng() > 0.18) {
        for (const side of [-1, 1]) {
          const p = s.pos.clone().addScaledVector(s.right, side * (s.width / 2 + 0.55));
          const y = Math.min(s.pos.y, this.terrain.groundAt(p.x, p.z));
          kit.add(mossy, place(worldBox(0.7, 0.55 + this.rng() * 0.3, 1.7, 2), p.x, y - 0.05, p.z, yaw + (this.rng() - 0.5) * 0.2, 1, 1, 1, (this.rng() - 0.5) * 0.15, (this.rng() - 0.5) * 0.15));
        }
      }
    }
    // Pilgrim lantern posts, each with a little shrine bell.
    for (let s = 20; s < this.path.zoneStart('nave') - 6; s += 22) {
      const a = this.path.at(s);
      const side = Math.floor(s / 22) % 2 === 0 ? 1 : -1;
      const p = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 0.9));
      const y = Math.min(a.pos.y, this.terrain.groundAt(p.x, p.z)) - 0.3;
      kit.add(m.wood, place(worldBox(0.26, 3.6, 0.26, 1), p.x, y + 1.8, p.z));
      const arm = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 0.3));
      kit.add(m.wood, place(worldBox(0.12, 0.12, 1.2, 1), (p.x + arm.x) / 2, y + 3.5, (p.z + arm.z) / 2, Math.atan2(a.right.x, a.right.z)));
      kit.add(m.ironDark, place(lathe([[0.16, 0], [0.18, 0.3], [0.1, 0.42], [0, 0.46]], 6), arm.x, y + 2.95, arm.z));
      kit.add(m.bronze, place(lathe([[0.0001, 0.18], [0.07, 0.16], [0.1, 0.02], [0.12, -0.04], [0.0001, -0.02]], 8), p.x, y + 3.75, p.z));
      this.torches.push({ pos: new THREE.Vector3(arm.x, y + 3.1, arm.z), zone: 'causeway', s });
    }
    // Half-sunk boats along the shore.
    for (const s of [60, 140, 300, 450, 520]) {
      const a = this.path.at(s);
      const side = s % 3 === 0 ? 1 : -1;
      const p = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 4 + this.rng() * 3));
      const hull = lathe([[0.0001, -0.5], [0.6, -0.42], [0.85, -0.1], [0.9, 0.3]], 10);
      hull.scale(1, 1, 3.4);
      kit.add(m.wood, place(hull, p.x, MARSH_WATER - 0.1, p.z, this.rng() * 6, 1, 1, 1, 0.25, (this.rng() - 0.5) * 0.4));
    }
    kit.build(this.group, 'causeway');
  }

  // ------------------------------------------------------------------ the drowned village of Low Merrow
  private village(): void {
    const kit = new Kit();
    const m = Mats();
    const walls = m.houses.map((h) => {
      const c = h.clone();
      c.emissiveIntensity = 0.12;
      c.color.set('#9aa898');
      return c;
    });
    const roof = m.slate.clone();
    roof.color.set('#7a8a88');
    const start = this.path.zoneStart('village');
    const end = this.path.zoneEnd('village');
    const lots: Array<[number, number]> = [];
    for (let s = start - 26; s < end + 20; s += 9) for (const side of [-1, 1]) if (this.rng() < 0.85) lots.push([s + this.rng() * 4, side]);
    for (const [s, side] of lots) {
      const a = this.path.at(s);
      const w = 5 + this.rng() * 3;
      const d = 5 + this.rng() * 2.5;
      const h = 4 + this.rng() * 3;
      const lat = side * (a.width / 2 + d / 2 + 2 + this.rng() * 8);
      const p = a.pos.clone().addScaledVector(a.right, lat);
      const yaw = Math.atan2(a.tangent.x, a.tangent.z) + (this.rng() - 0.5) * 0.3;
      const base = this.footY(p, Math.max(w, d) / 2) - 1.4;
      const tiltX = (this.rng() - 0.5) * 0.12;
      const tiltZ = (this.rng() - 0.5) * 0.12;
      const top = base + 1.4 + h;
      kit.add(walls[Math.floor(this.rng() * 3)], place(worldBox(w, h + 1.4, d, 3), p.x, base + (h + 1.4) / 2, p.z, yaw, 1, 1, 1, tiltX, tiltZ));
      if (this.rng() < 0.75) kit.add(roof, place(gableRoof(w, d, 2.6, 0.5), p.x, top - 0.05, p.z, yaw, 1, 1, 1, tiltX, tiltZ));
      else {
        // Collapsed roof: bare rafters.
        for (let k = 0; k < 4; k += 1) kit.add(m.wood, place(worldBox(0.2, 0.2, d * 0.7, 1), p.x + Math.sin(yaw + Math.PI / 2) * (k - 1.5) * 1.3, top + 0.8, p.z + Math.cos(yaw + Math.PI / 2) * (k - 1.5) * 1.3, yaw, 1, 1, 1, 0.5 * (k % 2 ? 1 : -1)));
      }
      kit.add(m.wood, place(worldBox(w + 0.3, 0.3, 0.3, 1), p.x, base + 1.6, p.z, yaw, 1, 1, 1, tiltX, tiltZ));
      if (Math.abs(lat) < a.width / 2 + d / 2 + 4) this.obstacles.push({ x: p.x, z: p.z, r: Math.max(w, d) / 2 });
    }
    // The leaning bell tower whose bell rang on the night the village sank.
    const tA = this.path.at(start + 34);
    const tp = tA.pos.clone().addScaledVector(tA.right, -(tA.width / 2 + 9));
    const tb = this.footY(tp, 3) - 2;
    const lean = 0.16;
    kit.add(m.stoneDark, place(worldBox(5, 22, 5, 3), tp.x, tb + 11, tp.z, 0.4, 1, 1, 1, 0, lean));
    kit.add(roof, place(spire(4, 9, 4), tp.x + Math.sin(lean) * -22, tb + 22 * Math.cos(lean), tp.z, 0.4 + Math.PI / 4, 1, 1, 1, 0, lean));
    kit.add(m.bronze, place(lathe([[0.0001, 1.4], [0.6, 1.3], [0.9, 0.4], [1.3, -0.5], [0.0001, -0.4]], 12), tp.x - Math.sin(lean) * 18, tb + 18.2, tp.z, 0, 1, 1, 1, 0, lean));
    // Drowned saints: statues to the waist in water, hands raised.
    for (let i = 0; i < 6; i += 1) {
      const a = this.path.at(start - 40 + i * 30);
      const p = a.pos.clone().addScaledVector(a.right, (i % 2 ? 1 : -1) * (a.width / 2 + 5 + this.rng() * 3));
      const y = MARSH_WATER - 1.2;
      kit.add(m.stone, place(lathe([[0.55, 0], [0.5, 1.4], [0.42, 2.4], [0.3, 2.8], [0.0001, 2.9]], 10), p.x, y, p.z));
      kit.add(m.stone, place(prep(new THREE.SphereGeometry(0.28, 10, 8)), p.x, y + 3.1, p.z));
      kit.add(m.stone, place(worldBox(0.18, 1.2, 0.18, 1), p.x + 0.3, y + 3.2, p.z, 0, 1, 1, 1, 0, -0.4));
      kit.add(m.stone, place(worldBox(0.18, 1.2, 0.18, 1), p.x - 0.3, y + 3.2, p.z, 0, 1, 1, 1, 0, 0.4));
    }
    kit.build(this.group, 'drowned-village');
  }

  // ------------------------------------------------------------------ the drowned cathedral of Saint Merrow
  private cathedral(): void {
    const kit = new Kit();
    const m = Mats();
    const stone = m.stoneWarm.clone();
    stone.color.set('#9a9c90');
    const nave = this.path.zoneStart('nave');
    const choir = this.path.zoneStart('choir');
    const end = this.path.length;
    // Floor slabs so the nave reads as a building, not a road.
    for (const s of this.path.samples) {
      if ((s.zone !== 'nave' && s.zone !== 'choir') || Math.round(s.s) % 4 !== 0) continue;
      const yaw = Math.atan2(s.tangent.x, s.tangent.z);
      const fw = s.zone === 'choir' ? s.width + 6 : s.width + 3;
      kit.add(m.stoneDark, place(worldBox(fw, 2, 4.2, 2.5), s.pos.x, s.pos.y - 1.32, s.pos.z, yaw));
    }
    // Nave colonnade: clustered piers standing in the flood, pointed arcades between them.
    const piers: THREE.Vector3[][] = [[], []];
    for (let s = nave + 4; s < choir - 2; s += 10) {
      const a = this.path.at(s);
      const yaw = Math.atan2(a.tangent.x, a.tangent.z);
      [-1, 1].forEach((side, si) => {
        const p = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 2.4));
        const b = this.footY(p, 1.2) - 0.6;
        const h = 17;
        kit.add(stone, place(prep(new THREE.CylinderGeometry(0.95, 1.1, h, 10)), p.x, b + h / 2, p.z));
        for (let k = 0; k < 4; k += 1) {
          const ang = (k / 4) * Math.PI * 2 + 0.4;
          kit.add(stone, place(prep(new THREE.CylinderGeometry(0.3, 0.32, h, 6)), p.x + Math.cos(ang) * 0.95, b + h / 2, p.z + Math.sin(ang) * 0.95));
        }
        kit.add(stone, place(worldBox(2.8, 0.9, 2.8, 2), p.x, b + 0.45, p.z, yaw));
        kit.add(stone, place(worldBox(2.6, 0.7, 2.6, 2), p.x, b + h + 0.35, p.z, yaw));
        piers[si].push(new THREE.Vector3(p.x, b + h + 0.7, p.z));
        this.obstacles.push({ x: p.x, z: p.z, r: 1.5 });
        // Clerestory wall fragments out beyond the aisles, with lit lancets.
        const wp = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 13));
        const wb = this.footY(wp, 2) - 1;
        const wh = 10 + this.rng() * 14;
        kit.add(stone, place(worldBox(1.6, wh, 10.2, 3), wp.x, wb + wh / 2, wp.z, yaw));
        if (wh > 14) {
          const lp = wp.clone().addScaledVector(a.right, -side * 0.85);
          const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 6.5), m.lancet);
          win.position.set(lp.x, wb + 8.5, lp.z);
          win.rotation.y = Math.atan2(-side * a.right.x, -side * a.right.z);
          this.group.add(win);
        }
      });
      // Braziers at every other pier.
      if (Math.round((s - nave) / 10) % 2 === 0) {
        const bp = a.pos.clone().addScaledVector(a.right, (Math.round(s) % 20 < 10 ? -1 : 1) * (a.width / 2 - 0.6));
        kit.add(m.ironDark, place(lathe([[0.12, 0], [0.1, 1.0], [0.5, 1.15], [0.55, 1.45], [0.0001, 1.3]], 8), bp.x, a.pos.y - 0.3, bp.z));
        this.torches.push({ pos: new THREE.Vector3(bp.x, a.pos.y + 1.6, bp.z), zone: 'nave', s });
        this.obstacles.push({ x: bp.x, z: bp.z, r: 0.6 });
      }
    }
    for (const row of piers) {
      for (let i = 1; i < row.length; i += 1) {
        const a = row[i - 1];
        const b = row[i];
        const mid = a.clone().lerp(b, 0.5);
        const len = a.distanceTo(b);
        const yaw = Math.atan2(b.x - a.x, b.z - a.z) + Math.PI / 2;
        if (this.rng() < 0.85) kit.add(stone, place(archFrame(len - 2.2, 5, 1.4, 1.0), mid.x, mid.y - 5.8, mid.z, yaw));
      }
    }
    // Transverse vault ribs across the nave; the vault itself fell long ago.
    for (let i = 0; i < Math.min(piers[0].length, piers[1].length); i += 1) {
      if (i % 2 === 1 && this.rng() < 0.6) continue;
      const a = piers[0][i];
      const b = piers[1][i];
      const mid = a.clone().lerp(b, 0.5).setY(Math.max(a.y, b.y) + 7);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      kit.add(stone, prep(new THREE.TubeGeometry(curve, 16, 0.45, 6)));
    }
    // The choir: a ring of tall piers around the arena, an apse wall and the great rose window.
    const ca = this.path.at(choir + 22);
    this.arenaCenter.copy(ca.pos);
    const yawC = Math.atan2(ca.tangent.x, ca.tangent.z);
    for (let i = 0; i < 12; i += 1) {
      const ang = (i / 12) * Math.PI * 2;
      if (Math.abs(Math.sin(ang)) < 0.3) continue;
      const r = 24;
      const p = new THREE.Vector3(ca.pos.x + Math.sin(ang + yawC) * r, 0, ca.pos.z + Math.cos(ang + yawC) * r);
      const b = this.footY(p, 1.2) - 0.6;
      const h = 22 + (i % 3) * 3;
      kit.add(stone, place(prep(new THREE.CylinderGeometry(1.1, 1.3, h, 10)), p.x, b + h / 2, p.z));
      kit.add(stone, place(worldBox(3, 1, 3, 2), p.x, b + 0.5, p.z, ang));
      if (i % 3 === 0) {
        const fa = ang + 0.25;
        const fallen = new THREE.Vector3(ca.pos.x + Math.sin(fa + yawC) * 17, ca.pos.y, ca.pos.z + Math.cos(fa + yawC) * 17);
        kit.add(stone, place(prep(new THREE.CylinderGeometry(1.0, 1.0, 9, 10)), fallen.x, ca.pos.y + 0.6, fallen.z, fa, 1, 1, 1, Math.PI / 2));
        this.obstacles.push({ x: fallen.x, z: fallen.z, r: 1.6 });
      }
    }
    // Apse wall and rose window at the far end.
    const apse = this.path.samples[this.path.samples.length - 1].pos.clone().addScaledVector(ca.tangent, 10);
    kit.add(stone, place(worldBox(40, 30, 3, 4), apse.x, apse.y + 13, apse.z, yawC));
    for (const side of [-1, 1]) {
      const sp = apse.clone().addScaledVector(ca.right, side * 22).addScaledVector(ca.tangent, -6);
      kit.add(stone, place(worldBox(3, 34, 14, 4), sp.x, sp.y + 15, sp.z, yawC));
      kit.add(stone, place(spire(3.2, 16, 8), sp.x, sp.y + 32, sp.z));
    }
    const rose = new THREE.Mesh(new THREE.CircleGeometry(8, 32), m.rose);
    rose.position.copy(apse).addScaledVector(ca.tangent, -1.6).setY(apse.y + 19);
    rose.rotation.y = yawC + Math.PI;
    this.group.add(rose);
    // Organ pipes rising along the apse.
    for (let i = 0; i < 15; i += 1) {
      const t = (i - 7) / 7;
      const h = 8 + (1 - Math.abs(t)) * 9;
      const pp = apse.clone().addScaledVector(ca.right, t * 9).addScaledVector(ca.tangent, -2.4);
      kit.add(m.bronze, place(prep(new THREE.CylinderGeometry(0.32, 0.32, h, 8)), pp.x, apse.y + 1.5 + h / 2, pp.z));
      kit.add(m.bronze, place(prep(new THREE.ConeGeometry(0.34, 0.6, 8, 1, true)), pp.x, apse.y + 1.2, pp.z, 0, 1, 1, 1, Math.PI));
    }
    // The altar and the first half of the Cradle Bell.
    this.altar.copy(this.path.samples[this.path.samples.length - 1].pos).addScaledVector(ca.tangent, 1.5);
    kit.add(m.stoneDark, place(worldBox(3.4, 1.2, 1.6, 2), this.altar.x, this.altar.y + 0.6, this.altar.z, yawC));
    kit.add(m.stoneDark, place(worldBox(4.6, 0.3, 3, 2), this.altar.x, this.altar.y + 0.15, this.altar.z, yawC));
    const glow = Mats().goldGlow.clone();
    glow.emissive.set('#9ad8ff');
    glow.emissiveIntensity = 2;
    this.glows.push(glow);
    const half = new THREE.Mesh(new THREE.LatheGeometry([[0.0001, 0.62], [0.2, 0.6], [0.3, 0.42], [0.36, 0.1], [0.46, -0.08], [0.0001, -0.06]].map(([r, y]) => new THREE.Vector2(r, y)), 16, 0, Math.PI), m.bronze);
    half.castShadow = true;
    this.bellHalf.add(half);
    const seam = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), glow);
    seam.rotation.y = Math.PI / 2;
    seam.position.y = 0.27;
    this.bellHalf.add(seam);
    this.bellHalf.position.copy(this.altar).setY(this.altar.y + 1.25);
    this.bellHalf.rotation.y = yawC;
    this.group.add(this.bellHalf);
    // Candelabra ringing the choir.
    for (let i = 0; i < 6; i += 1) {
      const ang = (i / 6) * Math.PI * 2 + 0.5;
      const p = ca.pos.clone().add(new THREE.Vector3(Math.sin(ang) * 15, 0, Math.cos(ang) * 15));
      const n = this.path.nearest(p.x, p.z);
      if (Math.abs(n.lateral) > n.sample.width / 2 - 1) continue;
      kit.add(m.ironDark, place(lathe([[0.2, 0], [0.06, 0.2], [0.05, 1.9], [0.4, 2.0], [0.0001, 2.05]], 8), p.x, ca.pos.y - 0.3, p.z));
      this.torches.push({ pos: new THREE.Vector3(p.x, ca.pos.y + 2.1, p.z), zone: 'choir', s: n.sample.s });
      this.obstacles.push({ x: p.x, z: p.z, r: 0.5 });
    }
    // Entrance portal at the start of the nave.
    const na = this.path.at(nave - 2);
    kit.add(stone, place(archFrame(na.width + 1, 11, 3, 2.4), na.pos.x, na.pos.y - 0.4, na.pos.z, Math.atan2(na.tangent.x, na.tangent.z)));
    for (const side of [-1, 1]) {
      const tp = na.pos.clone().addScaledVector(na.right, side * (na.width / 2 + 4));
      const tb = this.footY(tp, 2) - 0.5;
      kit.add(stone, place(worldBox(4, 26, 4, 3), tp.x, tb + 13, tp.z, Math.atan2(na.tangent.x, na.tangent.z)));
      kit.add(stone, place(spire(3, 12, 4), tp.x, tb + 26, tp.z, Math.PI / 4));
    }
    void end;
    kit.build(this.group, 'saint-merrow');
  }

  /** The Founder Merrow: a stone hand the size of a hill, reaching out of the mere. */
  private founderHand(): void {
    const kit = new Kit();
    const mat = Mats().stone.clone();
    mat.color.set('#6a7470');
    const o = new THREE.Vector3(-300, MARSH_WATER - 20, -460);
    kit.add(mat, place(prep(new THREE.CylinderGeometry(26, 34, 90, 12)), o.x, o.y + 30, o.z, 0, 1, 1, 0.6, 0.15));
    kit.add(mat, place(prep(new THREE.SphereGeometry(34, 14, 10)), o.x, o.y + 80, o.z + 8, 0, 1.15, 0.9, 0.55, 0.15));
    const fingers: Array<[number, number, number]> = [[-24, 46, -0.35], [-9, 58, -0.12], [6, 62, 0.04], [21, 54, 0.2], [34, 26, 0.9]];
    for (const [fx, len, rz] of fingers) {
      let p = new THREE.Vector3(o.x + fx, o.y + 104, o.z + 10);
      let ang = rz;
      for (let seg = 0; seg < 3; seg += 1) {
        const l = len / 3;
        const g = prep(new THREE.CylinderGeometry(5.2 - seg * 0.9, 6 - seg * 0.9, l, 9));
        const dir = new THREE.Vector3(Math.sin(-ang), Math.cos(ang), 0.25 + seg * 0.25).normalize();
        const mid = p.clone().addScaledVector(dir, l / 2);
        const qn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        g.applyQuaternion(qn);
        g.translate(mid.x, mid.y, mid.z);
        kit.add(mat, g);
        kit.add(mat, place(prep(new THREE.SphereGeometry(6 - seg * 0.9, 9, 7)), p.x, p.y, p.z));
        p = p.clone().addScaledVector(dir, l);
        ang += 0.12;
      }
    }
    kit.build(this.group, 'founder-merrow', false);
  }

  update(dt: number, time: number): void {
    flowWater(this.water, dt);
    this.eye.material.opacity = 0.65 + Math.sin(time * 0.5) * 0.2;
    for (const g of this.glows) g.emissiveIntensity = 1.6 + Math.sin(time * 2.2) * 0.6;
    if (this.bellHalf.parent) this.bellHalf.position.y = this.altar.y + 1.25 + Math.sin(time * 1.3) * 0.05;
  }
}
