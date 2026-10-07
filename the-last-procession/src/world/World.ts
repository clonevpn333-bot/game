import * as THREE from 'three';
import { G, merge, xf, bellGeo } from '../render/Geo';
import { facadeTexture, roofTexture, stoneTexture, toon, radialTexture } from '../render/Materials';
import { fbm } from '../utils/math';

// ------------------------------------------------------------------ terrain
export function makeTerrain(opts: {
  size: number;
  seg: number;
  height: (x: number, z: number) => number;
  color: (x: number, z: number, h: number) => THREE.Color;
  center?: THREE.Vector2;
  roughness?: number;
  map?: THREE.Texture;
}): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(opts.size, opts.size, opts.seg, opts.seg);
  geo.rotateX(-Math.PI / 2);
  const cx = opts.center?.x ?? 0;
  const cz = opts.center?.y ?? 0;
  geo.translate(cx, 0, cz);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = opts.height(x, z);
    pos.setY(i, h);
    const c = opts.color(x, z, h);
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: opts.roughness ?? 0.95, metalness: 0, map: opts.map ?? null });
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

/** Distant jagged mountain silhouettes on a ring (fog does the aerial perspective). */
export function makeMountainRing(radius: number, count: number, height: number, color: THREE.ColorRepresentation, seed = 1, arc: [number, number] = [0, Math.PI * 2]): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const a = arc[0] + ((i + 0.5) / count) * (arc[1] - arc[0]);
    const h = height * (0.45 + 0.55 * Math.abs(Math.sin(i * 12.9898 * seed)));
    const r = radius * (0.92 + 0.16 * Math.abs(Math.sin(i * 4.1 + seed)));
    const w = (radius * (arc[1] - arc[0])) / count * 1.6;
    const g = new THREE.ConeGeometry(w * 0.6, h, 5 + (i % 3), 3);
    // jitter vertices for craggy silhouettes
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const y = p.getY(k);
      if (y < h / 2 - 1) {
        p.setX(k, p.getX(k) * (1 + Math.sin(k * 7.1 + i) * 0.18));
        p.setZ(k, p.getZ(k) * (1 + Math.cos(k * 3.3 + i) * 0.18));
        p.setY(k, y + Math.sin(k * 5.7 + i) * h * 0.06);
      }
    }
    parts.push(xf(g, [Math.sin(a) * r, h / 2 - 20, Math.cos(a) * r], [0, i, 0], [1, 1, 0.7]));
  }
  const geo = merge(parts);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  return m;
}

// ------------------------------------------------------------------ city kit
export interface BuildingSpec {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  rot?: number;
  roof?: 'gable' | 'flat' | 'dome' | 'spire';
  tint?: number;
}

/** Instanced townhouses: textured walls + tiled roofs. Instances can be "crushed". */
export class CityBlocks {
  readonly group = new THREE.Group();
  readonly walls: THREE.InstancedMesh;
  readonly roofs: THREE.InstancedMesh;
  readonly specs: BuildingSpec[];
  readonly alive: boolean[];

