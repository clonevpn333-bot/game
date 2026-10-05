import * as THREE from 'three';
import { Path } from './Path';
import { Terrain, type TorchSpot } from './Terrain';
import { Mats } from './Materials';
import { Tex } from './Textures';
import { archFrame, lathe, merge, place, prep, rockGeo, spire, worldBox } from './geo';
import { createSeededRandom } from '../utils/random';
import { barkMaterial, broadleafTree, deadTree, firTree, foliageMaterial, forest, leafTex, needleTex } from './Trees';

/** Chapter II world: the Witchwood, the stilt hamlet, the chapel ruins and the Ribs of Harrowmere. */
export class Witchwood {
  readonly group = new THREE.Group();
  readonly torches: TorchSpot[] = [];
  readonly obstacles: Array<{ x: number; z: number; r: number }> = [];
  readonly arenaCenter = new THREE.Vector3();
  readonly skullAltar = new THREE.Vector3();
  readonly perch = new THREE.Vector3();
  readonly cages: THREE.Object3D[] = [];
  readonly burnables: THREE.Mesh[] = [];
  private readonly rng = createSeededRandom(909);
  private readonly velmourEye: THREE.Sprite;

  constructor(
    private readonly path: Path,
    private readonly terrain: Terrain,
  ) {
    this.group.name = 'witchwood';
    this.forest();
    this.hamlet();
    this.chapel();
    this.boneArches();
    this.ribs();
    this.totems();
    this.velmourEye = this.distantVelmour();
  }

  private spot(s: number, lateral: number): THREE.Vector3 {
    const a = this.path.at(s);
    return a.pos.clone().addScaledVector(a.right, lateral);
  }

