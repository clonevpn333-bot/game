import * as THREE from 'three';
import { ghibli, addOutline, toonMaterial } from '../gfx/Toon';
import { WORLD_TIME } from '../gfx/Materials';
import { fbm, noise2 } from '../util/math';
import { merge, rng, tint, xf } from './Kit';

/**
 * Painted landscapes: heightfield terrain with brushed colour fields, dense
 * meadow grass (opaque clumps on a dark base, waves of wind sheen rolling
 * through), puffy painted trees whose foliage is shaded as one soft volume,
 * boulders, and layered mountain ridges fading into the sky.
 */

const GLSL_NOISE = /* glsl */ `
  float gH(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float gN(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(gH(i), gH(i+vec2(1,0)), u.x), mix(gH(i+vec2(0,1)), gH(i+vec2(1,1)), u.x), u.y); }
`;

/** Shared wind + up to six "pushers" (characters, hooves) that part the grass. */
export const WIND = {
  dir: { value: new THREE.Vector2(0.8, 0.6).normalize() },
  strength: { value: 1 },
  pushers: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, -999, 0, 0)) },
};

// ================================================================================ terrain
export interface TerrainOpts {
  size: number;
  seg: number;
  center?: [number, number];
  height: (x: number, z: number) => number;
  /** base colour of the ground at a point */
  color: (x: number, z: number, h: number, slope: number) => THREE.Color;
  /** grass density 0..1 at a point (also darkens the ground beneath) */
  grass?: (x: number, z: number, h: number, slope: number) => number;
  grassColor?: THREE.ColorRepresentation;
}

export class Terrain {
  readonly mesh: THREE.Mesh;
  readonly height: (x: number, z: number) => number;
  private readonly grassFn: ((x: number, z: number, h: number, s: number) => number) | null;

  constructor(o: TerrainOpts) {
    this.height = o.height;
    this.grassFn = o.grass ?? null;
    const geo = new THREE.PlaneGeometry(o.size, o.size, o.seg, o.seg);
    geo.rotateX(-Math.PI / 2);
    geo.translate(o.center?.[0] ?? 0, 0, o.center?.[1] ?? 0);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const gc = new THREE.Color(o.grassColor ?? '#3c5a22');
    const e = o.size / o.seg;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = o.height(x, z);
      pos.setY(i, h);
      const sx = o.height(x + e, z) - o.height(x - e, z);
      const sz = o.height(x, z + e) - o.height(x, z - e);
      const slope = Math.hypot(sx, sz) / (2 * e);
      const c = o.color(x, z, h, slope);
      if (this.grassFn) c.lerp(gc, Math.min(1, this.grassFn(x, z, h, slope) * 1.6));
      col.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshToonMaterial({ vertexColors: true });
    mat.onBeforeCompile = (s) =>
      ghibli(s, {
        brushScale: 4,
        color: `float st = gN(vTObj.xz * 0.9) * 0.6 + gN(vTObj.xz * 3.1 + 7.0) * 0.4;
          diffuseColor.rgb *= 0.86 + st * 0.26;`,
        fragDecl: GLSL_NOISE,
      });
    mat.customProgramCacheKey = () => 'terrain';
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
  }