  constructor(specs: BuildingSpec[], seed = 1) {
    this.specs = specs;
    this.alive = specs.map(() => true);
    const wallTex = facadeTexture('#e8d5b5', seed);
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.85 });
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTexture('#b4553a', seed + 1), roughness: 0.8 });
    const wallGeo = new THREE.BoxGeometry(1, 1, 1);
    wallGeo.translate(0, 0.5, 0);
    // roof prism
    const roofGeo = new THREE.CylinderGeometry(0.72, 0.72, 1.04, 3, 1);
    roofGeo.rotateZ(Math.PI / 2);
    roofGeo.rotateX(Math.PI / 2 + Math.PI);
    roofGeo.rotateY(Math.PI / 2);
    roofGeo.scale(1.04, 0.62, 1);
    roofGeo.translate(0, 0.36, 0);
    this.walls = new THREE.InstancedMesh(wallGeo, wallMat, specs.length);
    this.roofs = new THREE.InstancedMesh(roofGeo, roofMat, specs.length);
    this.walls.castShadow = this.roofs.castShadow = true;
    this.walls.receiveShadow = this.roofs.receiveShadow = true;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    specs.forEach((s, i) => {
      this.setMatrix(i, 1, m);
      const t = s.tint ?? (Math.sin(i * 91.7) * 0.5 + 0.5);
      c.setHSL(0.08 + t * 0.04, 0.25 + t * 0.2, 0.78 + t * 0.12);
      this.walls.setColorAt(i, c);
      c.setHSL(0.03 + t * 0.03, 0.45 + t * 0.2, 0.55 + t * 0.15);
      this.roofs.setColorAt(i, c);
    });
    this.group.add(this.walls, this.roofs);
  }

  private setMatrix(i: number, k: number, m: THREE.Matrix4): void {
    const s = this.specs[i];
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), s.rot ?? 0);
    m.compose(new THREE.Vector3(s.x, 0, s.z), q, new THREE.Vector3(s.w, s.h * k, s.d));
    this.walls.setMatrixAt(i, m);
    m.compose(new THREE.Vector3(s.x, s.h * k, s.z), q, new THREE.Vector3(s.w, Math.min(s.w, s.d) * 0.9 * k, s.d));
    this.roofs.setMatrixAt(i, m);
  }

  /** Crush buildings inside a radius; returns crushed centers for debris FX. */
  crush(x: number, z: number, r: number): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    const m = new THREE.Matrix4();
    this.specs.forEach((s, i) => {
      if (!this.alive[i]) return;
      if (Math.hypot(s.x - x, s.z - z) < r + Math.max(s.w, s.d) * 0.4) {
        this.alive[i] = false;
        this.setMatrix(i, 0.12, m);
        out.push(new THREE.Vector3(s.x, s.h * 0.5, s.z));
      }
    });
    if (out.length) {
      this.walls.instanceMatrix.needsUpdate = true;
      this.roofs.instanceMatrix.needsUpdate = true;
    }
    return out;
  }

  rects(pad = 0): { x0: number; x1: number; z0: number; z1: number; i: number }[] {
    return this.specs
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !s.rot || Math.abs(Math.sin(s.rot * 2)) < 0.01)
      .map(({ s, i }) => {
        const swap = s.rot && Math.abs(Math.sin(s.rot)) > 0.5;
        const w = swap ? s.d : s.w;
        const d = swap ? s.w : s.d;
        return { x0: s.x - w / 2 - pad, x1: s.x + w / 2 + pad, z0: s.z - d / 2 - pad, z1: s.z + d / 2 + pad, i };
      });
  }
}

/** A cathedral with a bell tower (landmark for the plaza). */
export function makeCathedral(): THREE.Group {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ map: stoneTexture('#e6d6b8', 5, 10), roughness: 0.85 });
  const roof = new THREE.MeshStandardMaterial({ color: '#5d7a8c', roughness: 0.6, metalness: 0.3 });
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b25a', roughness: 0.3, metalness: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: '#2a2040', emissive: '#ffb45a', emissiveIntensity: 1.6 });
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  add(merge([xf(G.box(30, 26, 56), [0, 13, 0]), xf(G.box(52, 18, 16), [0, 9, 6]), xf(G.box(14, 62, 14), [0, 31, -32]), xf(G.box(10, 30, 10), [-18, 15, 26]), xf(G.box(10, 30, 10), [18, 15, 26])]), stone);
  add(merge([xf(G.cyl(0.6, 22, 12, 4), [0, 32, 0], [Math.PI / 2, 0, Math.PI / 4], [1, 2.6, 0.75]), xf(G.cone(10, 34, 4), [0, 79, -32], [0, Math.PI / 4, 0]), xf(G.cone(7.5, 16, 4), [-18, 38, 26], [0, Math.PI / 4, 0]), xf(G.cone(7.5, 16, 4), [18, 38, 26], [0, Math.PI / 4, 0])]), roof);
  add(merge([xf(G.cyl(5.5, 5.5, 1.2, 24), [0, 16, 28.4], [Math.PI / 2, 0, 0]), xf(G.box(3, 10, 0.6), [-9, 14, 28.2]), xf(G.box(3, 10, 0.6), [9, 14, 28.2]), xf(G.box(4, 8, 0.6), [0, 50, -24.8])]), glass);
  add(merge([xf(G.sph(1.2, 8, 6), [0, 97, -32]), xf(bellGeo(3.2), [0, 44, -32])]), gold);
  return g;
}