  // ------------------------------------------------------------------ forest
  private forest(): void {
    const trees = forest([
      ...[0, 1, 2].map((i) => ({ geo: broadleafTree(500 + i * 11, 20 + i * 3, true, 1.25), wood: barkMaterial(true, '#a09080'), leaves: this.leafMat, shadow: true })),
      ...[0, 1].map((i) => ({ geo: firTree(600 + i * 5, 18 + i * 4), wood: barkMaterial(true, '#9a8a7a'), leaves: foliageMaterial(needleTex([22, 48, 38]), '#8aa898', 'wfir'), shadow: false })),
      { geo: deadTree(700, 14), wood: barkMaterial(false, '#d8d4c8'), leaves: null, shadow: true },
    ]);
    const shroomGeo = merge([
      place(new THREE.CylinderGeometry(0.06, 0.09, 0.4, 6), 0, 0.2, 0),
      place(lathe([[0.32, 0], [0.28, 0.12], [0.16, 0.22], [0, 0.25]], 8), 0, 0.36, 0),
    ]);
    const shroomMat = new THREE.MeshStandardMaterial({ color: '#0a1a18', emissive: '#4affc8', emissiveIntensity: 1.8, roughness: 0.6 });
    const fernGeo = merge([0, 1, 2].map((i) => place(new THREE.PlaneGeometry(1.4, 1.1), 0, 0.5, 0, (i / 3) * Math.PI, 1, 1, 1, -0.2)));
    const fernMat = foliageMaterial(leafTex([40, 90, 50], 'fern'), '#c8e0c0', 'fern', 0.05);
    const rockG = rockGeo(8, 2);
    rockG.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rockG.attributes.position.count * 3).fill(0.8), 3));
    const mossRock = new THREE.MeshStandardMaterial({ map: Tex.rock(), bumpMap: Tex.rock(), bumpScale: 4, color: '#6a8a64', vertexColors: true, roughness: 1 });

    type Set = { geo: THREE.BufferGeometry; mat: THREE.Material; list: THREE.Matrix4[]; shadow: boolean };
    const sets: Set[] = [
      { geo: shroomGeo, mat: shroomMat, list: [], shadow: false },
      { geo: fernGeo, mat: fernMat, list: [], shadow: false },
      { geo: rockG, mat: mossRock, list: [], shadow: true },
    ];
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const mtx = (p: THREE.Vector3, s: number, sy = s, tilt = 0) => {
      e.set((this.rng() - 0.5) * tilt, this.rng() * Math.PI * 2, (this.rng() - 0.5) * tilt);
      q.setFromEuler(e);
      return new THREE.Matrix4().compose(p, q, new THREE.Vector3(s, sy, s));
    };
    const put = (set: number, p: THREE.Vector3, s: number, sy = s, tilt = 0) => sets[set].list.push(mtx(p, s, sy, tilt));
    const box = new THREE.Box3().setFromPoints(this.path.samples.map((s) => s.pos));
    for (let i = 0; i < 1700; i += 1) {
      const x = box.min.x - 220 + this.rng() * (box.max.x - box.min.x + 440);
      const z = box.min.z - 220 + this.rng() * (box.max.z - box.min.z + 440);
      const { d, index } = this.path.distanceXZ(x, z, 6);
      const sample = this.path.samples[index];
      const hw = sample.width / 2;
      if (d < hw + 4) continue;
      if (sample.zone === 'ribs' && d < hw + 30) continue;
      if (sample.zone === 'hamlet' && d < hw + 10) continue;
      const y = this.terrain.groundAt(x, z);
      const slope = this.terrain.slopeAt(x, z);
      const r = this.rng();
      if (d < 22 && r < 0.35) put(1, new THREE.Vector3(x, y - 0.1, z), 0.9 + this.rng() * 0.9);
      else if (r < 0.66) {
        // Gnarled giants near the path; cheap firs fill the distance.
        const kind = d > 110 ? 3 + Math.floor(this.rng() * 2) : this.rng() < 0.62 ? Math.floor(this.rng() * 3) : this.rng() < 0.75 ? 3 + Math.floor(this.rng() * 2) : 5;
        const sc = 0.75 + this.rng() * 0.5;
        trees.add(kind, mtx(new THREE.Vector3(x, y - 0.4 - slope * 1.3 * sc, z), sc), d < 45);
        if (d < 60) this.obstacles.push({ x, z, r: kind < 3 ? 1.6 * sc : 0.6 });
      } else if (r < 0.88) put(2, new THREE.Vector3(x, y - 0.6 - slope, z), 1 + this.rng() * 2.5, 0.8 + this.rng() * 1.5, 0.4);
    }
    // Glowing mushroom rings near the path: the witches' waymarks.
    for (const s of this.path.samples) {
      if (Math.round(s.s) % 7 !== 0 || this.rng() > 0.7) continue;
      const side = this.rng() < 0.5 ? -1 : 1;
      const c = s.pos.clone().addScaledVector(s.right, side * (s.width / 2 + 1.5 + this.rng() * 4));
      const n = 3 + Math.floor(this.rng() * 5);
      for (let k = 0; k < n; k += 1) {
        const a = (k / n) * Math.PI * 2;
        const px = c.x + Math.cos(a) * 0.9;
        const pz = c.z + Math.sin(a) * 0.9;
        put(0, new THREE.Vector3(px, this.terrain.groundAt(px, pz) - 0.05, pz), 0.5 + this.rng() * 0.9);
      }
      if (this.rng() < 0.4) put(1, c.clone().setY(this.terrain.groundAt(c.x, c.z) - 0.1), 1);
    }
    for (const set of sets) {
      if (!set.list.length) continue;
      const inst = new THREE.InstancedMesh(set.geo, set.mat, set.list.length);
      set.list.forEach((mm, i) => inst.setMatrixAt(i, mm));
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = set.shadow;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      this.group.add(inst);
    }
    trees.build(this.group);
  }

  private readonly leafMat = foliageMaterial(leafTex([34, 70, 46], 'witchleaf'), '#b8d0c0', 'witchleaf', 0.005);

  // ------------------------------------------------------------------ the stilt hamlet
  private hamlet(): void {
    const parts: Record<'wood' | 'thatch' | 'stone', THREE.BufferGeometry[]> = { wood: [], thatch: [], stone: [] };
    const c = this.spot(this.path.zoneStart('hamlet') + 26, 0);
    const huts: Array<[number, number]> = [[-1, 13], [1, 15], [-1, -6], [1, -10], [-1, 30]];
    for (const [side, ds] of huts) {
      const s = this.path.at(this.path.zoneStart('hamlet') + ds + 14);
      const p = s.pos.clone().addScaledVector(s.right, side * (s.width / 2 + 5));
      const yaw = Math.atan2(-s.tangent.z, s.tangent.x) + this.rng() * 0.4;
      const y = s.pos.y;
      for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) {
        const lp = new THREE.Vector3(dx, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        parts.wood.push(place(worldBox(0.4, 4.5, 0.4, 2), p.x + lp.x, y + 1.6, p.z + lp.z, yaw, 1, 1, 1, (this.rng() - 0.5) * 0.15));
      }
      parts.wood.push(place(worldBox(5.2, 0.4, 5.2, 2), p.x, y + 3.6, p.z, yaw));
      parts.wood.push(place(prep(new THREE.CylinderGeometry(2.4, 2.6, 3.2, 8)), p.x, y + 5.4, p.z, yaw));
      parts.thatch.push(place(spire(3.6, 4.6, 8), p.x, y + 6.9, p.z, yaw, 1, 1, 1, (this.rng() - 0.5) * 0.2));
      // Ladder.
      const lp = new THREE.Vector3(0, 0, -side * 3.2).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      parts.wood.push(place(worldBox(0.8, 4.2, 0.15, 1), p.x + lp.x, y + 1.8, p.z + lp.z, yaw, 1, 1, 1, side * 0.35));
      this.torches.push({ pos: new THREE.Vector3(p.x, y + 5.2, p.z).addScaledVector(s.right, -side * 2.6), zone: 'hamlet', s: s.s });
      this.obstacles.push({ x: p.x, z: p.z, r: 3 });
    }
    // Standing stones around a black pool in the hamlet's heart.
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2;
      const p = c.clone().add(new THREE.Vector3(Math.cos(a) * 8, 0, Math.sin(a) * 8));
      parts.stone.push(place(worldBox(1.1, 3 + this.rng() * 1.8, 0.7, 2), p.x, p.y + 1.3, p.z, -a, 1, 1, 1, (this.rng() - 0.5) * 0.2));
      this.obstacles.push({ x: p.x, z: p.z, r: 0.9 });
    }
    const pool = new THREE.Mesh(new THREE.CircleGeometry(4.5, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#040a0a', metalness: 0.6, roughness: 0.05 }));
    pool.position.copy(c).setY(c.y + 0.08);
    this.group.add(pool);
    this.obstacles.push({ x: c.x, z: c.z, r: 4.6 });
    this.torches.push({ pos: c.clone().setY(c.y + 1.2), zone: 'hamlet', s: 0 });
    const thatch = new THREE.MeshStandardMaterial({ map: Tex.wood(), color: '#8a7448', roughness: 1 });
    const mats = { wood: Mats().wood, thatch, stone: Mats().stoneDark };
    for (const key of Object.keys(parts) as Array<keyof typeof parts>) {
      const mesh = new THREE.Mesh(merge(parts[key]), mats[key]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  // ------------------------------------------------------------------ chapel ruins
  private chapel(): void {
    const parts: THREE.BufferGeometry[] = [];
    const s0 = this.path.zoneStart('chapel');
    for (let i = 0; i < 9; i += 1) {
      const s = this.path.at(s0 + 4 + i * 6);
      const yaw = Math.atan2(-s.tangent.z, s.tangent.x);
      for (const side of [-1, 1]) {
        if (this.rng() < 0.25) continue;
        const p = s.pos.clone().addScaledVector(s.right, side * (s.width / 2 + 1.5));
        const h = 2 + this.rng() * 7;
        parts.push(place(worldBox(5.5, h, 1.2, 4), p.x, s.pos.y + h / 2 - 0.5, p.z, yaw, 1, 1, 1, 0, (this.rng() - 0.5) * 0.08));
        if (i % 3 === 1) parts.push(place(archFrame(2.4, 4.4, 1.3, 0.8), p.x, s.pos.y, p.z, yaw));
      }
    }
    // Broken apse and a toppled saint.
    const end = this.path.at(s0 + 50);
    parts.push(place(archFrame(6, 9, 1.6, 1.5), end.pos.x, end.pos.y, end.pos.z, Math.atan2(end.tangent.x, end.tangent.z) - Math.PI / 2 + Math.PI / 2));
    const saint = end.pos.clone().addScaledVector(end.right, 6).addScaledVector(end.tangent, -8);
    parts.push(place(lathe([[1.0, 0], [0.9, 1.2], [0.7, 2.6], [0.3, 3.0], [0.5, 3.4], [0, 3.8]], 8), saint.x, saint.y + 0.8, saint.z, 0, 1, 1, 1, Math.PI / 2 - 0.2));
    this.obstacles.push({ x: saint.x, z: saint.z, r: 2 });
    const mesh = new THREE.Mesh(merge(parts), Mats().stone);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  /** Lesser ribs arching over the path: you walk through the skeleton of something enormous. */
  private boneArches(): void {
    const parts: THREE.BufferGeometry[] = [];
    const ribsStart = this.path.zoneStart('ribs');
    for (let k = 0; k < 6; k += 1) {
      const s = this.path.at(ribsStart - 70 + k * 10);
      const l = s.pos.clone().addScaledVector(s.right, -(s.width / 2 + 2));
      const r = s.pos.clone().addScaledVector(s.right, s.width / 2 + 2);
      const top = s.pos.clone().setY(s.pos.y + 12 + k);
      const c = new THREE.CatmullRomCurve3([l.clone().setY(l.y - 1), l.clone().lerp(top, 0.5).setY(top.y - 2).addScaledVector(s.right, -2), top, r.clone().lerp(top, 0.5).setY(top.y - 3).addScaledVector(s.right, 2), r.clone().setY(r.y - 1)]);
      parts.push(prep(new THREE.TubeGeometry(c, 24, 0.7, 7)));
    }
    const mesh = new THREE.Mesh(merge(parts), Mats().bone);
    mesh.castShadow = true;
    this.group.add(mesh);
  }

  // ------------------------------------------------------------------ the Ribs of Harrowmere
  private ribs(): void {
    const a = this.path.at(this.path.zoneStart('ribs') + 40);
    this.arenaCenter.copy(a.pos);
    const parts: THREE.BufferGeometry[] = [];
    // Eight colossal ribs curving up from the west and over the arena.
    for (let i = 0; i < 8; i += 1) {
      const z = a.pos.z + 34 - i * 11;
      const h = 34 + Math.sin(i * 0.5) * 8;
      const c = new THREE.CatmullRomCurve3([
        new THREE.Vector3(a.pos.x - 40, a.pos.y - 8, z),
        new THREE.Vector3(a.pos.x - 34, a.pos.y + h * 0.7, z + 2),
        new THREE.Vector3(a.pos.x - 10, a.pos.y + h, z + 4),
        new THREE.Vector3(a.pos.x + 18, a.pos.y + h * 0.82, z + 5),
        new THREE.Vector3(a.pos.x + 32, a.pos.y + h * 0.3, z + 3),
        new THREE.Vector3(a.pos.x + 36, a.pos.y - 6, z),
      ]);
      parts.push(prep(new THREE.TubeGeometry(c, 40, 2.6 - i * 0.12, 9)));
    }
    // Spine along the west.
    const spine = new THREE.CatmullRomCurve3([
      new THREE.Vector3(a.pos.x - 44, a.pos.y - 4, a.pos.z + 70),
      new THREE.Vector3(a.pos.x - 42, a.pos.y + 4, a.pos.z),
      new THREE.Vector3(a.pos.x - 40, a.pos.y, a.pos.z - 70),
    ]);
    parts.push(prep(new THREE.TubeGeometry(spine, 40, 5, 10)));
    for (let i = 0; i < 14; i += 1) {
      const p = spine.getPoint(i / 13);
      parts.push(place(prep(new THREE.ConeGeometry(2.2, 8, 6)), p.x + 2, p.y + 6, p.z, 0, 1, 1, 1, 0, 0.4));
    }
    // The skull at the far end: an altar where Mother Sallow is bound in thorns.
    const skullC = this.path.samples[this.path.samples.length - 1].pos.clone().addScaledVector(a.tangent, 22);
    parts.push(place(prep(new THREE.SphereGeometry(16, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.7)), skullC.x, skullC.y + 2, skullC.z - 6, 0, 1.2, 0.9, 1.4));
    parts.push(place(prep(new THREE.CylinderGeometry(8, 11, 20, 12, 1, true)), skullC.x, skullC.y + 3, skullC.z + 12, 0, 1, 1, 0.8, Math.PI / 2 - 0.1));
    for (const sx of [-1, 1]) {
      parts.push(place(prep(new THREE.TorusGeometry(4.5, 1.6, 7, 14)), skullC.x + sx * 7, skullC.y + 8, skullC.z + 7, sx * 0.3, 1, 1, 1));
      const horn = new THREE.CatmullRomCurve3([
        new THREE.Vector3(skullC.x + sx * 12, skullC.y + 12, skullC.z - 4),
        new THREE.Vector3(skullC.x + sx * 22, skullC.y + 22, skullC.z - 14),
        new THREE.Vector3(skullC.x + sx * 26, skullC.y + 18, skullC.z - 30),
        new THREE.Vector3(skullC.x + sx * 22, skullC.y + 28, skullC.z - 40),
      ]);
      parts.push(prep(new THREE.TubeGeometry(horn, 20, 2.2, 8)));
    }
    for (let i = 0; i < 9; i += 1) {
      parts.push(place(prep(new THREE.ConeGeometry(1.1, 6, 6)), skullC.x - 8 + i * 2, skullC.y - 4, skullC.z + 22, 0, 1, 1, 1, Math.PI));
    }
    this.perch.set(skullC.x, skullC.y + 17, skullC.z - 4);
    this.skullAltar.copy(this.path.samples[this.path.samples.length - 1].pos).addScaledVector(a.tangent, 4);
    const bone = new THREE.Mesh(merge(parts), Mats().bone);
    bone.castShadow = true;
    bone.receiveShadow = true;
    bone.name = 'ribs-of-harrowmere';
    this.group.add(bone);
    // Thorn spirals binding the altar.
    const thorns: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 3; k += 1) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i < 30; i += 1) {
        const t = i / 29;
        const ang = t * Math.PI * 6 + k * 2.1;
        pts.push(new THREE.Vector3(this.skullAltar.x + Math.cos(ang) * (1.1 + t * 0.3), this.skullAltar.y + t * 3.4, this.skullAltar.z + Math.sin(ang) * (1.1 + t * 0.3)));
      }
      thorns.push(prep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.08, 4)));
      for (let i = 0; i < 18; i += 1) {
        const p = pts[Math.floor(this.rng() * pts.length)];
        thorns.push(place(prep(new THREE.ConeGeometry(0.04, 0.3, 4)), p.x, p.y, p.z, this.rng() * 6, 1, 1, 1, this.rng() * 3));
      }
    }
    const thornMesh = new THREE.Mesh(merge(thorns), new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.9 }));
    thornMesh.name = 'thorns';
    this.group.add(thornMesh);
    this.thornMesh = thornMesh;
    // Charred trees and braziers of witch-fire ringing the basin.
    for (let i = 0; i < 8; i += 1) {
      const ang = (i / 8) * Math.PI * 2;
      const p = a.pos.clone().add(new THREE.Vector3(Math.cos(ang) * 21, 0, Math.sin(ang) * 21));
      const near = this.path.nearest(p.x, p.z);
      if (Math.abs(near.lateral) > near.sample.width / 2 - 1) continue;
      const brazier = new THREE.Mesh(lathe([[0.15, 0], [0.12, 1.1], [0.7, 1.3], [0.8, 1.8], [0, 1.5]], 8), Mats().ironDark);
      brazier.position.copy(near.sample.pos).addScaledVector(near.sample.right, near.lateral).add(new THREE.Vector3(p.x - near.sample.pos.x - near.sample.right.x * near.lateral, 0, p.z - near.sample.pos.z - near.sample.right.z * near.lateral));
      brazier.position.y = near.sample.pos.y;
      this.group.add(brazier);
      this.torches.push({ pos: brazier.position.clone().setY(brazier.position.y + 2.1), zone: 'ribs', s: near.sample.s });
      this.obstacles.push({ x: brazier.position.x, z: brazier.position.z, r: 0.8 });
    }
  }

  thornMesh: THREE.Mesh | null = null;

  /** Bone-and-antler effigies with witch lanterns and hanging cages along the path. */
  private totems(): void {
    const parts: THREE.BufferGeometry[] = [];
    const boneParts: THREE.BufferGeometry[] = [];
    const cageParts: THREE.BufferGeometry[] = [];
    for (let s = 30; s < this.path.zoneStart('ribs') - 10; s += 26 + this.rng() * 18) {
      const a = this.path.at(s);
      if (a.zone === 'hamlet') continue;
      const side = this.rng() < 0.5 ? -1 : 1;
      const p = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 1.2));
      parts.push(place(prep(new THREE.CylinderGeometry(0.1, 0.14, 3.4, 5)), p.x, p.y + 1.7, p.z, 0, 1, 1, 1, (this.rng() - 0.5) * 0.2));
      parts.push(place(worldBox(1.6, 0.12, 0.12, 1), p.x, p.y + 2.7, p.z, this.rng() * 3));
      boneParts.push(place(prep(new THREE.SphereGeometry(0.26, 8, 6)), p.x, p.y + 3.5, p.z, 0, 1, 1.15, 1.3));
      for (const sx of [-1, 1]) {
        const c = new THREE.CatmullRomCurve3([
          new THREE.Vector3(p.x + sx * 0.15, p.y + 3.7, p.z),
          new THREE.Vector3(p.x + sx * 0.7, p.y + 4.3, p.z - 0.2),
          new THREE.Vector3(p.x + sx * 0.9, p.y + 5.0, p.z + 0.1),
          new THREE.Vector3(p.x + sx * 1.3, p.y + 5.3, p.z - 0.2),
        ]);
        boneParts.push(prep(new THREE.TubeGeometry(c, 8, 0.05, 4)));
      }
      this.torches.push({ pos: new THREE.Vector3(p.x, p.y + 2.5, p.z).addScaledVector(a.tangent, 0.7), zone: 'wood', s });
      // A hanging cage from an overhanging limb, every other totem.
      if (this.rng() < 0.5) {
        const cp = a.pos.clone().addScaledVector(a.right, -side * (a.width / 2 + 2)).setY(a.pos.y + 4.5);
        for (let k = 0; k < 8; k += 1) {
          const ang = (k / 8) * Math.PI * 2;
          cageParts.push(place(prep(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 3)), cp.x + Math.cos(ang) * 0.5, cp.y, cp.z + Math.sin(ang) * 0.5));
        }
        cageParts.push(place(prep(new THREE.ConeGeometry(0.6, 0.5, 8)), cp.x, cp.y + 1.1, cp.z));
        cageParts.push(place(prep(new THREE.CylinderGeometry(0.02, 0.02, 4, 3)), cp.x, cp.y + 3.2, cp.z));
        boneParts.push(place(prep(new THREE.SphereGeometry(0.16, 6, 5)), cp.x, cp.y - 0.6, cp.z));
      }
    }
    const pole = new THREE.Mesh(merge(parts), Mats().wood);
    const bones = new THREE.Mesh(merge(boneParts), Mats().bone);
    const cages = new THREE.Mesh(merge(cageParts), Mats().ironDark);
    for (const mesh of [pole, bones, cages]) {
      mesh.castShadow = true;
      this.group.add(mesh);
    }
  }

  /** Velmour on the far eastern horizon, its Founder's eye burning gold. */
  private distantVelmour(): THREE.Sprite {
    const g = new THREE.Group();
    const parts: THREE.BufferGeometry[] = [];
    const o = new THREE.Vector3(2100, 0, -900);
    parts.push(place(prep(new THREE.ConeGeometry(420, 520, 9)), o.x, o.y + 120, o.z));
    for (let i = 0; i < 14; i += 1) {
      const x = o.x - 120 + i * 18;
      const h = 60 + this.rng() * 120;
      parts.push(place(prep(new THREE.CylinderGeometry(4, 5, h, 6)), x, o.y + 380 + h / 2, o.z + (this.rng() - 0.5) * 60));
      parts.push(place(spire(6, 40, 6), x, o.y + 380 + h, o.z));
    }
    const geo = merge(parts);
    const mat = new THREE.MeshBasicMaterial({ color: '#0c1410', fog: false });
    g.add(new THREE.Mesh(geo, mat));
    const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.radial('rgba(255,200,90,1)', 'rgba(255,120,20,0)', 'veye'), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    eye.position.set(o.x - 300, o.y + 250, o.z + 80);
    eye.scale.setScalar(260);
    g.add(eye);
    this.group.add(g);
    return eye;
  }

  update(time: number): void {
    this.velmourEye.material.opacity = 0.65 + Math.sin(time * 0.5) * 0.2;
  }
}
