import * as THREE from 'three';
import { Path } from './Path';
import { Terrain, type TorchSpot } from './Terrain';
import { Mats } from './Materials';
import { archFrame, gableRoof, lathe, place, prep, rockGeo, spire, worldBox } from './geo';
import { Kit, Scatter, mtx, velmourOnHorizon } from './Kit';
import { barkMaterial, deadTree, firTree, foliageMaterial, forest, needleTex } from './Trees';
import { createSeededRandom } from '../utils/random';

/**
 * Chapter IV world: the Frostspine. A snow canyon, the frozen last camp of the Bell Guard, a
 * knife-edge ridge over nothing, and the Hollow Fort where Ser Ivarr keeps the second half of the bell.
 */
export class Frostspine {
  readonly group = new THREE.Group();
  readonly torches: TorchSpot[] = [];
  readonly obstacles: Array<{ x: number; z: number; r: number }> = [];
  readonly arenaCenter = new THREE.Vector3();
  readonly throne = new THREE.Vector3();
  readonly gate = new THREE.Group();
  private readonly rng = createSeededRandom(414);
  private readonly eye: THREE.Sprite;
  private readonly snowMat: THREE.MeshStandardMaterial;
  private readonly flags: THREE.Mesh[] = [];

  constructor(
    private readonly path: Path,
    private readonly terrain: Terrain,
  ) {
    this.group.name = 'frostspine';
    this.snowMat = new THREE.MeshStandardMaterial({ color: '#b4bed0', roughness: 0.92 });
    this.wilds();
    this.passMarkers();
    this.camp();
    this.ridge();
    this.fort();
    this.eye = velmourOnHorizon(this.group, new THREE.Vector3(-1500, -60, 400), 1.0, '#141a26');
  }