// ------------------------------------------------------------------ crowd
/** Instanced townsfolk with idle bob / cheering. */
export class Crowd {
  readonly group = new THREE.Group();
  private readonly bodies: THREE.InstancedMesh;
  private readonly heads: THREE.InstancedMesh;
  readonly pts: THREE.Vector3[];
  private readonly phase: number[];
  readonly yaw: number[];
  panic = 0;
  lookAt: THREE.Vector3 | null = null;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();

  constructor(points: THREE.Vector3[]) {
    this.pts = points.map((p) => p.clone());
    this.phase = points.map((_, i) => (Math.sin(i * 17.3) * 0.5 + 0.5) * Math.PI * 2);
    this.yaw = points.map(() => 0);
    const bodyGeo = merge([xf(G.cyl(0.18, 0.3, 1.1, 6), [0, 0.55, 0]), xf(G.cyl(0.22, 0.18, 0.35, 6), [0, 1.25, 0])]);
    const headGeo = xf(G.sph(0.17, 6, 5), [0, 1.62, 0]);
    this.bodies = new THREE.InstancedMesh(bodyGeo, toon('#ffffff'), points.length);
    this.heads = new THREE.InstancedMesh(headGeo, toon('#ffffff'), points.length);
    const c = new THREE.Color();
    const cloth = ['#8a3b32', '#3d5a8a', '#6b7a3a', '#c79a52', '#5a3a6a', '#a8643a', '#2f6a68', '#d8cbb0'];
    const skins = ['#e9b48c', '#c99272', '#8a5a40', '#f3d2bd', '#a8704e'];
    points.forEach((_, i) => {
      c.set(cloth[i % cloth.length]);
      this.bodies.setColorAt(i, c);
      c.set(skins[(i * 7) % skins.length]);
      this.heads.setColorAt(i, c);
    });
    this.bodies.castShadow = true;
    this.group.add(this.bodies, this.heads);
    this.update(0, 0);
  }

  update(dt: number, time: number): void {
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    for (let i = 0; i < this.pts.length; i++) {
      const base = this.pts[i];
      if (this.panic > 0) {
        // scatter away from the panic center
        base.x += Math.sin(this.phase[i] * 3) * dt * 4 * this.panic;
        base.z += Math.cos(this.phase[i] * 3) * dt * 4 * this.panic;
      }
      const bob = Math.abs(Math.sin(time * (2 + this.panic * 6) + this.phase[i])) * (0.04 + this.panic * 0.12);
      p.set(base.x, base.y + bob, base.z);
      let y = this.yaw[i];
      if (this.lookAt) y = Math.atan2(this.lookAt.x - base.x, this.lookAt.z - base.z);
      this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), y);
      s.setScalar(0.92 + (i % 5) * 0.04);
      this.m.compose(p, this.q, s);
      this.bodies.setMatrixAt(i, this.m);
      this.heads.setMatrixAt(i, this.m);
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ birds
export class Birds {
  readonly mesh: THREE.InstancedMesh;
  private readonly data: { r: number; h: number; a: number; s: number; ph: number }[] = [];
  center = new THREE.Vector3();
  private readonly m = new THREE.Matrix4();