  grassAt(x: number, z: number): number {
    if (!this.grassFn) return 0;
    const e = 1;
    const h = this.height(x, z);
    const slope = Math.hypot(this.height(x + e, z) - this.height(x - e, z), this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
    return this.grassFn(x, z, h, slope);
  }
}

// ================================================================================ grass
export interface GrassOpts {
  /** clumps per square metre at full density */
  density?: number;
  height?: number;
  root: THREE.ColorRepresentation;
  tip: THREE.ColorRepresentation;
  /** patch colour mixed in by large-scale noise (dry or lush) */
  patch?: THREE.ColorRepresentation;
  flowers?: THREE.ColorRepresentation[];
  radius?: number;
  chunk?: number;
}

function clumpGeometry(blades: number, height: number, width: number, seed: number, flower: THREE.Color | null, SEG = 4): THREE.BufferGeometry {
  const r = rng(seed);
  const pos: number[] = [];
  const hgt: number[] = [];
  const fc: number[] = [];
  const idx: number[] = [];
  for (let b = 0; b < blades; b++) {
    const a = r() * Math.PI * 2;
    const rad = Math.sqrt(r()) * 0.28;
    const bx = Math.cos(a) * rad;
    const bz = Math.sin(a) * rad;
    const yaw = r() * Math.PI * 2;
    const lean = 0.15 + r() * 0.35;
    const h = height * (0.6 + r() * 0.55);
    const w = width * (0.7 + r() * 0.6);
    const dx = Math.cos(yaw);
    const dz = Math.sin(yaw);
    const base = pos.length / 3;
    for (let s = 0; s <= SEG; s++) {
      const t = s / SEG;
      const bend = lean * t * t * h;
      const cx = bx + Math.cos(yaw + Math.PI / 2) * bend;
      const cz = bz + Math.sin(yaw + Math.PI / 2) * bend;
      const y = h * t * (1 - lean * 0.25 * t);
      const ww = w * (1 - t) * (1 - t * 0.2);
      pos.push(cx - dx * ww, y, cz - dz * ww, cx + dx * ww, y, cz + dz * ww);
      hgt.push(t, t);
      fc.push(0, 0, 0, 0, 0, 0, 0, 0);
    }
    for (let s = 0; s < SEG; s++) {
      const i0 = base + s * 2;
      idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
    }
  }
  if (flower) {
    // a stem and a five-petal head, held a little above the blades
    for (let k = 0; k < 2; k++) {
      const fx = (r() - 0.5) * 0.3;
      const fz = (r() - 0.5) * 0.3;
      const fh = height * (1.0 + r() * 0.3);
      const base = pos.length / 3;
      pos.push(fx - 0.006, 0, fz, fx + 0.006, 0, fz, fx - 0.004, fh, fz, fx + 0.004, fh, fz);
      hgt.push(0, 0, 0.9, 0.9);
      fc.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      const c0 = pos.length / 3;
      pos.push(fx, fh + 0.01, fz);
      hgt.push(1);
      fc.push(1, 0.95, 0.6, 1);
      const R = 0.045 + r() * 0.02;
      for (let p = 0; p < 10; p++) {
        const a = (p / 10) * Math.PI * 2;
        const rr = p % 2 ? R * 0.45 : R;
        pos.push(fx + Math.cos(a) * rr, fh + 0.005, fz + Math.sin(a) * rr);
        hgt.push(1);
        fc.push(flower.r, flower.g, flower.b, 1);
      }
      for (let p = 0; p < 10; p++) idx.push(c0, c0 + 1 + ((p + 1) % 10), c0 + 1 + p);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('hgt', new THREE.Float32BufferAttribute(hgt, 1));
  g.setAttribute('fcol', new THREE.Float32BufferAttribute(fc, 4));
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

function grassMaterial(o: GrassOpts): THREE.MeshToonMaterial {
  const m = new THREE.MeshToonMaterial({ side: THREE.DoubleSide });
  const root = new THREE.Color(o.root);
  const tip = new THREE.Color(o.tip);
  const patch = new THREE.Color(o.patch ?? o.tip);
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = WORLD_TIME;
    s.uniforms.uWind = WIND.dir;
    s.uniforms.uWindS = WIND.strength;
    s.uniforms.uPush = WIND.pushers;
    s.uniforms.uRoot = { value: root };
    s.uniforms.uTip = { value: tip };
    s.uniforms.uPatch = { value: patch };
    ghibli(s, {
      brushScale: 2,
      vertDecl: `attribute float hgt; attribute vec4 fcol; varying float vH; varying float vGust; varying vec4 vF; varying vec2 vRoot;
        uniform float uTime, uWindS; uniform vec2 uWind; uniform vec4 uPush[6];
        ${GLSL_NOISE}`,
      vertBody: `
        vec3 rootW = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float sc = length(instanceMatrix[0].xyz);
        vec2 q = rootW.xz * 0.045 - uWind * uTime * 0.32;
        float gust = gN(q) * 0.7 + gN(q * 2.7 + 3.0) * 0.3;
        float hh = hgt * hgt;
        vec2 off = uWind * (0.12 + gust * 0.55) * uWindS * hh;
        off += vec2(sin(uTime * 2.1 + rootW.x * 0.7), cos(uTime * 1.7 + rootW.z * 0.9)) * 0.035 * hh;
        for (int i = 0; i < 6; i++) {
          vec2 d = rootW.xz - uPush[i].xz;
          float L = length(d);
          float f = (1.0 - smoothstep(uPush[i].w * 0.3, uPush[i].w, L)) * step(0.001, uPush[i].w);
          off += d / max(L, 0.05) * f * 0.6 * hgt;
          transformed.y -= f * 0.35 * hgt * sc;
        }
        transformed.xz += off / max(sc, 0.01);
        transformed.y -= length(off) * 0.35 * hgt / max(sc, 0.01);
        vH = hgt; vGust = gust; vF = fcol; vRoot = rootW.xz;`,
      fragDecl: `varying float vH; varying float vGust; varying vec4 vF; varying vec2 vRoot; uniform vec3 uRoot, uTip, uPatch;
        ${GLSL_NOISE}`,
      color: `float pn = gN(vRoot * 0.03) * 0.6 + gN(vRoot * 0.11) * 0.4;
        vec3 tipC = mix(uTip, uPatch, smoothstep(0.45, 0.75, pn));
        vec3 gc = mix(uRoot, tipC, pow(vH, 0.9));
        #ifdef USE_INSTANCING_COLOR
          gc *= vColor;
        #endif
        gc *= 1.0 + smoothstep(0.55, 0.85, vGust) * vH * 0.28;
        diffuseColor.rgb = mix(gc, vF.rgb, vF.a);`,
    });
    // both faces of a blade take the up-facing (painted) normal
    s.fragmentShader = s.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  m.customProgramCacheKey = () => 'grass';
  return m;
}

interface Chunk {
  key: string;
  meshes: THREE.InstancedMesh[];
  lod: number;
}

/** Streams grass chunks around a focus point. */
export class Grass {
  readonly group = new THREE.Group();
  private readonly chunks = new Map<string, Chunk>();
  private readonly mat: THREE.MeshToonMaterial;
  private readonly geos: THREE.BufferGeometry[][]; // [lod][variant]
  private readonly o: Required<Pick<GrassOpts, 'density' | 'height' | 'radius' | 'chunk'>> & GrassOpts;
  private budget = 0;

  constructor(private readonly terrain: Terrain, o: GrassOpts) {
    this.o = { density: 3.4, height: 0.75, radius: 62, chunk: 14, ...o };
    this.mat = grassMaterial(this.o);
    const fl = (o.flowers ?? ['#ffffff', '#ffe066', '#f4a0c0']).map((c) => new THREE.Color(c));
    const H = this.o.height;
    this.geos = [
      [clumpGeometry(20, H, 0.062, 1, null, 3), clumpGeometry(20, H, 0.062, 2, null, 3), clumpGeometry(12, H, 0.05, 3, fl[0], 3), clumpGeometry(12, H, 0.05, 4, fl[1 % fl.length], 3), clumpGeometry(12, H, 0.05, 5, fl[2 % fl.length], 3)],
      [clumpGeometry(7, H, 0.085, 6, null, 2), clumpGeometry(7, H, 0.085, 7, null, 2), clumpGeometry(6, H, 0.085, 8, fl[0], 2), clumpGeometry(6, H, 0.085, 9, fl[1 % fl.length], 2), clumpGeometry(6, H, 0.085, 10, fl[2 % fl.length], 2)],
    ];
  }

  private build(cx: number, cz: number, lod: number): Chunk {
    const S = this.o.chunk;
    const r = rng((cx * 73856093) ^ (cz * 19349663));
    const perVariant: THREE.Matrix4[][] = this.geos[lod].map(() => []);
    const cols: THREE.Color[][] = this.geos[lod].map(() => []);
    const n = Math.round(S * S * this.o.density * (lod ? 0.6 : 1));
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const x = (cx + r()) * S;
      const z = (cz + r()) * S;
      const d = this.terrain.grassAt(x, z);
      if (d <= 0 || r() > d) continue;
      const y = this.terrain.height(x, z);
      const s = (0.75 + r() * 0.5) * (0.6 + d * 0.5) * (lod ? 1.35 : 1);
      m.makeScale(s, s * (0.85 + r() * 0.3), s).setPosition(x, y - 0.02, z);
      const fv = r();
      const flowerP = (this.o.flowers?.length ?? 3) ? 0.07 : 0;
      const v = fv < flowerP ? 2 + Math.floor(r() * 3) : fv < 0.5 ? 0 : 1;
      perVariant[v].push(m.clone());
      const k = 0.88 + r() * 0.24;
      cols[v].push(new THREE.Color(k, k * (0.97 + r() * 0.06), k * 0.95));
    }
    const meshes: THREE.InstancedMesh[] = [];
    perVariant.forEach((list, v) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(this.geos[lod][v], this.mat, list.length);
      list.forEach((mm, i) => {
        im.setMatrixAt(i, mm);
        im.setColorAt(i, cols[v][i]);
      });
      im.receiveShadow = true;
      im.castShadow = false;
      im.computeBoundingSphere();
      this.group.add(im);
      meshes.push(im);
    });
    return { key: `${cx},${cz}`, meshes, lod };
  }

  private drop(c: Chunk): void {
    for (const m of c.meshes) {
      m.removeFromParent();
      m.dispose();
    }
    this.chunks.delete(c.key);
  }

  /** Stream chunks around the focus (limited builds per frame). */
  update(focus: THREE.Vector3, maxBuilds = 6): void {
    const S = this.o.chunk;
    const R = this.o.radius;
    const fx = Math.floor(focus.x / S);
    const fz = Math.floor(focus.z / S);
    const rc = Math.ceil(R / S);
    this.budget = maxBuilds;
    const want = new Set<string>();
    const todo: [number, number, number, number][] = [];
    for (let dz = -rc; dz <= rc; dz++) {
      for (let dx = -rc; dx <= rc; dx++) {
        const cx = fx + dx;
        const cz = fz + dz;
        const ccx = (cx + 0.5) * S - focus.x;
        const ccz = (cz + 0.5) * S - focus.z;
        const d = Math.hypot(ccx, ccz);
        if (d > R + S * 0.7) continue;
        const lod = d < 22 ? 0 : 1;
        const key = `${cx},${cz}`;
        want.add(key);
        const have = this.chunks.get(key);
        if (!have || have.lod !== lod) todo.push([d, cx, cz, lod]);
      }
    }
    todo.sort((a, b) => a[0] - b[0]);
    for (const [, cx, cz, lod] of todo) {
      if (this.budget-- <= 0) break;
      const key = `${cx},${cz}`;
      const have = this.chunks.get(key);
      if (have) this.drop(have);
      this.chunks.set(key, this.build(cx, cz, lod));
    }
    for (const c of [...this.chunks.values()]) if (!want.has(c.key)) this.drop(c);
  }

  /** Build everything around a point immediately (before a shot starts). */
  prime(focus: THREE.Vector3): void {
    this.update(focus, 999);
  }

  dispose(): void {
    for (const c of [...this.chunks.values()]) this.drop(c);
    for (const l of this.geos) for (const g of l) g.dispose();
    this.mat.dispose();
  }
}

/** Write up to six grass pushers (characters / hooves). */
export function setPushers(list: { x: number; z: number; r: number }[]): void {
  const p = WIND.pushers.value;
  for (let i = 0; i < p.length; i++) {
    const s = list[i];
    if (s) p[i].set(s.x, 0, s.z, s.r);
    else p[i].set(0, -999, 0, 0);
  }
}

// ================================================================================ trees
export interface TreeKind {
  leaf: THREE.ColorRepresentation;
  leafDark: THREE.ColorRepresentation;
  trunk: THREE.ColorRepresentation;
  shape: 'round' | 'tall' | 'pine';
}

function canopyGeometry(shape: TreeKind['shape'], seed: number): THREE.BufferGeometry {
  const r = rng(seed);
  const parts: THREE.BufferGeometry[] = [];
  const blobs: [number, number, number, number][] = [];
  if (shape === 'pine') {
    for (let k = 0; k < 5; k++) {
      const y = 2.5 + k * 1.7;
      const rad = 2.6 - k * 0.45;
      const g = new THREE.ConeGeometry(rad, 2.6, 9, 2);
      parts.push(xf(g, [0, y + 1, 0], [0, r() * 3, 0]));
    }
  } else {
    const n = shape === 'round' ? 9 : 7;
    for (let k = 0; k < n; k++) {
      const a = r() * Math.PI * 2;
      const rr = (shape === 'round' ? 2.0 : 1.2) * Math.sqrt(r());
      const y = shape === 'round' ? 5.2 + r() * 2.6 : 4 + (k / n) * 6;
      const rad = (shape === 'round' ? 1.9 : 1.5) + r() * 1.0;
      blobs.push([Math.cos(a) * rr, y, Math.sin(a) * rr, rad]);
    }
    blobs.push([0, shape === 'round' ? 7.6 : 10.6, 0, shape === 'round' ? 2.4 : 1.6]);
    for (const [x, y, z, rad] of blobs) parts.push(xf(new THREE.IcosahedronGeometry(rad, 2), [x, y, z]));
  }
  const g = merge(parts.map((p) => tint(p, '#fff')));
  // soft volume normals: shade the whole canopy as one cloud of leaves
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  const col = g.attributes.color;
  const c = new THREE.Vector3(0, shape === 'pine' ? 5 : shape === 'round' ? 6.4 : 7, 0);
  const v = new THREE.Vector3();
  const nv = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const bump = 1 + noise2(v.x * 1.3 + seed, v.y * 1.3 + v.z) * 0.12;
    v.sub(c).multiply(new THREE.Vector3(bump, shape === 'pine' ? 1 : bump, bump)).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
    nv.fromBufferAttribute(nrm, i);
    const vol = v.clone().sub(c).normalize();
    nv.lerp(vol, 0.75).normalize();
    nrm.setXYZ(i, nv.x, nv.y, nv.z);
    // darker deep inside / underneath
    const k = THREE.MathUtils.clamp(0.55 + (v.y - c.y) * 0.1, 0.25, 1);
    col.setXYZ(i, k, k, k);
  }
  return g;
}

/** Instanced painted trees with swaying canopies. */
export class Trees {
  readonly group = new THREE.Group();