  private footY(p: THREE.Vector3, r: number): number {
    let y = Infinity;
    for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) y = Math.min(y, this.terrain.groundAt(p.x + dx, p.z + dz));
    return y;
  }

  // ------------------------------------------------------------------ snow firs, boulders, drifts
  private wilds(): void {
    const snowNeedles = foliageMaterial(needleTex([150, 166, 172]), '#e8eef8', 'snowfir', 0.003);
    const darkNeedles = foliageMaterial(needleTex([30, 52, 46]), '#b0c4c8', 'frostfir', 0.003);
    const bark = barkMaterial(true, '#8a8078');
    const trees = forest([
      { geo: firTree(801, 16), wood: bark, leaves: snowNeedles, shadow: true },
      { geo: firTree(802, 20), wood: bark, leaves: darkNeedles, shadow: true },
      { geo: firTree(803, 12), wood: bark, leaves: snowNeedles, shadow: true },
      { geo: deadTree(804, 9), wood: barkMaterial(false, '#b8b4b0'), leaves: null, shadow: true },
    ]);
    const sc = new Scatter();
    const rockMat = new THREE.MeshStandardMaterial({ map: Mats().rock.map, bumpMap: Mats().rock.map, bumpScale: 4, color: '#8a90a0', roughness: 0.9 });
    const rocks = sc.set(rockGeo(41, 2), rockMat, true);
    const drift = sc.set(prep(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), this.snowMat, false);
    const capG = prep(new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2));
    const caps = sc.set(capG, this.snowMat, false);
    const box = new THREE.Box3().setFromPoints(this.path.samples.map((s) => s.pos));
    for (let i = 0; i < 3600; i += 1) {
      const x = box.min.x - 260 + this.rng() * (box.max.x - box.min.x + 520);
      const z = box.min.z - 220 + this.rng() * (box.max.z - box.min.z + 440);
      const { d, index } = this.path.distanceXZ(x, z, 6);
      const s = this.path.samples[index];
      const hw = s.width / 2;
      if (d < hw + 2.5) continue;
      if ((s.zone === 'fort' || s.zone === 'camp') && d < hw + 8) continue;
      const y = this.terrain.groundAt(x, z);
      const slope = this.terrain.slopeAt(x, z);
      const r = this.rng();
      if (slope < 0.9 && r < 0.5) {
        const kind = this.rng() < 0.12 ? 3 : Math.floor(this.rng() * 3);
        const k = 0.7 + this.rng() * 0.6;
        trees.add(kind, mtx(new THREE.Vector3(x, y - 0.4 - slope * 1.2 * k, z), this.rng() * 6, k), d < 50);
        if (d < hw + 8) this.obstacles.push({ x, z, r: 0.8 });
      } else if (r < 0.7 && slope < 1.1) {
        // Boulders sunk by their size and the slope, so the downhill side never hangs in the air.
        const k = 0.8 + this.rng() * 2.6;
        const sy = 0.6 + this.rng();
        const ry = this.rng() * 6;
        const base = y - 0.3 * sy - slope * k * 0.7;
        sc.add(rocks, mtx(new THREE.Vector3(x, base, z), ry, k, sy, 0.3));
        if (base + sy * 0.6 > y) sc.add(caps, mtx(new THREE.Vector3(x, base + sy * 0.55, z), ry, k * 0.8, 0.28 * sy));
      } else if (r < 0.85 && slope < 0.6) sc.add(drift, mtx(new THREE.Vector3(x, y - 0.2, z), this.rng() * 6, 1.5 + this.rng() * 3, 0.3 + this.rng() * 0.4));
    }
    // Drifts banked against the path edges.
    for (const s of this.path.samples) {
      if (this.rng() > 0.5 || s.zone === 'fort') continue;
      for (const side of [-1, 1]) {
        const p = s.pos.clone().addScaledVector(s.right, side * (s.width / 2 + 1 + this.rng() * 2));
        sc.add(drift, mtx(p.setY(this.terrain.groundAt(p.x, p.z) - 0.1), this.rng() * 6, 1 + this.rng() * 1.6, 0.25 + this.rng() * 0.35));
      }
    }
    sc.build(this.group);
    trees.build(this.group);
  }

  // ------------------------------------------------------------------ the old Bell Guard road
  private passMarkers(): void {
    const kit = new Kit();
    const m = Mats();
    const banner = m.robeRed.clone();
    for (let s = 30; s < this.path.zoneStart('fort') - 20; s += 40) {
      const a = this.path.at(s);
      if (a.zone === 'camp') continue;
      const side = Math.floor(s / 40) % 2 ? 1 : -1;
      const p = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 1.4));
      const y = this.footY(p, 0.6) - 0.2;
      // Waystone carved with the closed eye of the Church.
      kit.add(m.stoneDark, place(worldBox(0.9, 2.4, 0.6, 1.5), p.x, y + 1.2, p.z, Math.atan2(a.tangent.x, a.tangent.z)));
      kit.add(m.stoneDark, place(prep(new THREE.ConeGeometry(0.6, 0.6, 4)), p.x, y + 2.7, p.z, Math.PI / 4));
      kit.add(this.snowMat, place(prep(new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2)), p.x, y + 2.4, p.z, 0, 1.1, 0.4, 0.8));
      // A torn Bell Guard banner on a spear.
      const bp = a.pos.clone().addScaledVector(a.right, -side * (a.width / 2 + 1.6));
      const by = this.footY(bp, 0.3) - 0.3;
      kit.add(m.wood, place(prep(new THREE.CylinderGeometry(0.05, 0.06, 4.4, 5)), bp.x, by + 2.2, bp.z, 0, 1, 1, 1, 0.08, -0.05));
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8, 2, 6).translate(0.45, -0.9, 0), banner);
      flag.position.set(bp.x, by + 4.2, bp.z);
      flag.rotation.y = Math.atan2(a.right.x, a.right.z);
      flag.castShadow = true;
      this.flags.push(flag);
      this.group.add(flag);
    }
    kit.build(this.group, 'pass-markers');
  }

  // ------------------------------------------------------------------ the frozen camp
  private camp(): void {
    const kit = new Kit();
    const m = Mats();
    const canvas = m.robeWhite.clone();
    canvas.color.set('#d8ccb4');
    const start = this.path.zoneStart('camp');
    const end = this.path.zoneEnd('camp');
    for (let s = start - 10; s < end + 6; s += 11) {
      for (const side of [-1, 1]) {
        if (this.rng() < 0.2) continue;
        const a = this.path.at(s + this.rng() * 4);
        const lat = side * (a.width / 2 - 4 - this.rng() * 3);
        const p = a.pos.clone().addScaledVector(a.right, lat);
        const yaw = Math.atan2(a.right.x, a.right.z) + (this.rng() - 0.5) * 0.4;
        const y = this.footY(p, 2) - 0.05;
        const tent = gableRoof(4.2, 3.6, 2.6, 0.15);
        kit.add(canvas, place(tent, p.x, y, p.z, yaw));
        kit.add(this.snowMat, place(gableRoof(4.0, 3.4, 2.62, 0.05), p.x, y + 0.08, p.z, yaw, 1, 0.35, 1));
        kit.add(m.wood, place(prep(new THREE.CylinderGeometry(0.06, 0.06, 3.1, 5)), p.x, y + 1.5, p.z));
        this.obstacles.push({ x: p.x, z: p.z, r: 2.1 });
      }
      // A dead campfire with a pot, and a frozen sentry kneeling by it.
      const a = this.path.at(s + 5);
      const fp = a.pos.clone().addScaledVector(a.right, (this.rng() - 0.5) * 6);
      for (let k = 0; k < 7; k += 1) {
        const ang = (k / 7) * Math.PI * 2;
        kit.add(m.stoneDark, place(rockGeo(k + 3, 0), fp.x + Math.cos(ang) * 0.8, a.pos.y - 0.15, fp.z + Math.sin(ang) * 0.8, ang, 0.3, 0.25, 0.3));
      }
      kit.add(m.ironDark, place(lathe([[0.3, 0], [0.38, 0.3], [0.32, 0.5]], 8), fp.x, a.pos.y + 0.6, fp.z));
      kit.add(m.wood, place(worldBox(0.08, 0.08, 1.9, 1), fp.x, a.pos.y + 1.1, fp.z, Math.atan2(a.right.x, a.right.z)));
      if (this.rng() < 0.6) this.torches.push({ pos: new THREE.Vector3(fp.x, a.pos.y + 0.5, fp.z), zone: 'camp', s });
      this.obstacles.push({ x: fp.x, z: fp.z, r: 1.1 });
    }
    // Weapon racks and a supply cart sunk in the snow.
    for (let i = 0; i < 6; i += 1) {
      const a = this.path.at(start + 6 + i * 12);
      const p = a.pos.clone().addScaledVector(a.right, (i % 2 ? 1 : -1) * (a.width / 2 - 1.5));
      const yaw = Math.atan2(a.tangent.x, a.tangent.z);
      kit.add(m.wood, place(worldBox(2.4, 0.12, 0.12, 1), p.x, a.pos.y + 1.2, p.z, yaw + Math.PI / 2));
      for (let k = 0; k < 4; k += 1) {
        const off = (k - 1.5) * 0.5;
        kit.add(m.ironDark, place(prep(new THREE.CylinderGeometry(0.02, 0.02, 2.2, 4)), p.x + Math.sin(yaw + Math.PI / 2) * off, a.pos.y + 0.8, p.z + Math.cos(yaw + Math.PI / 2) * off, 0, 1, 1, 1, 0.2));
      }
      this.obstacles.push({ x: p.x, z: p.z, r: 0.8 });
    }
    kit.build(this.group, 'frozen-camp');
  }

  // ------------------------------------------------------------------ the ridge of cairns
  private ridge(): void {
    const kit = new Kit();
    const m = Mats();
    for (const s of this.path.samples) {
      if (s.zone !== 'ridge' || Math.round(s.s) % 6 !== 0) continue;
      for (const side of [-1, 1]) {
        if (this.rng() < 0.35) continue;
        const p = s.pos.clone().addScaledVector(s.right, side * (s.width / 2 + 0.4));
        kit.add(m.wood, place(prep(new THREE.CylinderGeometry(0.07, 0.08, 1.4, 5)), p.x, s.pos.y + 0.3, p.z, 0, 1, 1, 1, (this.rng() - 0.5) * 0.3));
      }
      if (this.rng() < 0.18) {
        // Cairns for the dead who fell here.
        const p = s.pos.clone().addScaledVector(s.right, (this.rng() < 0.5 ? -1 : 1) * (s.width / 2 - 0.6));
        for (let k = 0; k < 4; k += 1) kit.add(m.stoneDark, place(rockGeo(k + 11, 0), p.x, s.pos.y - 0.2 + k * 0.35, p.z, k, 0.45 - k * 0.08, 0.3, 0.45 - k * 0.08));
      }
    }
    kit.build(this.group, 'ridge');
  }

  // ------------------------------------------------------------------ the Hollow Fort
  private fort(): void {
    const kit = new Kit();
    const m = Mats();
    const wall = m.stone.clone();
    wall.color.set('#9aa0b0');
    const fs = this.path.zoneStart('fort');
    const ga = this.path.at(fs + 4);
    const gy = Math.atan2(ga.tangent.x, ga.tangent.z);
    // Gatehouse: two towers flanking a pointed arch, portcullis raised.
    kit.add(wall, place(archFrame(ga.width + 0.6, 7, 4, 3), ga.pos.x, ga.pos.y - 0.4, ga.pos.z, gy));
    for (const side of [-1, 1]) {
      const tp = ga.pos.clone().addScaledVector(ga.right, side * (ga.width / 2 + 4.5));
      const tb = this.footY(tp, 3) - 0.5;
      kit.add(wall, place(prep(new THREE.CylinderGeometry(3.6, 4, 18, 12)), tp.x, tb + 9, tp.z));
      kit.add(m.slate, place(spire(4.4, 8, 12), tp.x, tb + 18, tp.z));
      // Curtain walls running out from the gate and around the courtyard.
      for (let k = 0; k < 8; k += 1) {
        const a = this.path.at(fs + 8 + k * 10);
        const wp = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 2));
        const wb = this.footY(wp, 2) - 0.5;
        const yaw = Math.atan2(a.tangent.x, a.tangent.z);
        kit.add(wall, place(worldBox(2.6, 10, 10.5, 3), wp.x, wb + 5, wp.z, yaw));
        for (let c = 0; c < 3; c += 1) kit.add(wall, place(worldBox(2.8, 1.4, 1.6, 2), wp.x, wb + 10.6, wp.z, yaw, 1, 1, 1));
        kit.add(this.snowMat, place(worldBox(2.7, 0.3, 10.4, 3), wp.x, wb + 10.1, wp.z, yaw));
        if (k % 2 === 0) this.torches.push({ pos: wp.clone().addScaledVector(a.right, -side * 1.6).setY(a.pos.y + 3.4), zone: 'fort', s: a.s });
      }
    }
    // Courtyard: the arena. The keep and the broken throne at the far end.
    const ca = this.path.at(this.path.zoneStart('fort') + 48);
    this.arenaCenter.copy(ca.pos);
    const last = this.path.samples[this.path.samples.length - 1];
    const keep = last.pos.clone().addScaledVector(last.tangent, 14);
    const ky = Math.atan2(last.tangent.x, last.tangent.z);
    kit.add(wall, place(worldBox(30, 26, 14, 4), keep.x, keep.y + 12, keep.z, ky));
    kit.add(m.slate, place(gableRoof(30, 14, 8, 0.6), keep.x, keep.y + 25, keep.z, ky + Math.PI / 2));
    kit.add(wall, place(archFrame(5, 7, 1.5, 1.2), keep.x - last.tangent.x * 7.2, keep.y - 0.3, keep.z - last.tangent.z * 7.2, ky));
    for (const side of [-1, 1]) {
      const tp = keep.clone().addScaledVector(last.right, side * 15);
      kit.add(wall, place(prep(new THREE.CylinderGeometry(4, 4.4, 34, 12)), tp.x, keep.y + 16, tp.z));
      kit.add(m.slate, place(spire(4.8, 12, 12), tp.x, keep.y + 33, tp.z));
    }
    this.throne.copy(last.pos).addScaledVector(last.tangent, -1);
    kit.add(m.stoneDark, place(worldBox(5, 0.6, 3.5, 2), this.throne.x, this.throne.y + 0.0, this.throne.z, ky));
    kit.add(m.stoneDark, place(worldBox(1.8, 1.0, 1.4, 2), this.throne.x, this.throne.y + 0.8, this.throne.z, ky));
    kit.add(m.stoneDark, place(worldBox(1.8, 3.2, 0.4, 2), this.throne.x + last.tangent.x * 0.7, this.throne.y + 1.9, this.throne.z + last.tangent.z * 0.7, ky));
    // The great alarm bell of the fort, fallen and cracked in the courtyard.
    const bp = ca.pos.clone().addScaledVector(ca.right, -11).addScaledVector(ca.tangent, 6);
    kit.add(m.bronze, place(lathe([[0.0001, 2.4], [1.1, 2.3], [1.5, 1.0], [2.2, -0.6], [2.4, -0.8], [0.0001, -0.6]], 16), bp.x, ca.pos.y + 1.0, bp.z, 0.4, 1, 1, 1, 1.2, 0.2));
    this.obstacles.push({ x: bp.x, z: bp.z, r: 2.4 });
    // Braziers around the courtyard.
    for (let i = 0; i < 6; i += 1) {
      const ang = (i / 6) * Math.PI * 2 + 0.3;
      const p = ca.pos.clone().add(new THREE.Vector3(Math.sin(ang) * 15, 0, Math.cos(ang) * 15));
      const n = this.path.nearest(p.x, p.z);
      if (Math.abs(n.lateral) > n.sample.width / 2 - 1) continue;
      kit.add(m.ironDark, place(lathe([[0.15, 0], [0.12, 1.1], [0.6, 1.25], [0.66, 1.6], [0.0001, 1.45]], 8), p.x, ca.pos.y - 0.3, p.z));
      this.torches.push({ pos: new THREE.Vector3(p.x, ca.pos.y + 1.8, p.z), zone: 'fort', s: n.sample.s });
      this.obstacles.push({ x: p.x, z: p.z, r: 0.7 });
    }
    kit.build(this.group, 'hollow-fort');
    // Gate doors (a separate group so the chapter can open them).
    const doorMat = m.wood.clone();
    doorMat.color.set('#6a5444');
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.copy(ga.pos).addScaledVector(ga.right, side * (ga.width / 2 + 0.3));
      pivot.position.y -= 0.3;
      pivot.rotation.y = gy;
      const door = new THREE.Mesh(worldBox(ga.width / 2 + 0.3, 6.6, 0.4, 2), doorMat);
      door.position.set(-side * (ga.width / 4 + 0.15), 3.3, 0);
      door.castShadow = true;
      pivot.add(door);
      pivot.userData.side = side;
      this.gate.add(pivot);
    }
    this.group.add(this.gate);
  }

  /** 0 = shut, 1 = open. */
  setGate(k: number): void {
    for (const p of this.gate.children) p.rotation.y = Math.atan2(this.path.at(this.path.zoneStart('fort') + 4).tangent.x, this.path.at(this.path.zoneStart('fort') + 4).tangent.z) + (p.userData.side as number) * k * 1.6;
  }

  update(time: number): void {
    this.eye.material.opacity = 0.65 + Math.sin(time * 0.5) * 0.2;
    this.flags.forEach((f, i) => {
      f.rotation.z = Math.sin(time * 3 + i) * 0.12;
      f.scale.x = 0.85 + Math.sin(time * 5 + i * 2) * 0.15;
    });
  }
}