  constructor(count: number, center: THREE.Vector3, radius: number, height: number, color = '#1a1418') {
    this.center.copy(center);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.4, -1.2, 0.3, -0.2, 0, 0, -0.3, 0, 0, 0.4, 1.2, 0.3, -0.2, 0, 0, -0.3]), 3));
    g.computeVertexNormals();
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: true }), count);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < count; i++) this.data.push({ r: radius * (0.6 + Math.random() * 0.6), h: height + (Math.random() - 0.5) * height * 0.3, a: Math.random() * Math.PI * 2, s: (0.08 + Math.random() * 0.06) * (Math.random() < 0.5 ? 1 : -1), ph: Math.random() * 10 });
  }

  update(dt: number, time: number): void {
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    this.data.forEach((b, i) => {
      b.a += b.s * dt;
      p.set(this.center.x + Math.cos(b.a) * b.r, this.center.y + b.h + Math.sin(time * 0.7 + b.ph) * 4, this.center.z + Math.sin(b.a) * b.r);
      q.setFromEuler(new THREE.Euler(0, -b.a + (b.s > 0 ? 0 : Math.PI), Math.sin(time + b.ph) * 0.3));
      const flap = 0.4 + Math.abs(Math.sin(time * 9 + b.ph)) * 0.9;
      sc.set(2.2, 2.2 * flap, 2.2);
      this.m.compose(p, q, sc);
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ vegetation
export function makeTrees(points: THREE.Vector3[], palette: { leaf: string; trunk: string } = { leaf: '#3f6b3a', trunk: '#5a3a26' }, scale = 1): THREE.Group {
  const g = new THREE.Group();
  const leafGeo = merge([xf(G.cone(2.4, 4.5, 7), [0, 5.5, 0]), xf(G.cone(1.9, 3.8, 7), [0, 7.6, 0]), xf(G.cone(1.3, 3, 7), [0, 9.4, 0])]);
  const trunkGeo = xf(G.cyl(0.25, 0.4, 3.6, 6), [0, 1.8, 0]);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: palette.leaf, roughness: 0.9, flatShading: true }), points.length);
  const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: palette.trunk, roughness: 1 }), points.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  points.forEach((p, i) => {
    const s = scale * (0.7 + (Math.sin(i * 12.9) * 0.5 + 0.5) * 0.7);
    m.compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i), new THREE.Vector3(s, s, s));
    leaves.setMatrixAt(i, m);
    trunks.setMatrixAt(i, m);
    c.set(palette.leaf).offsetHSL((Math.sin(i * 3.1) * 0.03), 0, Math.sin(i * 1.7) * 0.06);
    leaves.setColorAt(i, c);
  });
  leaves.castShadow = trunks.castShadow = true;
  leaves.receiveShadow = true;
  g.add(leaves, trunks);
  return g;
}