  constructor(points: { x: number; y: number; z: number; s?: number }[], kind: TreeKind, seed = 1) {
    if (!points.length) return;
    const canopy = canopyGeometry(kind.shape, seed);
    const trunkG = merge([
      tint(new THREE.CylinderGeometry(0.22, 0.42, kind.shape === 'pine' ? 5 : 6.2, 8).translate(0, kind.shape === 'pine' ? 2.5 : 3.1, 0), '#fff'),
      ...(kind.shape === 'pine' ? [] : [tint(xf(new THREE.CylinderGeometry(0.1, 0.2, 2.6, 6), [0.7, 4.6, 0], [0, 0, -0.7]), '#fff'), tint(xf(new THREE.CylinderGeometry(0.1, 0.18, 2.2, 6), [-0.6, 5.0, 0.3], [0.3, 0, 0.8]), '#fff')]),
    ]);
    const leafMat = new THREE.MeshToonMaterial({ vertexColors: true });
    const leaf = new THREE.Color(kind.leaf);
    const dark = new THREE.Color(kind.leafDark);
    leafMat.onBeforeCompile = (s) => {
      s.uniforms.uTime = WORLD_TIME;
      s.uniforms.uLeaf = { value: leaf };
      s.uniforms.uDark = { value: dark };
      ghibli(s, {
        brushScale: 1.2,
        vertDecl: 'uniform float uTime;',
        vertBody: `vec3 wp0 = (modelMatrix * instanceMatrix * vec4(0.0,0.0,0.0,1.0)).xyz;
          float sw = sin(uTime * 0.9 + wp0.x * 0.13 + wp0.z * 0.07) * 0.5 + sin(uTime * 2.3 + wp0.z * 0.3) * 0.15;
          transformed.x += sw * 0.012 * transformed.y * transformed.y * 0.2;
          transformed.z += sw * 0.008 * transformed.y * transformed.y * 0.2;`,
        fragDecl: 'uniform vec3 uLeaf, uDark;',
        color: `diffuseColor.rgb = mix(uDark, uLeaf, vColor.r) * (0.9 + tBrushN * 0.2);`,
      });
    };
    leafMat.customProgramCacheKey = () => 'tree-leaf';
    const trunkMat = toonMaterial({ color: kind.trunk, brushScale: 0.5 });
    const n = points.length;
    const cm = new THREE.InstancedMesh(canopy, leafMat, n);
    const tm = new THREE.InstancedMesh(trunkG, trunkMat, n);
    const r = rng(seed * 13 + 7);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    points.forEach((p, i) => {
      const s = (p.s ?? 1) * (0.8 + r() * 0.45);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * Math.PI * 2);
      m.compose(new THREE.Vector3(p.x, p.y - 0.2, p.z), q, new THREE.Vector3(s, s * (0.9 + r() * 0.2), s));
      cm.setMatrixAt(i, m);
      tm.setMatrixAt(i, m);
      const k = 0.9 + r() * 0.2;
      cm.setColorAt(i, new THREE.Color(k, k, k));
    });
    for (const im of [cm, tm]) {
      im.castShadow = true;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      this.group.add(im);
    }
    addOutline(cm, 0.06, 1.1, new THREE.Color(kind.leafDark).multiplyScalar(0.45));
    addOutline(tm, 0.04, 1);
  }
}

