import * as THREE from 'three';
import { Path, type Zone } from './Path';
import { Terrain, type TorchSpot } from './Terrain';
import { Mats } from './Materials';
import { archFrame, lathe, place, prep, rockGeo, spire, worldBox } from './geo';
import { Kit, Scatter, mtx } from './Kit';
import { fbm, ridged, smoothstep } from '../utils/math';
import { createSeededRandom } from '../utils/random';

const CAVE: Zone[] = ['crypt', 'cavern', 'heart'];

/**
 * Chapter V world: the ruined cathedral of Velmour on the Founder's crown, the crypts below it,
 * the bone caverns inside Osseran's skull, and the Heart, where the Hymn must be rung.
 */
export class Hollow {
  readonly group = new THREE.Group();
  readonly torches: TorchSpot[] = [];
  readonly obstacles: Array<{ x: number; z: number; r: number }> = [];
  readonly arenaCenter = new THREE.Vector3();
  readonly heart = new THREE.Vector3();
  readonly crack = new THREE.Vector3();
  private readonly rng = createSeededRandom(515);
  private readonly heartMat: THREE.MeshStandardMaterial;
  private readonly veinMat: THREE.MeshStandardMaterial;
  private heartMesh!: THREE.Mesh;
  /** 1 = awake (pulsing hot), 0 = asleep (cool, slow). */
  wake = 1;

  constructor(
    private readonly path: Path,
    private readonly terrain: Terrain,
  ) {
    this.group.name = 'hollow';
    this.heartMat = new THREE.MeshStandardMaterial({ color: '#3a0a04', emissive: '#ff6a20', emissiveIntensity: 2.5, roughness: 0.5 });
    this.veinMat = new THREE.MeshStandardMaterial({ color: '#2a0804', emissive: '#ff7a30', emissiveIntensity: 2.2, roughness: 0.6 });
    this.ceiling();
    this.sanctum();
    this.crypt();
    this.cavern();
    this.heartChamber();
  }

  private footY(p: THREE.Vector3, r: number): number {
    let y = Infinity;
    for (const [dx, dz] of [[0, 0], [r, r], [-r, r], [r, -r], [-r, -r]]) y = Math.min(y, this.terrain.groundAt(p.x + dx, p.z + dz));
    return y;
  }