/** Wind-swept grass cards with a vertex sway shader (instanced, one draw call). */
export function makeGrass(count: number, area: (i: number) => THREE.Vector3 | null, color: string, tip: string, height = 1.1): { mesh: THREE.InstancedMesh; mat: THREE.MeshStandardMaterial } {
  // tapered blade (wide base, pointed tip) so it reads as grass, not a card
  const blade = new THREE.BufferGeometry();
  const bw = 0.11;
  blade.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-bw, 0, 0, bw, 0, 0, -bw * 0.6, height * 0.5, 0, bw * 0.6, height * 0.5, 0, 0, height, 0]), 3));
  blade.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  blade.computeVertexNormals();
  const cols = new Float32Array(blade.attributes.position.count * 3);
  const c0 = new THREE.Color(color);
  const c1 = new THREE.Color(tip);
  for (let i = 0; i < blade.attributes.position.count; i++) {
    const k = blade.attributes.position.getY(i) / height;
    const c = c0.clone().lerp(c1, k);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  blade.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.95 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    mat.userData.shader = shader;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float ph = instanceMatrix[3].x * 0.15 + instanceMatrix[3].z * 0.11;
       float h = max(position.y, 0.0);
       transformed.x += (sin(uTime * 1.8 + ph) * 0.25 + 0.2) * h * h;
       transformed.z += cos(uTime * 1.3 + ph) * 0.12 * h * h;`,
    );
  };
  mat.customProgramCacheKey = () => 'grass-sway';
  const mesh = new THREE.InstancedMesh(blade, mat, count);
  const m = new THREE.Matrix4();
  let n = 0;
  for (let i = 0; i < count; i++) {
    const p = area(i);
    if (!p) continue;
    const s = 0.7 + ((i * 7919) % 100) / 160;
    m.compose(p, new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.sin(i * 1.3) * 0.25, i * 2.4, Math.cos(i * 0.7) * 0.25)), new THREE.Vector3(s, s * (0.7 + ((i * 31) % 10) / 15), s));
    mesh.setMatrixAt(n++, m);
  }
  mesh.count = n;
  mesh.receiveShadow = true;
  return { mesh, mat };
}

export function updateGrass(mat: THREE.Material, time: number): void {
  const s = mat.userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
  if (s) s.uniforms.uTime.value = time;
}

// ------------------------------------------------------------------ banners, lanterns, glow cards
export function makeBanner(color: string, w = 1.6, h = 5): { group: THREE.Group; cloth: THREE.Mesh } {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(G.cyl(0.08, 0.08, h + 1.5, 6), new THREE.MeshStandardMaterial({ color: '#4a3020' }));
  pole.position.y = (h + 1.5) / 2;
  const geo = new THREE.PlaneGeometry(w, h, 1, 8);
  geo.translate(w / 2, -h / 2, 0);
  const cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.9 }));
  cloth.position.set(0.08, h + 1.4, 0);
  cloth.castShadow = true;
  group.add(pole, cloth);
  return { group, cloth };
}

export function waveBanner(cloth: THREE.Mesh, time: number, strength = 1): void {
  const p = (cloth.geometry as THREE.BufferGeometry).attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, Math.sin(time * 3 + y * 0.8 + x * 2) * 0.25 * x * strength);
  }
  p.needsUpdate = true;
}

export function glowCard(color: THREE.ColorRepresentation, size: number, opacity = 0.6): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

const fogBanks = new Set<THREE.Group>();

/** Large soft cloud/fog billboards for atmospheric depth around giants. They fade
 * out as the camera approaches so they add aerial depth without whiting out shots. */
export function fogBank(count: number, center: THREE.Vector3, spread: THREE.Vector3, size: number, color: string, opacity = 0.35): THREE.Group {
  const g = new THREE.Group();
  g.userData.opacity = opacity;
  g.userData.size = size;
  fogBanks.add(g);
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({ map: radialTexture(), color, transparent: true, opacity, depthWrite: false, fog: true });
    const s = new THREE.Sprite(mat);
    s.position.set(center.x + (Math.random() - 0.5) * spread.x, center.y + (Math.random() - 0.5) * spread.y, center.z + (Math.random() - 0.5) * spread.z);
    s.scale.set(size * (0.7 + Math.random() * 0.8), size * 0.45 * (0.7 + Math.random() * 0.6), 1);
    g.add(s);
  }
  return g;
}

const tmpW = new THREE.Vector3();
export function updateFogBanks(cam: THREE.Vector3): void {
  for (const g of fogBanks) {
    if (!g.parent) {
      fogBanks.delete(g);
      continue;
    }
    const near = (g.userData.size as number) * 0.9;
    for (const c of g.children) {
      const s = c as THREE.Sprite;
      const d = s.getWorldPosition(tmpW).distanceTo(cam);
      const k = Math.min(1, Math.max(0, (d - near) / near));
      s.material.opacity = (g.userData.opacity as number) * k * k;
      s.visible = k > 0.01;
    }
  }
}

export function fieldHeight(x: number, z: number, amp: number, scale: number): number {
  return fbm(x * scale, z * scale, 4) * amp;
}