// ================================================================================ rocks
export function rocks(points: { x: number; y: number; z: number; s: number }[], color: THREE.ColorRepresentation, seed = 3): THREE.Group {
  const g = new THREE.Group();
  if (!points.length) return g;
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const k = 1 + noise2(v.x * 2 + seed, v.y * 2 + v.z) * 0.22;
    p.setXYZ(i, v.x * k * 1.2, Math.max(-0.3, v.y * k * 0.75), v.z * k);
  }
  geo.computeVertexNormals();
  const m = new THREE.InstancedMesh(geo, toonMaterial({ color, brushScale: 0.6 }), points.length);
  const r = rng(seed);
  const mm = new THREE.Matrix4();
  points.forEach((pt, i) => {
    mm.compose(new THREE.Vector3(pt.x, pt.y, pt.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r() * 0.3, r() * 6, r() * 0.3)), new THREE.Vector3(pt.s, pt.s * (0.7 + r() * 0.5), pt.s));
    m.setMatrixAt(i, mm);
  });
  m.castShadow = m.receiveShadow = true;
  g.add(m);
  addOutline(m, 0.05, 1);
  return g;
}

// ================================================================================ mountains
/**
 * Layered ridgelines around the world (each layer lighter and bluer with
 * distance, like stacked painted flats).
 */
