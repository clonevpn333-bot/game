import * as THREE from 'three';
import { fbm, ridged } from '../utils/math';
import { createSeededRandom } from '../utils/random';
import { archFrame, merge, place, prep, spire, worldBox } from './geo';

/**
 * Silhouette layers beyond the playable corridor. They are unfogged, with colours authored
 * for atmospheric perspective, and their tint and brightness are driven by the chapter's
 * palette and by lightning. This is what makes a linear chapter read as a slice of a vast kingdom.
 */
export class FarWorld {
  readonly group = new THREE.Group();
  private readonly mats: THREE.MeshBasicMaterial[] = [];
  private readonly baseColors: THREE.Color[] = [];
  readonly lights: THREE.Points;
  private readonly rng = createSeededRandom(4242);
  private readonly center = new THREE.Vector3(0, 0, -600);

  constructor() {
    this.group.name = 'far-world';
    this.ring(2300, 160, 340, '#1a1f36', '#3a4470', 11, 1);
    this.ring(3300, 260, 520, '#202744', '#4a5080', 23, 0.9);
    this.ring(4600, 380, 760, '#2a3050', '#5a5d8a', 37, 0.8);
    this.ribs();
    this.sleepingGiant();
    this.distantCastles();
    this.aqueduct();
    this.lights = this.villageLights();
    this.group.add(this.lights);
  }

  private mat(top: string, k = 1): THREE.MeshBasicMaterial {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
    m.color.setScalar(k);
    this.mats.push(m);
    this.baseColors.push(m.color.clone());
    m.userData.top = top;
    return m;
  }

  private gradient(geo: THREE.BufferGeometry, bottom: string, top: string, y0: number, y1: number): void {
    const p = geo.attributes.position as THREE.BufferAttribute;
    const cb = new THREE.Color(bottom);
    const ct = new THREE.Color(top);
    const c = new THREE.Color();
    const arr = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i += 1) {
      const t = Math.min(1, Math.max(0, (p.getY(i) - y0) / (y1 - y0)));
      c.copy(cb).lerp(ct, Math.pow(t, 1.4));
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }

  private ring(radius: number, minH: number, maxH: number, bottom: string, top: string, seed: number, k: number): void {
    const segs = 360;
    const pos: number[] = [];
    for (let i = 0; i < segs; i += 1) {
      const a0 = (i / segs) * Math.PI * 2;
      const a1 = ((i + 1) / segs) * Math.PI * 2;
      const h = (a: number) => {
        const n = ridged(Math.cos(a) * 3 + seed, Math.sin(a) * 3, 5);
        const peaks = Math.pow(Math.max(0, fbm(a * 4 + seed, seed, 3) + 0.4), 1.5);
        return minH + (maxH - minH) * (n * 0.65 + peaks * 0.6);
      };
      const r0 = radius * (1 + fbm(a0 * 5, seed * 2, 2) * 0.15);
      const r1 = radius * (1 + fbm(a1 * 5, seed * 2, 2) * 0.15);
      const x0 = this.center.x + Math.cos(a0) * r0;
      const z0 = this.center.z + Math.sin(a0) * r0;
      const x1 = this.center.x + Math.cos(a1) * r1;
      const z1 = this.center.z + Math.sin(a1) * r1;
      const h0 = h(a0);
      const h1 = h(a1);
      const b = -200;
      pos.push(x0, b, z0, x1, b, z1, x0, h0, z0, x0, h0, z0, x1, b, z1, x1, h1, z1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.gradient(geo, bottom, top, 0, maxH);
    const mesh = new THREE.Mesh(geo, this.mat(top, k));
    (mesh.material as THREE.Material).side = THREE.DoubleSide;
    mesh.renderOrder = -5;
    mesh.frustumCulled = false;
    this.group.add(mesh);
  }

  /** The Ribs of Harrowmere: another Founder, half-buried in the western fog. */
  private ribs(): void {
    const parts: THREE.BufferGeometry[] = [];
    const base = new THREE.Vector3(-1500, -40, -350);
    for (let i = 0; i < 8; i += 1) {
      const z = base.z - 180 + i * 70;
      const h = 260 + Math.sin(i * 0.7) * 60;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(base.x + 120, -60, z),
        new THREE.Vector3(base.x + 60, h * 0.7, z + 6),
        new THREE.Vector3(base.x - 40, h, z + 12),
        new THREE.Vector3(base.x - 150, h * 0.75, z + 14),
        new THREE.Vector3(base.x - 210, h * 0.25, z + 10),
      ]);
      parts.push(prep(new THREE.TubeGeometry(curve, 24, 14 - i * 0.6, 7)));
    }
    // Spine.
    const spineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(base.x + 130, -20, base.z - 300),
      new THREE.Vector3(base.x + 135, 30, base.z),
      new THREE.Vector3(base.x + 125, 10, base.z + 330),
    ]);
    parts.push(prep(new THREE.TubeGeometry(spineCurve, 30, 26, 8)));
    const geo = merge(parts);
    this.gradient(geo, '#141828', '#6a7090', 0, 300);
    const mesh = new THREE.Mesh(geo, this.mat('#6a7090', 0.9));
    mesh.name = 'ribs-of-harrowmere';
    this.group.add(mesh);
  }

  /** A reclining colossus on the north-east horizon with a ruined castle on its shoulder. */
  private sleepingGiant(): void {
    const parts: THREE.BufferGeometry[] = [];
    const o = new THREE.Vector3(1900, -120, -2900);
    const sph = (x: number, y: number, z: number, sx: number, sy: number, sz: number) =>
      parts.push(place(prep(new THREE.SphereGeometry(1, 16, 10)), o.x + x, o.y + y, o.z + z, 0.4, sx, sy, sz));
    sph(0, 120, 0, 420, 190, 260); // torso
    sph(-430, 160, -120, 170, 150, 160); // head
    sph(-560, 200, -150, 60, 70, 50); // brow/nose
    sph(-180, 230, -60, 180, 120, 150); // shoulder
    sph(320, 80, 140, 380, 140, 220); // hips
    sph(700, 40, 200, 380, 90, 140); // legs
    sph(-80, 320, 60, 90, 60, 300); // folded arm
    const geo = merge(parts);
    this.gradient(geo, '#161a2a', '#5a5f86', 0, 420);
    const mesh = new THREE.Mesh(geo, this.mat('#5a5f86', 0.85));
    mesh.name = 'sleeping-giant';
    this.group.add(mesh);
    // Ruined castle on the shoulder.
    const castle: THREE.BufferGeometry[] = [];
    const c = new THREE.Vector3(o.x - 180, o.y + 340, o.z - 60);
    for (let i = 0; i < 6; i += 1) {
      const x = c.x + (i - 3) * 22;
      const h = 40 + this.rng() * 50;
      castle.push(place(worldBox(10, h, 10, 8), x, c.y + h / 2, c.z + this.rng() * 20));
      if (this.rng() < 0.6) castle.push(place(spire(8, 24, 4), x, c.y + h, c.z));
    }
    const cg = merge(castle);
    this.gradient(cg, '#20243a', '#3a3f60', c.y, c.y + 100);
    this.group.add(new THREE.Mesh(cg, this.mat('#3a3f60', 0.85)));
  }

  private distantCastles(): void {
    const sites: Array<[number, number, number, number]> = [
      [900, 180, -1500, 1],
      [-900, 220, -2300, 1.3],
      [1300, 120, 200, 0.8],
      [-600, 160, 900, 0.9],
    ];
    for (const [x, y, z, s] of sites) {
      const parts: THREE.BufferGeometry[] = [];
      parts.push(place(prep(new THREE.ConeGeometry(120 * s, 220 * s, 7)), x, y - 110 * s, z));
      for (let i = 0; i < 5; i += 1) {
        const tx = x + (i - 2) * 14 * s;
        const h = (30 + this.rng() * 45) * s;
        parts.push(place(worldBox(8 * s, h, 8 * s, 8), tx, y + h / 2, z + (this.rng() - 0.5) * 20 * s));
        parts.push(place(spire(6 * s, 22 * s, 6), tx, y + h, z));
      }
      const geo = merge(parts);
      this.gradient(geo, '#161a2c', '#454a72', y - 200, y + 80);
      this.group.add(new THREE.Mesh(geo, this.mat('#454a72', 0.9)));
    }
  }

  /** Ruined aqueduct striding across the western valley. */
  private aqueduct(): void {
    const parts: THREE.BufferGeometry[] = [];
    const start = new THREE.Vector3(-420, 0, 120);
    const dir = new THREE.Vector3(-0.3, 0, -1).normalize();
    for (let i = 0; i < 22; i += 1) {
      if (i === 7 || i === 8 || i === 15) continue; // collapsed spans
      const p = start.clone().addScaledVector(dir, i * 34);
      parts.push(place(archFrame(22, 40, 8, 6), p.x, -10, p.z, Math.atan2(dir.x, dir.z) + Math.PI / 2));
      if (i % 2 === 0) parts.push(place(archFrame(12, 14, 6, 4), p.x, 46, p.z, Math.atan2(dir.x, dir.z) + Math.PI / 2));
    }
    const geo = merge(parts);
    this.gradient(geo, '#1a1e30', '#525878', -10, 70);
    this.group.add(new THREE.Mesh(geo, this.mat('#525878', 0.9)));
  }

  /** Clusters of warm lights: villages and watchfires across the dark kingdom. */
  private villageLights(): THREE.Points {
    const pos: number[] = [];
    const col: number[] = [];
    const clusters: Array<[number, number, number, number]> = [
      [-800, 30, -100, 18],
      [700, 40, -600, 14],
      [-1100, 60, -1600, 22],
      [1500, 80, -2000, 10],
      [400, 20, 600, 12],
      [-300, 15, -1700, 16],
      [1100, 300, -2800, 6],
      [-1500, 40, 800, 12],
    ];
    for (const [x, y, z, n] of clusters) {
      for (let i = 0; i < n; i += 1) {
        pos.push(x + (this.rng() - 0.5) * 120, y + this.rng() * 12, z + (this.rng() - 0.5) * 120);
        const warm = 0.7 + this.rng() * 0.3;
        col.push(1.0 * warm, 0.62 * warm, 0.3 * warm);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mat = new THREE.PointsMaterial({ size: 3.2, sizeAttenuation: false, vertexColors: true, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    return new THREE.Points(geo, mat);
  }

  update(lightning: number, tint: THREE.Color): void {
    this.mats.forEach((m, i) => {
      m.color.copy(this.baseColors[i]).multiply(tint).addScalar(lightning * 0.55);
    });
  }
}
