import * as THREE from 'three';
import { Path, type Zone } from './Path';
import { Mats } from './Materials';
import { Tex } from './Textures';
import { bridgeSpan, merge, place, prep, rockGeo, worldBox } from './geo';
import { createSeededRandom } from '../utils/random';
import { fbm, lerp, ridged, smoothstep } from '../utils/math';

const CITY_ZONES: Zone[] = ['gate', 'street', 'market', 'broken', 'stair', 'plaza'];

export const WindUniforms = { uTime: { value: 0 }, uWind: { value: 1 } };

function windSway<T extends THREE.Material>(m: T, amount: number, key: string): T {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = WindUniforms.uTime;
    shader.uniforms.uWind = WindUniforms.uWind;
    shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         float phase = instanceMatrix[3].x * 0.13 + instanceMatrix[3].z * 0.11;
       #else
         float phase = 0.0;
       #endif
       float hh = max(position.y, 0.0);
       transformed.x += sin(uTime * 1.7 + phase) * ${amount.toFixed(3)} * hh * uWind;
       transformed.z += cos(uTime * 1.3 + phase * 1.3) * ${(amount * 0.6).toFixed(3)} * hh * uWind;`,
    );
  };
  m.customProgramCacheKey = () => `wind-${key}`;
  return m;
}

export type TorchSpot = { pos: THREE.Vector3; zone: Zone; s: number };

export class Terrain {
  readonly group = new THREE.Group();
  readonly torches: TorchSpot[] = [];
  readonly fogSheets: THREE.Mesh[] = [];
  private readonly fogMat: THREE.MeshBasicMaterial;

  constructor(private readonly path: Path) {
    this.group.name = 'terrain';
    this.group.add(this.buildGround());
    this.group.add(this.buildRoad());
    this.group.add(this.buildBridge());
    this.buildProps();
    this.fogMat = new THREE.MeshBasicMaterial({
      map: Tex.fogNoise(),
      color: '#7080a8',
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      fog: true,
    });
    this.buildFog();
  }

  /** Ground height used by world generation (not by gameplay, which follows the path). */
  height(x: number, z: number): number {
    const { d, index, side } = this.path.distanceXZ(x, z, 5);
    const s = this.path.samples[index];
    const roadY = s.pos.y;
    const hw = s.width / 2;
    const n1 = fbm(x * 0.02, z * 0.02, 4);
    const far =
      18 + fbm(x * 0.004 + 7, z * 0.004, 4) * 50 + ridged(x * 0.0026 + 3, z * 0.0026, 5) * 330 * smoothstep(120, 430, d) * (0.25 + 0.75 * smoothstep(160, 320, Math.abs(x - 10)));
    let near: number;
    let blend: number;
    if (CITY_ZONES.includes(s.zone)) {
      if (s.zone === 'plaza' && side < 0 && d > hw + 1) {
        near = roadY - 3 - 135 * smoothstep(hw + 1, hw + 14, d) + n1 * 8;
      } else {
        const k = smoothstep(hw + 70, hw + 135, d);
        near = roadY - 0.4 - 128 * k + n1 * 10 * k;
      }
      blend = smoothstep(210, 330, d);
    } else if (s.zone === 'bridge') {
      near = roadY - 125 + n1 * 14;
      blend = smoothstep(110, 260, d);
    } else {
      const cliffSide = Math.sin(s.s * 0.009 + 0.6) > 0 ? 1 : -1;
      const edge = hw + 1.5;
      if (d < edge + 5) near = roadY - 0.35 + n1 * 0.15;
      else if (side === cliffSide) {
        const k = smoothstep(edge + 5, edge + 32, d);
        near = roadY - 0.35 - 80 * k + n1 * 12 * k;
      } else {
        const k = smoothstep(edge + 5, edge + 26, d);
        near = roadY - 0.35 + 13 * k * (0.75 + 0.5 * n1) + ridged(x * 0.03, z * 0.03, 3) * 7 * smoothstep(edge + 8, edge + 45, d);
      }
      blend = smoothstep(90, 240, d);
    }
    return lerp(near, far, blend);
  }

  private buildGround(): THREE.Mesh {
    const x0 = -360;
    const x1 = 400;
    const z0 = -1500;
    const z1 = 330;
    const cell = 5;
    const nx = Math.round((x1 - x0) / cell);
    const nz = Math.round((z1 - z0) / cell);
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const p = geo.attributes.position as THREE.BufferAttribute;
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i += 1) {
      const x = p.getX(i);
      const z = p.getZ(i);
      const y = this.height(x, z);
      p.setY(i, y);
      uv.setXY(i, x / 14 + y / 30, z / 14 + y / 30);
    }
    geo.computeVertexNormals();
    const n = geo.attributes.normal as THREE.BufferAttribute;
    const colors = new Float32Array(p.count * 3);
    const moss = new THREE.Color('#4a5e3a');
    const rock = new THREE.Color('#7a8090');
    const dark = new THREE.Color('#2a2c34');
    const snow = new THREE.Color('#c8d0e0');
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i += 1) {
      const ny = n.getY(i);
      const y = p.getY(i);
      const x = p.getX(i);
      const z = p.getZ(i);
      c.copy(rock).lerp(moss, smoothstep(0.72, 0.9, ny) * (0.7 + 0.3 * fbm(x * 0.05, z * 0.05, 2)));
      c.lerp(dark, smoothstep(40, -20, y) * 0.6);
      c.lerp(snow, smoothstep(190, 260, y) * smoothstep(0.55, 0.8, ny));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geo, Mats().terrain);
    mesh.receiveShadow = true;
    mesh.name = 'ground';
    return mesh;
  }

  private buildRoad(): THREE.Group {
    const g = new THREE.Group();
    const samples = this.path.samples;
    const positions: number[] = [];
    const uvs: number[] = [];
    const curbs: THREE.BufferGeometry[] = [];
    const step = 2;
    for (let i = 0; i < samples.length - step; i += step) {
      const a = samples[i];
      const b = samples[Math.min(samples.length - 1, i + step)];
      const ha = a.width / 2 + 0.6;
      const hb = b.width / 2 + 0.6;
      const al = a.pos.clone().addScaledVector(a.right, -ha);
      const ar = a.pos.clone().addScaledVector(a.right, ha);
      const bl = b.pos.clone().addScaledVector(b.right, -hb);
      const br = b.pos.clone().addScaledVector(b.right, hb);
      const y = 0.05;
      positions.push(al.x, al.y + y, al.z, bl.x, bl.y + y, bl.z, ar.x, ar.y + y, ar.z);
      positions.push(ar.x, ar.y + y, ar.z, bl.x, bl.y + y, bl.z, br.x, br.y + y, br.z);
      const va = a.s / 4;
      const vb = b.s / 4;
      uvs.push(-ha / 4, va, -hb / 4, vb, ha / 4, va, ha / 4, va, -hb / 4, vb, hb / 4, vb);
      // Edge stones on the open mountain road and the stair.
      if ((a.zone === 'road' || a.zone === 'stair') && i % 4 === 0) {
        for (const side of [-1, 1]) {
          const p = a.pos.clone().addScaledVector(a.right, side * (ha + 0.1));
          const yaw = Math.atan2(a.tangent.x, a.tangent.z);
          curbs.push(place(worldBox(0.45, 0.3, 1.6, 2), p.x, p.y + 0.02, p.z, yaw + (i % 8 === 0 ? 0.15 : -0.05)));
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    const road = new THREE.Mesh(geo, Mats().cobble);
    road.receiveShadow = true;
    road.name = 'road';
    g.add(road);
    const curbMesh = new THREE.Mesh(merge(curbs), Mats().stone);
    curbMesh.receiveShadow = true;
    curbMesh.castShadow = true;
    g.add(curbMesh);

    // Stair steps: visual risers across the stair zone.
    const steps: THREE.BufferGeometry[] = [];
    for (let i = 0; i < samples.length - 1; i += 1) {
      const a = samples[i];
      if (a.zone !== 'stair' || i % 2 !== 0) continue;
      const yaw = Math.atan2(a.tangent.x, a.tangent.z);
      steps.push(place(worldBox(a.width + 1.2, 0.5, 1.1, 2), a.pos.x, a.pos.y - 0.12, a.pos.z, yaw));
    }
    if (steps.length) {
      const stepMesh = new THREE.Mesh(merge(steps), Mats().stoneWarm);
      stepMesh.receiveShadow = true;
      g.add(stepMesh);
    }
    return g;
  }

  private buildBridge(): THREE.Group {
    const g = new THREE.Group();
    const samples = this.path.samples.filter((s) => s.zone === 'bridge');
    if (!samples.length) return g;
    const stone: THREE.BufferGeometry[] = [];
    const spanLen = 24;
    const sStart = samples[0].s;
    const sEnd = samples[samples.length - 1].s;
    for (let s = sStart - 6; s <= sEnd + 6; s += spanLen) {
      const a = this.path.at(s);
      const yaw = Math.atan2(a.tangent.x, a.tangent.z);
      // Pier down into the chasm.
      const pierH = 140;
      stone.push(place(worldBox(5, pierH, a.width + 3, 4), a.pos.x, a.pos.y - 1.2 - pierH / 2, a.pos.z, yaw + Math.PI / 2));
      // Cutwater buttresses.
      for (const side of [-1, 1]) {
        const bp = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 2.2));
        stone.push(place(worldBox(3, pierH, 3, 4), bp.x, bp.y - 2 - pierH / 2, bp.z, yaw + Math.PI / 4));
        // Pier-top lantern columns.
        stone.push(place(worldBox(1.1, 3.2, 1.1, 2), bp.x, bp.y + 1.6, bp.z, yaw));
        this.torches.push({ pos: new THREE.Vector3(bp.x, bp.y + 3.6, bp.z), zone: 'bridge', s });
      }
      const mid = this.path.at(s + spanLen / 2);
      const myaw = Math.atan2(mid.tangent.x, mid.tangent.z);
      const span = bridgeSpan(spanLen + 0.5, 16, mid.width + 1.6);
      stone.push(place(span, mid.pos.x, mid.pos.y - 0.25, mid.pos.z, myaw - Math.PI / 2));
    }
    // Parapets.
    for (let s = sStart - 4; s <= sEnd + 4; s += 3) {
      const a = this.path.at(s);
      const yaw = Math.atan2(a.tangent.x, a.tangent.z);
      for (const side of [-1, 1]) {
        const bp = a.pos.clone().addScaledVector(a.right, side * (a.width / 2 + 0.55));
        stone.push(place(worldBox(0.7, 1.1, 3.1, 2), bp.x, bp.y + 0.55, bp.z, yaw));
      }
    }
    const mesh = new THREE.Mesh(merge(stone), Mats().stone);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = 'bridge';
    g.add(mesh);
    return g;
  }

  private buildProps(): void {
    const rng = createSeededRandom(2024);
    const m = Mats();
    const pineGeo = merge([
      place(new THREE.CylinderGeometry(0.25, 0.4, 3, 6), 0, 1.5, 0),
      place(new THREE.ConeGeometry(2.6, 5, 7), 0, 4.5, 0),
      place(new THREE.ConeGeometry(2.1, 4.4, 7), 0, 7, 0),
      place(new THREE.ConeGeometry(1.5, 3.8, 7), 0, 9.4, 0),
      place(new THREE.ConeGeometry(0.9, 3.2, 6), 0, 11.6, 0),
    ]);
    const pineMat = windSway(new THREE.MeshStandardMaterial({ color: '#1f3326', roughness: 0.9, flatShading: true }), 0.006, 'pine');
    const deadGeo = merge([
      place(new THREE.CylinderGeometry(0.18, 0.42, 7, 5), 0, 3.5, 0, 0, 1, 1, 1, 0.08),
      place(new THREE.CylinderGeometry(0.06, 0.16, 3.4, 4), 0.9, 5.4, 0, 0, 1, 1, 1, 0, -0.9),
      place(new THREE.CylinderGeometry(0.05, 0.14, 2.8, 4), -0.8, 4.4, 0.3, 0.5, 1, 1, 1, 0.2, 1.0),
      place(new THREE.CylinderGeometry(0.04, 0.1, 2.2, 4), 0.2, 6.6, -0.6, 0, 1, 1, 1, -0.8, 0.2),
    ]);
    const deadMat = new THREE.MeshStandardMaterial({ color: '#2e2620', roughness: 1, flatShading: true });
    const autumnGeo = merge([
      place(new THREE.CylinderGeometry(0.2, 0.4, 5, 6), 0, 2.5, 0),
      place(new THREE.IcosahedronGeometry(2.4, 0), 0.4, 5.8, 0),
      place(new THREE.IcosahedronGeometry(1.8, 0), -1.3, 5.0, 0.6),
      place(new THREE.IcosahedronGeometry(1.6, 0), 1.2, 7.0, -0.4),
    ]);
    const autumnMat = windSway(
      new THREE.MeshStandardMaterial({ color: '#8a5a24', roughness: 0.9, flatShading: true }),
      0.008,
      'autumn',
    );
    const rockG = rockGeo(3, 2);
    const grassGeo = merge([
      place(new THREE.PlaneGeometry(1.1, 0.9), 0, 0.42, 0),
      place(new THREE.PlaneGeometry(1.1, 0.9), 0, 0.42, 0, Math.PI / 2),
      place(new THREE.PlaneGeometry(1.1, 0.9), 0, 0.42, 0, Math.PI / 4),
    ]);
    const grassMat = windSway(
      new THREE.MeshStandardMaterial({ color: '#b8c8a0', side: THREE.DoubleSide, roughness: 1, alphaTest: 0.45, map: Tex.grass() }),
      0.25,
      'grass',
    );

    type Inst = { geo: THREE.BufferGeometry; mat: THREE.Material; mats: THREE.Matrix4[]; shadow: boolean };
    const sets: Record<string, Inst> = {
      pine: { geo: pineGeo, mat: pineMat, mats: [], shadow: false },
      dead: { geo: deadGeo, mat: deadMat, mats: [], shadow: true },
      autumn: { geo: autumnGeo, mat: autumnMat, mats: [], shadow: true },
      rock: { geo: rockG, mat: m.rock, mats: [], shadow: true },
      grass: { geo: grassGeo, mat: grassMat, mats: [], shadow: false },
    };
    // Rock vertex colours for the shared rock material.
    const rc = new Float32Array(rockG.attributes.position.count * 3).fill(1.15);
    rockG.setAttribute('color', new THREE.BufferAttribute(rc, 3));

    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const add = (key: string, x: number, y: number, z: number, s: number, sy = s, tilt = 0) => {
      e.set((rng() - 0.5) * tilt, rng() * Math.PI * 2, (rng() - 0.5) * tilt);
      q.setFromEuler(e);
      sets[key].mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, sy, s)));
    };

    for (let i = 0; i < 3400; i += 1) {
      const x = -340 + rng() * 720;
      const z = -1480 + rng() * 1790;
      const { d, index } = this.path.distanceXZ(x, z, 6);
      const sample = this.path.samples[index];
      const hw = sample.width / 2;
      if (d < hw + 3.5) continue;
      if (CITY_ZONES.includes(sample.zone) && d < hw + 90) continue;
      const y = this.height(x, z);
      const slope = Math.abs(this.height(x + 2, z) - y) + Math.abs(this.height(x, z + 2) - y);
      const r = rng();
      if (d < 40 && r < 0.55 && slope < 1.5 && sample.zone === 'road') add('grass', x, y, z, 0.8 + rng() * 0.9);
      else if (slope > 3.5 && r < 0.5) add('rock', x, y - 0.8, z, 1.2 + rng() * 3.5, 1 + rng() * 3, 0.5);
      else if (slope < 3 && r < 0.8) {
        if (y < 140) add(rng() < 0.12 ? 'autumn' : 'pine', x, y - 0.3, z, 0.8 + rng() * 0.9, 0.8 + rng() * 1.3);
        else add('dead', x, y - 0.3, z, 0.8 + rng() * 0.5);
      } else if (r < 0.9) add('dead', x, y - 0.3, z, 0.7 + rng() * 0.6, 0.7 + rng() * 0.6, 0.3);
    }
    // Dense roadside grass and boulders along the mountain road.
    for (const s of this.path.samples) {
      if (s.zone !== 'road' || rng() > 0.55) continue;
      for (const side of [-1, 1]) {
        const off = s.width / 2 + 1.8 + rng() * 4;
        const p = s.pos.clone().addScaledVector(s.right, side * off);
        add('grass', p.x, s.pos.y - 0.3, p.z, 0.7 + rng() * 0.8);
        if (rng() < 0.05) add('rock', p.x + side, s.pos.y - 0.2, p.z, 0.8 + rng() * 1.2, 0.6 + rng(), 0.4);
      }
    }

    for (const key of Object.keys(sets)) {
      const set = sets[key];
      const inst = new THREE.InstancedMesh(set.geo, set.mat, set.mats.length);
      set.mats.forEach((mm, i) => inst.setMatrixAt(i, mm));
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = set.shadow;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      inst.name = `props-${key}`;
      this.group.add(inst);
    }

    // Fence posts and rope along the cliff side of the road.
    const posts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < this.path.samples.length; i += 7) {
      const s = this.path.samples[i];
      if (s.zone !== 'road') continue;
      const cliffSide = Math.sin(s.s * 0.009 + 0.6) > 0 ? 1 : -1;
      const p = s.pos.clone().addScaledVector(s.right, cliffSide * (s.width / 2 + 2.2));
      posts.push(place(worldBox(0.3, 1.5, 0.3, 1), p.x, s.pos.y + 0.5, p.z, rng(), 1, 1, 1, (rng() - 0.5) * 0.3));
      if (i % 21 === 0) posts.push(place(worldBox(0.18, 0.18, 7, 2), p.x, s.pos.y + 0.95, p.z, Math.atan2(s.tangent.x, s.tangent.z)));
    }
    const postMesh = new THREE.Mesh(merge(posts), m.wood);
    postMesh.castShadow = true;
    this.group.add(postMesh);

    this.buildFossilSkull();
    this.buildShrine();
  }

  /** A colossal fossil skull on the cliff: the first hint that the mountains are bodies. */
  private buildFossilSkull(): void {
    const s = this.path.at(175);
    const cliffSide = Math.sin(s.s * 0.009 + 0.6) > 0 ? 1 : -1;
    const base = s.pos.clone().addScaledVector(s.right, cliffSide * 26);
    base.y = this.height(base.x, base.z) + 2;
    const parts: THREE.BufferGeometry[] = [];
    const cranium = prep(new THREE.SphereGeometry(9, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.62));
    parts.push(place(cranium, 0, 0, 0, 0, 1.3, 0.9, 1));
    parts.push(place(prep(new THREE.CylinderGeometry(3, 5, 16, 8, 1, true)), 0, -2, 14, 0, 1, 1, 1, Math.PI / 2 - 0.15));
    parts.push(place(prep(new THREE.TorusGeometry(3.3, 1.2, 6, 10)), -5, 1, 7, 0.3));
    parts.push(place(prep(new THREE.TorusGeometry(3.3, 1.2, 6, 10)), 5, 1, 7, -0.3));
    for (let i = 0; i < 7; i += 1) {
      const t = i / 6;
      parts.push(place(prep(new THREE.ConeGeometry(0.7, 4.5, 5)), -4 + t * 8, -5, 20 - Math.abs(t - 0.5) * 3, 0, 1, 1, 1, Math.PI));
    }
    // Two great horns.
    for (const sx of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx * 8, 3, 0),
        new THREE.Vector3(sx * 16, 8, -6),
        new THREE.Vector3(sx * 20, 6, -16),
        new THREE.Vector3(sx * 18, 12, -24),
      ]);
      parts.push(prep(new THREE.TubeGeometry(curve, 16, 1.6, 6)));
    }
    const skull = new THREE.Mesh(merge(parts), Mats().bone);
    skull.position.copy(base);
    skull.rotation.set(0.25, Math.atan2(-s.right.x * cliffSide, -s.right.z * cliffSide) + 0.6, 0.3);
    skull.castShadow = true;
    skull.receiveShadow = true;
    skull.name = 'fossil-skull';
    this.group.add(skull);
  }

  private buildShrine(): void {
    // Wayside Candle near the end of the mountain road.
    const s = this.path.at(420);
    const p = s.pos.clone().addScaledVector(s.right, -(s.width / 2 + 2.5));
    const parts = [
      place(worldBox(1.6, 0.5, 1.6, 2), 0, 0.25, 0),
      place(worldBox(0.9, 2.4, 0.9, 2), 0, 1.6, 0),
      place(prep(new THREE.ConeGeometry(0.9, 1.2, 4)), 0, 3.3, 0, Math.PI / 4),
    ];
    const shrine = new THREE.Mesh(merge(parts), Mats().stoneWarm);
    shrine.position.copy(p);
    shrine.castShadow = true;
    this.group.add(shrine);
  }

  private buildFog(): void {
    const layers: Array<[number, number, number, number, number]> = [
      // [y, cx, cz, size, opacity]
      [24, 0, -500, 2600, 0.32],
      [48, -60, -900, 1200, 0.22],
      [10, 60, -1000, 2600, 0.45],
      [72, -720, -1100, 1000, 0.22],
    ];
    for (const [y, cx, cz, size, op] of layers) {
      const mat = this.fogMat.clone();
      mat.opacity = op;
      mat.map = Tex.fogNoise().clone();
      mat.map.repeat.set(size / 260, size / 260);
      mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
      mat.map.needsUpdate = true;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(cx, y, cz);
      mesh.renderOrder = 2;
      this.fogSheets.push(mesh);
      this.group.add(mesh);
    }
  }

  update(dt: number, elapsed: number): void {
    WindUniforms.uTime.value = elapsed;
    this.fogSheets.forEach((f, i) => {
      const map = (f.material as THREE.MeshBasicMaterial).map;
      if (map) {
        map.offset.x += dt * 0.004 * (i % 2 ? 1 : -0.7);
        map.offset.y += dt * 0.002;
      }
    });
  }
}
