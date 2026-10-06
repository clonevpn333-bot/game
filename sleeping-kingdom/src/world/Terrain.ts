import * as THREE from 'three';
import { Path, type Zone } from './Path';
import { Mats } from './Materials';
import { roadEdges, roadMask, terrainMaterial } from './TerrainShader';
import { barkMaterial, broadleafTree, deadTree, firTree, foliageMaterial, forest, leafTex, needleTex } from './Trees';
import { Tex } from './Textures';
import { bridgeSpan, merge, place, prep, rockGeo, worldBox } from './geo';
import { createSeededRandom } from '../utils/random';
import { fbm, lerp, ridged, smoothstep } from '../utils/math';

const CITY_ZONES: Zone[] = ['gate', 'street', 'market', 'broken', 'stair', 'plaza'];

export const WindUniforms = { uTime: { value: 0 }, uWind: { value: 1 } };

export function windSway<T extends THREE.Material>(m: T, amount: number, key: string): T {
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

export type Biome = 'mountain' | 'witchwood' | 'marsh' | 'snow' | 'hollow';

/** Still water level of the Chapter III marsh. */
export const MARSH_WATER = 19.3;

export type TorchSpot = { pos: THREE.Vector3; zone: Zone; s: number };

export class Terrain {
  readonly group = new THREE.Group();
  readonly torches: TorchSpot[] = [];
  readonly fogSheets: THREE.Mesh[] = [];
  private readonly fogMat: THREE.MeshBasicMaterial;

  constructor(
    private readonly path: Path,
    readonly biome: Biome = 'mountain',
  ) {
    this.group.name = 'terrain';
    this.group.add(this.buildGround());
    this.group.add(this.buildRoad());
    if (biome === 'mountain') {
      this.group.add(this.buildBridge());
      this.buildProps();
    }
    this.fogMat = new THREE.MeshBasicMaterial({
      map: Tex.fogNoise(),
      color: '#7080a8',
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      fog: true,
    });
    // Ground mist is now height fog in the shaders (HeightFog.ts); no more flat fog sheets.
    void this.buildFog;
  }

  private grid: { x0: number; z0: number; cell: number; nx: number; nz: number; h: Float32Array } | null = null;

  /** Height of the rendered terrain surface (triangle-exact), for placing props without floating. */
  groundAt(x: number, z: number): number {
    const g = this.grid;
    if (!g) return this.height(x, z);
    const fx0 = (x - g.x0) / g.cell;
    const fz0 = (z - g.z0) / g.cell;
    if (fx0 < 0 || fz0 < 0 || fx0 >= g.nx || fz0 >= g.nz) return this.height(x, z);
    const ix = Math.floor(fx0);
    const iz = Math.floor(fz0);
    const fx = fx0 - ix;
    const fz = fz0 - iz;
    const w = g.nx + 1;
    const ha = g.h[iz * w + ix];
    const hb = g.h[(iz + 1) * w + ix];
    const hc = g.h[(iz + 1) * w + ix + 1];
    const hd = g.h[iz * w + ix + 1];
    if (fx + fz <= 1) return ha + (hd - ha) * fx + (hb - ha) * fz;
    return hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
  }

  /** Slope magnitude (rise per metre) at a point on the rendered surface. */
  slopeAt(x: number, z: number): number {
    const h = this.groundAt(x, z);
    return Math.hypot(this.groundAt(x + 1, z) - h, this.groundAt(x, z + 1) - h);
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
    const isl = smoothstep(0.52, 0.72, fbm(x * 0.028 + 3, z * 0.028 - 5, 3));
    if (this.biome === 'marsh') {
      // Reed flats and black water: the path is the only reliably dry ground.
      const fall = s.zone === 'causeway' ? smoothstep(hw + 0.4, hw + 4, d) : s.zone === 'village' ? smoothstep(hw + 3, hw + 22, d) : s.zone === 'shore' ? smoothstep(hw + 1, hw + 16, d) : smoothstep(hw + 2, hw + 9, d);
      const bed = MARSH_WATER - 1.6 + n1 * 1.6 + isl * 2.6;
      near = lerp(roadY - 0.35, bed, fall);
      const farM = 12 + fbm(x * 0.004 + 7, z * 0.004, 4) * 40 + ridged(x * 0.003 + 3, z * 0.003, 5) * 210 * smoothstep(260, 520, d);
      return lerp(near, farM, smoothstep(170, 420, d));
    }
    if (this.biome === 'snow') {
      let k: number;
      if (s.zone === 'ridge') {
        // Knife-edge: the world falls away on both sides.
        k = smoothstep(hw + 0.8, hw + 34, d);
        near = roadY - 0.35 - k * (78 + n1 * 26) + ridged(x * 0.04, z * 0.04, 3) * 4 * k;
      } else if (s.zone === 'camp') {
        k = smoothstep(hw + 4, hw + 42, d);
        near = roadY - 0.35 + k * (24 + n1 * 10) + ridged(x * 0.03, z * 0.03, 3) * 8 * k;
      } else if (s.zone === 'fort') {
        k = smoothstep(hw + 9, hw + 36, d);
        near = roadY - 0.35 + k * (34 + n1 * 12);
      } else {
        // The pass: a canyon between snow-loaded walls.
        k = smoothstep(hw + 2, hw + 30, d);
        near = roadY - 0.35 + k * (30 + n1 * 16) + ridged(x * 0.025, z * 0.025, 4) * 14 * k;
      }
      const farS = 20 + fbm(x * 0.004 + 7, z * 0.004, 4) * 60 + ridged(x * 0.0028 + 3, z * 0.0028, 5) * 420 * smoothstep(90, 380, d);
      return lerp(near, farS, smoothstep(110, 300, d));
    }
    if (this.biome === 'hollow') {
      let k: number;
      if (s.zone === 'sanctum') {
        k = smoothstep(hw + 6, hw + 26, d);
        near = roadY - 0.35 - k * (60 + n1 * 18);
        return lerp(near, 30 + fbm(x * 0.004, z * 0.004, 4) * 60 + ridged(x * 0.003, z * 0.003, 4) * 260 * smoothstep(200, 450, d), smoothstep(180, 360, d));
      }
      if (s.zone === 'crypt') {
        k = smoothstep(hw + 0.6, hw + 6, d);
        near = roadY - 0.35 + k * (26 + n1 * 6);
      } else if (s.zone === 'heart') {
        k = smoothstep(hw + 2, hw + 26, d);
        near = roadY - 0.35 + k * (66 + n1 * 16) + ridged(x * 0.03, z * 0.03, 3) * 10 * k;
      } else {
        k = smoothstep(hw + 2, hw + 34, d);
        near = roadY - 0.35 + k * (58 + n1 * 22) + ridged(x * 0.03, z * 0.03, 4) * 16 * k;
      }
      return lerp(near, roadY + 90 + n1 * 30, smoothstep(70, 160, d));
    }
    if (CITY_ZONES.includes(s.zone)) {
      // The cathedral stands past the end of the road: its grounds are part of the crown.
      const last = this.path.samples[this.path.samples.length - 1];
      const ax = x - last.pos.x;
      const az = z - last.pos.z;
      const along = ax * last.tangent.x + az * last.tangent.z;
      const lat = ax * last.right.x + az * last.right.z;
      const grounds = along > -14 && along < 150 && Math.abs(lat) < 58;
      // Rugged rim: the plateau edge wanders, and the cliff below it breaks into ledges.
      const wobble = fbm(x * 0.011 + 3, z * 0.011 - 7, 3) * 46 - 23;
      const ledge = (k: number) => ridged(x * 0.035, z * 0.035, 4) * 22 * k * (1 - k) * 2.2 + Math.floor(k * 5) * -1.5 * k;
      if (s.zone === 'plaza' && side < 0 && d > hw + 1 && !grounds) {
        // The eye-cliff: the city's sheer western face, where Osseran's eye opens.
        const k = smoothstep(hw + 1, hw + 18 + wobble * 0.2, d);
        near = roadY - 3 - 135 * k + n1 * 8 + ledge(k);
      } else {
        const rim = hw + 108 + wobble;
        const k = grounds ? smoothstep(150, 200, along) : smoothstep(rim, rim + 62, d);
        near = roadY - 0.4 - 128 * k + n1 * 10 * k + ledge(k);
      }
      blend = smoothstep(240, 360, d);
    } else if (s.zone === 'wood' || s.zone === 'chapel') {
      // Forest floor: gentle banks, roots and hollows, rising into wooded hills.
      const k = smoothstep(hw + 2, hw + 40, d);
      near = roadY - 0.35 + k * (5 + 9 * (0.5 + n1)) + ridged(x * 0.02, z * 0.02, 3) * 6 * k;
      blend = smoothstep(120, 260, d);
    } else if (s.zone === 'hamlet') {
      const k = smoothstep(hw + 6, hw + 40, d);
      near = roadY - 0.35 + k * 10 + n1 * 2 * k;
      blend = smoothstep(140, 280, d);
    } else if (s.zone === 'ribs') {
      // The basin: a flat arena ringed by steep, scorched slopes.
      const k = smoothstep(hw + 2, hw + 26, d);
      near = roadY - 0.35 + k * (34 + n1 * 10);
      blend = smoothstep(150, 300, d);
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
    const box = new THREE.Box3().setFromPoints(this.path.samples.map((s) => s.pos));
    const pad = this.biome === 'mountain' ? 330 : this.biome === 'hollow' ? 200 : 300;
    const x0 = Math.floor(box.min.x - pad);
    const x1 = Math.ceil(box.max.x + pad);
    const z0 = Math.floor(box.min.z - pad);
    const z1 = Math.ceil(box.max.z + pad);
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
    // Exact heightfield for prop placement (matches the rendered triangles).
    this.grid = { x0, z0, cell, nx, nz, h: new Float32Array(p.count) };
    for (let i = 0; i < p.count; i += 1) this.grid.h[i] = p.getY(i);
    // Vertex colour = baked cavity/valley occlusion only; materials come from the terrain shader.
    const colors = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i += 1) {
      const ix = i % (nx + 1);
      const iz = Math.floor(i / (nx + 1));
      const y = p.getY(i);
      let avg = 0;
      let cnt = 0;
      for (const [dx, dz] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2]]) {
        const jx = Math.min(nx, Math.max(0, ix + dx));
        const jz = Math.min(nz, Math.max(0, iz + dz));
        avg += this.grid.h[jz * (nx + 1) + jx];
        cnt += 1;
      }
      const cavity = Math.max(0, Math.min(1, (avg / cnt - y) / 6));
      const valley = smoothstep(40, -30, y) * 0.35;
      const ao = 1 - cavity * 0.45 - valley + fbm(p.getX(i) * 0.03, p.getZ(i) * 0.03, 2) * 0.12;
      colors[i * 3] = ao;
      colors[i * 3 + 1] = ao;
      colors[i * 3 + 2] = ao;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mask = roadMask(this.path.samples.filter((_, i) => i % 3 === 0).map((s) => ({ x: s.pos.x, z: s.pos.z, w: s.width })), x0, z0, x1, z1);
    const mesh = new THREE.Mesh(geo, terrainMaterial(this.biome, mask, [x0, z0, x1, z1]));
    mesh.receiveShadow = true;
    mesh.name = 'ground';
    return mesh;
  }

  private buildRoad(): THREE.Group {
    const g = new THREE.Group();
    const samples = this.path.samples;
    const positions: number[] = [];
    const uvs: number[] = [];
    const edges: number[] = [];
    const curbs: THREE.BufferGeometry[] = [];
    const cityZone = (z: string) => ['gate', 'street', 'market', 'broken', 'stair', 'plaza'].includes(z);
    const step = 2;
    for (let i = 0; i < samples.length - step; i += step) {
      const a = samples[i];
      const b = samples[Math.min(samples.length - 1, i + step)];
      const ha = a.width / 2 + (cityZone(a.zone) ? 0.6 : 1.8);
      const hb = b.width / 2 + (cityZone(b.zone) ? 0.6 : 1.8);
      const ea = cityZone(a.zone) ? 0.5 : 1;
      const eb = cityZone(b.zone) ? 0.5 : 1;
      edges.push(-ea, ea, -eb, ea, eb, -eb);
      const al = a.pos.clone().addScaledVector(a.right, -ha);
      const ar = a.pos.clone().addScaledVector(a.right, ha);
      const bl = b.pos.clone().addScaledVector(b.right, -hb);
      const br = b.pos.clone().addScaledVector(b.right, hb);
      const y = 0.05;
      // Counter-clockwise from above so the ribbon faces up.
      positions.push(al.x, al.y + y, al.z, ar.x, ar.y + y, ar.z, bl.x, bl.y + y, bl.z);
      positions.push(ar.x, ar.y + y, ar.z, br.x, br.y + y, br.z, bl.x, bl.y + y, bl.z);
      const va = a.s / 4;
      const vb = b.s / 4;
      uvs.push(-ha / 4, va, ha / 4, va, -hb / 4, vb, ha / 4, va, hb / 4, vb, -hb / 4, vb);
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
    geo.setAttribute('aEdge', new THREE.Float32BufferAttribute(edges, 1));
    geo.computeVertexNormals();
    const roadMat = (this.biome === 'mountain' ? Mats().cobble : this.biome === 'hollow' || this.biome === 'marsh' ? Mats().stoneDark : Mats().dirt).clone();
    if (this.biome === 'snow') roadMat.color.set('#c8c4c0');
    if (this.biome === 'marsh') roadMat.color.set('#7a8076');
    if (this.biome === 'hollow') roadMat.color.set('#8a7a70');
    const road = new THREE.Mesh(geo, roadEdges(roadMat, this.biome));
    road.receiveShadow = true;
    road.name = 'road';
    g.add(road);
    if (curbs.length) {
      const curbMesh = new THREE.Mesh(merge(curbs), Mats().stone);
      curbMesh.receiveShadow = true;
      curbMesh.castShadow = true;
      g.add(curbMesh);
    }

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
    const fir = [0, 1, 2].map((i) => firTree(100 + i * 7, 13 + i * 3));
    const oak = broadleafTree(301, 12);
    const deadT = [deadTree(401, 9), deadTree(402, 7)];
    const firLeaves = foliageMaterial(needleTex([34, 62, 44]), '#a8bcae', 'fir');
    const autumnLeaves = foliageMaterial(leafTex([150, 86, 34], 'autumn'), '#ffffff', 'oak', 0.008);
    const bark = barkMaterial(false);
    const barkDead = barkMaterial(true, '#b0aaa0');
    const trees = forest([
      ...fir.map((g) => ({ geo: g, wood: bark, leaves: firLeaves, shadow: true })),
      { geo: oak, wood: bark, leaves: autumnLeaves, shadow: true },
      ...deadT.map((g) => ({ geo: g, wood: barkDead, leaves: null, shadow: false })),
    ]);
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
    const rockMat = m.rock.clone();
    rockMat.bumpMap = rockMat.map;
    rockMat.bumpScale = 4;

    type Inst = { geo: THREE.BufferGeometry; mat: THREE.Material; mats: THREE.Matrix4[]; shadow: boolean };
    const sets: Record<string, Inst> = {
      rock: { geo: rockG, mat: rockMat, mats: [], shadow: true },
      grass: { geo: grassGeo, mat: grassMat, mats: [], shadow: false },
    };
    const rc = new Float32Array(rockG.attributes.position.count * 3).fill(1.15);
    rockG.setAttribute('color', new THREE.BufferAttribute(rc, 3));

    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const mtx = (x: number, y: number, z: number, s: number, sy: number, tilt: number) => {
      e.set((rng() - 0.5) * tilt, rng() * Math.PI * 2, (rng() - 0.5) * tilt);
      q.setFromEuler(e);
      return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, sy, s));
    };
    const add = (key: string, x: number, y: number, z: number, s: number, sy = s, tilt = 0) => sets[key].mats.push(mtx(x, y, z, s, sy, tilt));
    /** Trees are sunk by their slope so the uphill roots never hang in the air. */
    const tree = (kind: number, x: number, z: number, s: number, sy = s, tilt = 0) => {
      const y = this.groundAt(x, z) - 0.35 - this.slopeAt(x, z) * 1.1 * s;
      trees.add(kind, mtx(x, y, z, s, sy, tilt), this.path.distanceXZ(x, z, 8).d < 50);
    };

    for (let i = 0; i < 3000; i += 1) {
      const x = -340 + rng() * 720;
      const z = -1480 + rng() * 1790;
      const { d, index } = this.path.distanceXZ(x, z, 6);
      const sample = this.path.samples[index];
      const hw = sample.width / 2;
      if (d < hw + 3.5) continue;
      if (CITY_ZONES.includes(sample.zone) && d < hw + 90) continue;
      const y = this.groundAt(x, z);
      const slope = this.slopeAt(x, z);
      const r = rng();
      if (d < 40 && r < 0.55 && slope < 0.6 && sample.zone === 'road') add('grass', x, y - 0.05, z, 0.8 + rng() * 0.9);
      else if (slope > 1.2 && r < 0.5) {
        const rs = 1.2 + rng() * 3.5;
        add('rock', x, y - 0.5 - slope * rs * 0.75, z, rs, 1 + rng() * 3, 0.5);
      }
      else if (slope < 1.1 && r < 0.8) {
        if (y < 140) tree(rng() < 0.1 ? 3 : Math.floor(rng() * 3), x, z, 0.8 + rng() * 0.5, 0.8 + rng() * 0.6);
        else tree(rng() < 0.6 ? Math.floor(rng() * 3) : 4 + Math.floor(rng() * 2), x, z, 0.8 + rng() * 0.5);
      } else if (r < 0.86) tree(4 + Math.floor(rng() * 2), x, z, 0.7 + rng() * 0.6, 0.7 + rng() * 0.6, 0.3);
    }
    // Dense roadside grass and boulders along the mountain road.
    for (const s of this.path.samples) {
      if (s.zone !== 'road' || rng() > 0.6) continue;
      for (const side of [-1, 1]) {
        const off = s.width / 2 + 1.5 + rng() * 5;
        const p = s.pos.clone().addScaledVector(s.right, side * off);
        add('grass', p.x, this.groundAt(p.x, p.z) - 0.05, p.z, 0.7 + rng() * 0.8);
        if (rng() < 0.05) {
          const rs = 0.8 + rng() * 1.2;
          add('rock', p.x + side, this.groundAt(p.x + side, p.z) - 0.3 - this.slopeAt(p.x + side, p.z) * rs * 0.9, p.z, rs, 0.6 + rng(), 0.4);
        }
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
    trees.build(this.group);

    // Fence posts and rope along the cliff side of the road.
    const posts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < this.path.samples.length; i += 7) {
      const s = this.path.samples[i];
      if (s.zone !== 'road') continue;
      const cliffSide = Math.sin(s.s * 0.009 + 0.6) > 0 ? 1 : -1;
      const p = s.pos.clone().addScaledVector(s.right, cliffSide * (s.width / 2 + 2.2));
      posts.push(place(worldBox(0.3, 1.9, 0.3, 1), p.x, Math.min(s.pos.y, this.groundAt(p.x, p.z)) + 0.55, p.z, rng(), 1, 1, 1, (rng() - 0.5) * 0.3));
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
    base.y = this.groundAt(base.x, base.z) + 1;
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
    if (this.biome !== 'mountain') {
      // Ground mist pooled along the path instead of valley sheets.
      const tint: Record<string, [string, number]> = { witchwood: ['#6a9a88', 0.32], marsh: ['#4a5a58', 0.14], snow: ['#8a98b0', 0.12], hollow: ['#6a2a24', 0.16] };
      for (let s = 20; s < this.path.length; s += 55) {
        const a = this.path.at(s);
        const mat = this.fogMat.clone();
        mat.color.set(tint[this.biome][0]);
        mat.opacity = tint[this.biome][1];
        mat.map = Tex.fogNoise().clone();
        mat.map.repeat.set(0.6, 0.6);
        mat.map.wrapS = mat.map.wrapT = THREE.RepeatWrapping;
        mat.map.needsUpdate = true;
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(150, 150), mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(a.pos.x, a.pos.y + 0.7, a.pos.z);
        mesh.renderOrder = 2;
        this.fogSheets.push(mesh);
        this.group.add(mesh);
      }
      return;
    }
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