export function mountains(o: { radius: number; height: number; layers?: number; colors: THREE.ColorRepresentation[]; snow?: number; seed?: number; arc?: [number, number] }): THREE.Group {
  const g = new THREE.Group();
  const layers = o.layers ?? o.colors.length;
  const seed = o.seed ?? 1;
  const [a0, a1] = o.arc ?? [0, Math.PI * 2];
  for (let L = 0; L < layers; L++) {
    const R = o.radius * (1 + L * 0.28);
    const H = o.height * (1 + L * 0.35);
    const seg = 220;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const base = new THREE.Color(o.colors[L % o.colors.length]);
    const top = base.clone().lerp(new THREE.Color('#ffffff'), 0.12);
    const snow = new THREE.Color('#f4f6ff');
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (a1 - a0);
      const u = a * 3 + L * 17 + seed;
      const ridge = Math.max(0, fbm(u, L * 3.1 + seed, 5) * 0.9 + 0.45) * (0.4 + 0.6 * Math.abs(noise2(u * 0.3, L)));
      const h = H * ridge;
      const x = Math.sin(a) * R;
      const z = Math.cos(a) * R;
      pos.push(x, -60, z, x, h, z);
      col.push(base.r, base.g, base.b);
      const sn = o.snow && ridge > o.snow ? 0.8 : 0;
      const tc = top.clone().lerp(snow, sn);
      col.push(tc.r, tc.g, tc.b);
      if (i < seg) {
        const k = i * 2;
        idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, fog: true }));
    m.renderOrder = -5;
    g.add(m);
  }
  return g;
}