  // ------------------------------------------------------------------ the roof of the skull
  private ceiling(): void {
    const caveSamples = this.path.samples.filter((s) => CAVE.includes(s.zone));
    const box = new THREE.Box3().setFromPoints(caveSamples.map((s) => s.pos));
    const pad = 90;
    const x0 = box.min.x - pad;
    const z0 = box.min.z - pad;
    const cell = 6;
    const nx = Math.ceil((box.max.x + pad - x0) / cell);
    const nz = Math.ceil((box.max.z + pad - z0) / cell);
    // Smooth the vault height along the path so zone changes don't leave steps.
    const raw = this.path.samples.map((s) => (s.zone === 'crypt' ? 9 : s.zone === 'heart' ? 46 : s.zone === 'cavern' ? 34 : 9));
    const H = raw.map((_, i) => {
      let a = 0;
      let n = 0;
      for (let k = -14; k <= 14; k += 1) {
        const j = Math.min(raw.length - 1, Math.max(0, i + k));
        a += raw[j];
        n += 1;
      }
      return a / n;
    });
    const pos: number[] = [];
    const valid: boolean[] = [];
    const ao: number[] = [];
    for (let iz = 0; iz <= nz; iz += 1) {
      for (let ix = 0; ix <= nx; ix += 1) {
        const x = x0 + ix * cell;
        const z = z0 + iz * cell;
        const { d, index } = this.path.distanceXZ(x, z, 4);
        const s = this.path.samples[index];
        const ok = CAVE.includes(s.zone) || s.s > this.path.zoneStart('crypt') - 8;
        const sag = smoothstep(s.width / 2, s.width / 2 + 40, d);
        const stal = ridged(x * 0.05, z * 0.05, 3) * 7 + fbm(x * 0.02, z * 0.02, 3) * 6;
        const y = s.pos.y + H[index] * (1 - sag * 0.25) + stal * 0.5 - sag * 4;
        pos.push(x, y, z);
        valid.push(ok);
        ao.push(0.55 + stal * 0.03);
      }
    }
    const idx: number[] = [];
    const w = nx + 1;
    for (let iz = 0; iz < nz; iz += 1) {
      for (let ix = 0; ix < nx; ix += 1) {
        const a = iz * w + ix;
        const b = a + 1;
        const c = a + w;
        const d = c + 1;
        if (!(valid[a] && valid[b] && valid[c] && valid[d])) continue;
        // Wound to face downward.
        idx.push(a, b, c, b, d, c);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(pos.flatMap((_, i) => (i % 3 === 0 ? [pos[i] / 12, pos[i + 2] / 12] : [])), 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(ao.flatMap((v) => [v, v * 0.92, v * 0.86]), 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: Mats().bone.map, bumpMap: Mats().bone.map, bumpScale: 5, color: '#8a786a', vertexColors: true, roughness: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'skull-vault';
    this.group.add(mesh);
  }

  // ------------------------------------------------------------------ the ruined cathedral on the crown
  private sanctum(): void {
    const kit = new Kit();
    const m = Mats();
    const stone = m.stoneWarm;
    const end = this.path.zoneEnd('sanctum');
    for (const s of this.path.samples) {
      if (s.zone !== 'sanctum' || Math.round(s.s) % 4 !== 0) continue;
      const yaw = Math.atan2(s.tangent.x, s.tangent.z);
      kit.add(m.stoneDark, place(worldBox(s.width + 8, 2, 4.2, 2.5), s.pos.x, s.pos.y - 1.32, s.pos.z, yaw));
    }
    // Broken nave piers and fallen drums.
    for (let s = 6; s < end - 10; s += 12) {
      const a = this.path.at(s);
      for (const side of [-1, 1]) {
        const p = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 2.5));
        const b = this.footY(p, 1.3) - 0.5;
        const h = 4 + this.rng() * 14;
        kit.add(stone, place(prep(new THREE.CylinderGeometry(1.1, 1.2, h, 10)), p.x, b + h / 2, p.z));
        kit.add(stone, place(worldBox(3, 0.9, 3, 2), p.x, b + 0.45, p.z));
        this.obstacles.push({ x: p.x, z: p.z, r: 1.5 });
        if (h < 9 && this.rng() < 0.7) {
          const fp = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 - 2)).addScaledVector(a.tangent, 3);
          kit.add(stone, place(prep(new THREE.CylinderGeometry(1.05, 1.05, 2.2, 10)), fp.x, a.pos.y + 0.7, fp.z, this.rng() * 3, 1, 1, 1, Math.PI / 2));
          this.obstacles.push({ x: fp.x, z: fp.z, r: 1.3 });
        }
      }
    }
    // The broken western wall and its empty rose window.
    const wa = this.path.at(2);
    const wy = Math.atan2(wa.tangent.x, wa.tangent.z);
    for (const side of [-1, 1]) {
      const p = wa.pos.clone().addScaledVector(wa.right, side * 12).addScaledVector(wa.tangent, -8);
      kit.add(stone, place(worldBox(14, 22 + side * 6, 3, 4), p.x, this.footY(p, 3) + 10, p.z, wy));
    }
    // Waking Choir banners: white, with the open eye.
    const banner = m.robeWhite.clone();
    for (let s = 14; s < end; s += 24) {
      const a = this.path.at(s);
      for (const side of [-1, 1]) {
        const p = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 1));
        kit.add(m.ironDark, place(prep(new THREE.CylinderGeometry(0.06, 0.06, 5.5, 5)), p.x, a.pos.y + 2.4, p.z));
        kit.add(banner, place(new THREE.PlaneGeometry(1.2, 3), p.x, a.pos.y + 3.4, p.z, Math.atan2(a.tangent.x, a.tangent.z)));
        kit.add(m.gold, place(prep(new THREE.TorusGeometry(0.3, 0.05, 4, 12)), p.x, a.pos.y + 3.8, p.z, Math.atan2(a.tangent.x, a.tangent.z)));
      }
      this.torches.push({ pos: a.pos.clone().addScaledVector(a.right, (Math.round(s) % 48 < 24 ? 1 : -1) * (a.width / 2 - 0.5)).setY(a.pos.y + 1.6), zone: 'sanctum', s });
    }
    // Ruined spires of Velmour falling away below the crown.
    for (let i = 0; i < 16; i += 1) {
      const ang = (i / 16) * Math.PI * 2;
      const r = 70 + this.rng() * 80;
      const c = this.path.at(end * 0.5).pos;
      const p = new THREE.Vector3(c.x + Math.cos(ang) * r, 0, c.z + Math.sin(ang) * r);
      const n = this.path.distanceXZ(p.x, p.z, 6);
      if (n.d < 40) continue;
      const b = this.footY(p, 4) - 2;
      const h = 20 + this.rng() * 30;
      kit.add(m.stoneDark, place(worldBox(7, h, 7, 4), p.x, b + h / 2, p.z, ang, 1, 1, 1, (this.rng() - 0.5) * 0.2, (this.rng() - 0.5) * 0.2));
      if (this.rng() < 0.5) kit.add(m.slate, place(spire(5, 14, 4), p.x, b + h, p.z, ang + Math.PI / 4));
    }
    // The crack: where the crypt stairs break open into the Founder.
    const ce = this.path.at(this.path.zoneStart('crypt') - 4);
    this.crack.copy(ce.pos);
    const glow = Mats().crackGlow;
    const crackMesh = new THREE.Mesh(new THREE.PlaneGeometry(ce.width + 6, 14).rotateX(-Math.PI / 2), glow);
    crackMesh.position.copy(ce.pos).setY(ce.pos.y - 0.15);
    crackMesh.rotation.y = Math.atan2(ce.tangent.x, ce.tangent.z);
    this.group.add(crackMesh);
    kit.build(this.group, 'ruined-sanctum');
  }

  // ------------------------------------------------------------------ the crypts
  private crypt(): void {
    const kit = new Kit();
    const m = Mats();
    const cs = this.path.zoneStart('crypt');
    const ce = this.path.zoneEnd('crypt');
    for (let s = cs - 6; s < ce + 4; s += 4.5) {
      const a = this.path.at(s);
      const yaw = Math.atan2(a.tangent.x, a.tangent.z);
      kit.add(m.stoneDark, place(archFrame(a.width + 1.4, 5.2, 1.0, 1.1), a.pos.x, a.pos.y - 0.4, a.pos.z, yaw));
      // Ossuary niches: skulls stacked in the walls.
      if (Math.round(s * 2) % 3 === 0) {
        for (const side of [-1, 1]) {
          const p = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 0.9));
          for (let k = 0; k < 6; k += 1) {
            kit.add(m.bone, place(prep(new THREE.SphereGeometry(0.17, 7, 5)), p.x + a.tangent.x * (k % 3 - 1) * 0.4, a.pos.y + 0.8 + Math.floor(k / 3) * 0.4, p.z + a.tangent.z * (k % 3 - 1) * 0.4, 0, 1, 1.1, 1.2));
          }
        }
      }
      if (Math.round(s * 2) % 5 === 0) {
        const side = Math.round(s) % 2 ? 1 : -1;
        const tp = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 0.2)).setY(a.pos.y + 2.6);
        kit.add(m.ironDark, place(worldBox(0.15, 0.5, 0.15, 1), tp.x, tp.y - 0.3, tp.z));
        this.torches.push({ pos: tp, zone: 'crypt', s });
      }
    }
    // Floor steps where the crypt descends.
    for (const s of this.path.samples) {
      if (s.zone !== 'crypt' || Math.round(s.s) % 2 !== 0) continue;
      kit.add(m.stoneDark, place(worldBox(s.width + 1.6, 0.6, 1.0, 2), s.pos.x, s.pos.y - 0.32, s.pos.z, Math.atan2(s.tangent.x, s.tangent.z)));
    }
    kit.build(this.group, 'crypts');
  }

  // ------------------------------------------------------------------ inside the skull
  private cavern(): void {
    const kit = new Kit();
    const m = Mats();
    const sc = new Scatter();
    const boneMat = m.bone;
    const stalMat = new THREE.MeshStandardMaterial({ map: m.bone.map, color: '#a08a78', roughness: 0.85 });
    const stal = sc.set(prep(new THREE.ConeGeometry(1, 1, 7)).rotateX(Math.PI), stalMat, true);
    const stag = sc.set(prep(new THREE.ConeGeometry(1, 1, 7)).translate(0, 0.5, 0), stalMat, true);
    const rocks = sc.set(rockGeo(51, 2), new THREE.MeshStandardMaterial({ map: m.bone.map, bumpMap: m.bone.map, bumpScale: 3, color: '#7a6a60', roughness: 0.9 }), true);
    const crystal = sc.set(prep(new THREE.OctahedronGeometry(1, 0)), this.veinMat, false);
    const cs = this.path.zoneStart('cavern');
    const ce = this.path.length;
    const box = new THREE.Box3().setFromPoints(this.path.samples.filter((s) => s.s >= cs).map((s) => s.pos));
    for (let i = 0; i < 1600; i += 1) {
      const x = box.min.x - 60 + this.rng() * (box.max.x - box.min.x + 120);
      const z = box.min.z - 40 + this.rng() * (box.max.z - box.min.z + 80);
      const { d, index } = this.path.distanceXZ(x, z, 5);
      const s = this.path.samples[index];
      if (!CAVE.includes(s.zone) || s.zone === 'crypt') continue;
      const hw = s.width / 2;
      if (d < hw + 1.5) continue;
      const y = this.terrain.groundAt(x, z);
      const r = this.rng();
      if (r < 0.3) sc.add(stal, mtx(new THREE.Vector3(x, s.pos.y + 30 + this.rng() * 10, z), this.rng() * 6, 0.8 + this.rng() * 2, 4 + this.rng() * 12));
      else if (r < 0.55 && d < hw + 30) sc.add(stag, mtx(new THREE.Vector3(x, y - 0.5 - this.terrain.slopeAt(x, z) * 1.5, z), this.rng() * 6, 0.6 + this.rng() * 1.4, 2 + this.rng() * 7));
      else if (r < 0.75) {
        const k = 0.8 + this.rng() * 2.5;
        sc.add(rocks, mtx(new THREE.Vector3(x, y - 0.4 - this.terrain.slopeAt(x, z) * k * 0.7, z), this.rng() * 6, k, 0.5 + this.rng(), 0.4));
      }
      else if (r < 0.85 && d < hw + 20) sc.add(crystal, mtx(new THREE.Vector3(x, y + 0.2, z), this.rng() * 6, 0.3 + this.rng() * 0.6, 1 + this.rng() * 2, (this.rng() - 0.5) * 0.8, (this.rng() - 0.5) * 0.8));
    }
    sc.build(this.group);
    // Colossal bones: the Founder's own skeleton, arching over the way.
    for (let s = cs + 20; s < ce - 40; s += 34) {
      const a = this.path.at(s);
      const l = a.pos.clone().addScaledVector(a.right, -(a.width / 2 + 6)).setY(a.pos.y - 2);
      const r = a.pos.clone().addScaledVector(a.right, a.width / 2 + 6).setY(a.pos.y - 2);
      const top = a.pos.clone().setY(a.pos.y + 26 + this.rng() * 6);
      const curve = new THREE.CatmullRomCurve3([l, l.clone().lerp(top, 0.5).addScaledVector(a.right, -4).setY(top.y - 4), top, r.clone().lerp(top, 0.5).addScaledVector(a.right, 4).setY(top.y - 6), r]);
      kit.add(boneMat, prep(new THREE.TubeGeometry(curve, 30, 1.4, 8)));
      this.obstacles.push({ x: l.x, z: l.z, r: 1.8 }, { x: r.x, z: r.z, r: 1.8 });
    }
    // Glowing veins along the walls: the Founder's blood, running hot because it is waking.
    for (let i = 0; i < 26; i += 1) {
      const s = cs - 30 + this.rng() * (ce - cs + 30);
      const a = this.path.at(s);
      const side = this.rng() < 0.5 ? -1 : 1;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k < 6; k += 1) {
        const p = this.path.at(s + k * 6).pos.clone().addScaledVector(a.right, side * (a.width / 2 + 3 + k * 1.5 + this.rng() * 2));
        p.y = this.terrain.groundAt(p.x, p.z) + 0.3 + k * (1.5 + this.rng() * 3);
        pts.push(p);
      }
      kit.add(this.veinMat, prep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.12 + this.rng() * 0.15, 5)));
    }
    // Ember torches in iron cages on bone stakes.
    for (let s = cs + 6; s < ce - 10; s += 18) {
      const a = this.path.at(s);
      const side = Math.round(s / 18) % 2 ? 1 : -1;
      const p = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 - 0.4));
      kit.add(boneMat, place(prep(new THREE.CylinderGeometry(0.1, 0.16, 2.6, 6)), p.x, a.pos.y + 1, p.z, 0, 1, 1, 1, side * 0.1));
      kit.add(m.ironDark, place(lathe([[0.2, 0], [0.26, 0.3], [0.18, 0.5]], 6), p.x, a.pos.y + 2.3, p.z));
      this.torches.push({ pos: new THREE.Vector3(p.x, a.pos.y + 2.6, p.z), zone: 'cavern', s });
      this.obstacles.push({ x: p.x, z: p.z, r: 0.5 });
    }
    kit.build(this.group, 'skull-cavern');
  }

  // ------------------------------------------------------------------ the Heart
  private heartChamber(): void {
    const kit = new Kit();
    const m = Mats();
    const hs = this.path.zoneStart('heart');
    const ca = this.path.at(hs + 54);
    this.arenaCenter.copy(ca.pos);
    const last = this.path.samples[this.path.samples.length - 1];
    this.heart.copy(last.pos).addScaledVector(last.tangent, 16).setY(last.pos.y + 11);
    // The heart itself: a molten organ the size of a house, bound in bone.
    const hg = new THREE.SphereGeometry(8, 28, 20);
    const hp = hg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < hp.count; i += 1) {
      const v = new THREE.Vector3(hp.getX(i), hp.getY(i), hp.getZ(i));
      const n = 1 + fbm(v.x * 0.3 + 4, v.y * 0.3 + v.z * 0.2, 3) * 0.35;
      v.multiplyScalar(n);
      hp.setXYZ(i, v.x, v.y * 1.15, v.z);
    }
    hg.computeVertexNormals();
    this.heartMesh = new THREE.Mesh(hg, this.heartMat);
    this.heartMesh.position.copy(this.heart);
    this.group.add(this.heartMesh);
    for (let i = 0; i < 9; i += 1) {
      const ang = (i / 9) * Math.PI * 2;
      const c = new THREE.CatmullRomCurve3([
        this.heart.clone().add(new THREE.Vector3(Math.cos(ang) * 9, -12, Math.sin(ang) * 9)),
        this.heart.clone().add(new THREE.Vector3(Math.cos(ang) * 10.5, 0, Math.sin(ang) * 10.5)),
        this.heart.clone().add(new THREE.Vector3(Math.cos(ang + 0.4) * 7, 10, Math.sin(ang + 0.4) * 7)),
        this.heart.clone().add(new THREE.Vector3(Math.cos(ang + 0.8) * 3, 22, Math.sin(ang + 0.8) * 3)),
      ]);
      kit.add(m.bone, prep(new THREE.TubeGeometry(c, 24, 0.8, 7)));
      // Arteries running out across the floor of the chamber.
      const out = this.heart.clone().add(new THREE.Vector3(Math.cos(ang) * 40, -11, Math.sin(ang) * 40));
      out.y = this.terrain.groundAt(out.x, out.z) + 0.2;
      const mid = this.heart.clone().lerp(out, 0.5);
      mid.y = this.terrain.groundAt(mid.x, mid.z) + 0.3;
      kit.add(this.veinMat, prep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([this.heart.clone().add(new THREE.Vector3(0, -9, 0)), mid, out]), 24, 0.35, 6)));
    }
    // A dais before the heart, where the bell is to be rung.
    kit.add(m.stoneDark, place(prep(new THREE.CylinderGeometry(6, 7, 0.8, 16)), last.pos.x, last.pos.y - 0.1, last.pos.z));
    kit.add(m.stoneDark, place(prep(new THREE.CylinderGeometry(4.6, 5, 0.4, 16)), last.pos.x, last.pos.y + 0.4, last.pos.z));
    // A ring of bone pillars around the arena.
    for (let i = 0; i < 10; i += 1) {
      const ang = (i / 10) * Math.PI * 2 + 0.2;
      const p = ca.pos.clone().add(new THREE.Vector3(Math.sin(ang) * 25, 0, Math.cos(ang) * 25));
      const b = this.footY(p, 1.2) - 0.6;
      const h = 14 + this.rng() * 8;
      kit.add(m.bone, place(prep(new THREE.CylinderGeometry(0.9, 1.4, h, 8)), p.x, b + h / 2, p.z, 0, 1, 1, 1, (this.rng() - 0.5) * 0.1));
      kit.add(m.bone, place(prep(new THREE.SphereGeometry(1.5, 8, 6)), p.x, b + h, p.z));
      const n = this.path.nearest(p.x, p.z);
      if (Math.abs(n.lateral) < n.sample.width / 2 + 1.5) this.obstacles.push({ x: p.x, z: p.z, r: 1.4 });
      if (i % 2 === 0) this.torches.push({ pos: new THREE.Vector3(p.x, b + h + 1.6, p.z), zone: 'heart', s: n.sample.s });
    }
    kit.build(this.group, 'heart-chamber');
  }

  update(dt: number, time: number): void {
    void dt;
    const rate = 0.9 + this.wake * 1.6;
    const beat = Math.pow(Math.max(0, Math.sin(time * rate * Math.PI)), 8);
    const w = this.wake;
    this.heartMat.emissiveIntensity = (0.35 + w * 1.25) * (1 + beat * 0.6);
    this.heartMat.emissive.setRGB(0.25 + w * 0.75, 0.32 + w * 0.03, 0.9 - w * 0.8);
    this.veinMat.emissiveIntensity = 0.25 + w * 1.6 * (0.8 + beat * 0.4);
    this.veinMat.emissive.setRGB(0.3 + w * 0.7, 0.35 + w * 0.13, 0.9 - w * 0.71);
    this.heartMesh.scale.setScalar(1 + beat * 0.035 * (0.3 + this.wake));
  }
}
