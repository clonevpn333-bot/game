import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { createSeededRandom } from '../utils/random';
import { tfbm } from './Textures';
import { WindUniforms } from './Terrain';

/**
 * Card-based trees: real branching trunks plus alpha-tested needle/leaf cards with
 * "spherical" normals (pointing out from the crown centre) so foliage shades as a soft
 * volume instead of flat planes. Wind sway is applied in the vertex shader.
 */

function canvas(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, srgb = true): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const texCache = new Map<string, THREE.Texture>();

/** Conifer branch: a twig running left→right with dense needles. */
export function needleTex(tint: [number, number, number] = [36, 66, 44]): THREE.Texture {
  const key = `needle${tint.join()}`;
  if (texCache.has(key)) return texCache.get(key)!;
  const rng = createSeededRandom(7);
  const t = canvas(256, 128, (c) => {
    c.clearRect(0, 0, 256, 128);
    const twig = (x0: number, y0: number, x1: number, y1: number, len: number, depth: number) => {
      c.strokeStyle = 'rgb(48,34,24)';
      c.lineWidth = depth === 0 ? 3 : 1.5;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
      const n = Math.floor(Math.hypot(x1 - x0, y1 - y0) / 2.2);
      for (let i = 0; i < n; i += 1) {
        const k = i / n;
        const x = x0 + (x1 - x0) * k;
        const y = y0 + (y1 - y0) * k;
        for (const sd of [-1, 1]) {
          const l = len * (0.6 + rng() * 0.5) * (1 - k * 0.45);
          const lit = rng();
          c.strokeStyle = `rgb(${tint[0] * (0.7 + lit * 0.9)},${tint[1] * (0.7 + lit * 0.8)},${tint[2] * (0.7 + lit * 0.7)})`;
          c.lineWidth = 1.3;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + l * 0.45, y + sd * l);
          c.stroke();
        }
      }
      if (depth < 1) {
        for (let b = 0; b < 4; b += 1) {
          const k = 0.25 + b * 0.18;
          const x = x0 + (x1 - x0) * k;
          const y = y0 + (y1 - y0) * k;
          const sd = b % 2 ? 1 : -1;
          twig(x, y, x + 46 - b * 6, y + sd * (26 - b * 3), len * 0.8, depth + 1);
        }
      }
    };
    twig(4, 64, 250, 70, 12, 0);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  texCache.set(key, t);
  return t;
}

/** Leaf cluster card. */
export function leafTex(base: [number, number, number], key: string): THREE.Texture {
  if (texCache.has(key)) return texCache.get(key)!;
  const rng = createSeededRandom(key.length * 13);
  const t = canvas(256, 256, (c) => {
    c.clearRect(0, 0, 256, 256);
    c.strokeStyle = 'rgb(50,36,26)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(128, 250);
    c.quadraticCurveTo(120, 140, 128, 30);
    c.stroke();
    for (let i = 0; i < 260; i += 1) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * 105;
      const x = 128 + Math.cos(a) * r;
      const y = 128 + Math.sin(a) * r * 0.95;
      const lit = 0.6 + rng() * 0.7 + (128 - y) / 400;
      c.fillStyle = `rgb(${base[0] * lit},${base[1] * lit},${base[2] * lit})`;
      c.save();
      c.translate(x, y);
      c.rotate(rng() * Math.PI * 2);
      c.beginPath();
      c.ellipse(0, 0, 9 + rng() * 6, 4 + rng() * 3, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = `rgba(0,0,0,0.25)`;
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-8, 0);
      c.lineTo(8, 0);
      c.stroke();
      c.restore();
    }
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  texCache.set(key, t);
  return t;
}

export function barkTex(dark = false): THREE.Texture {
  const key = `bark${dark}`;
  if (texCache.has(key)) return texCache.get(key)!;
  const t = canvas(128, 256, (c) => {
    const img = c.createImageData(128, 256);
    for (let y = 0; y < 256; y += 1) {
      for (let x = 0; x < 128; x += 1) {
        const ridge = Math.abs(Math.sin(x * 0.19 + tfbm(x / 16, y / 48, 8, 3, 3) * 6));
        const n = tfbm(x / 10, y / 20, 13, 7, 4);
        const v = (dark ? 30 : 45) + ridge * 60 + n * 45;
        const o = (y * 128 + x) * 4;
        img.data[o] = v * 1.05;
        img.data[o + 1] = v * 0.88;
        img.data[o + 2] = v * 0.72;
        img.data[o + 3] = 255;
      }
    }
    c.putImageData(img, 0, 0);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  texCache.set(key, t);
  return t;
}

function windFoliage<T extends THREE.Material>(m: T, amount: number, key: string): T {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = WindUniforms.uTime;
    shader.uniforms.uWind = WindUniforms.uWind;
    shader.vertexShader = 'uniform float uTime;\nuniform float uWind;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       #ifdef USE_INSTANCING
         float ph = instanceMatrix[3].x * 0.11 + instanceMatrix[3].z * 0.07;
       #else
         float ph = 0.0;
       #endif
       float hgt = max(position.y, 0.0);
       float sway = sin(uTime * 1.3 + ph + position.x * 0.4) * 0.5 + sin(uTime * 2.7 + ph * 1.7 + position.z) * 0.25;
       transformed.x += sway * ${amount.toFixed(3)} * hgt * uWind;
       transformed.z += cos(uTime * 1.1 + ph) * ${(amount * 0.6).toFixed(3)} * hgt * uWind;
       transformed.y += sin(uTime * 3.1 + ph + position.x * 2.0) * 0.03 * uWind;`,
    );
  };
  m.customProgramCacheKey = () => `foliage-${key}`;
  return m;
}

export function foliageMaterial(map: THREE.Texture, color: string, key: string, amount = 0.006): THREE.MeshStandardMaterial {
  return windFoliage(
    new THREE.MeshStandardMaterial({ map, color, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.92, metalness: 0 }),
    amount,
    key,
  );
}

export function barkMaterial(dark = false, tint = '#c8b8a8'): THREE.MeshStandardMaterial {
  const map = barkTex(dark);
  return new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 3, color: tint, roughness: 1 });
}

function clean(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  for (const n of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(n)) ng.deleteAttribute(n);
  return ng;
}

function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const m = mergeGeometries(list.map(clean), false);
  if (!m) throw new Error('tree merge failed');
  m.computeBoundingSphere();
  return m;
}

/** Point every foliage normal away from a crown axis: soft, volumetric shading. */
function sphericalNormals(g: THREE.BufferGeometry, center: (y: number) => THREE.Vector3): void {
  const p = g.attributes.position as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 1) {
    v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(center(p.getY(i)));
    v.y += 0.6 * v.length();
    v.normalize();
    n.setXYZ(i, v.x, v.y, v.z);
  }
}

/** Branch-oriented card: one edge at origin, extending along +X, facing up-ish. */
function card(len: number, wid: number, yaw: number, droop: number, roll: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(len, wid);
  g.translate(len / 2, 0, 0);
  g.rotateX(-Math.PI / 2 + roll);
  g.rotateZ(-droop);
  g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

export type TreeGeo = { wood: THREE.BufferGeometry; foliage: THREE.BufferGeometry | null };

/** Dark gothic fir: straight tapering trunk, drooping whorls of needle cards. */
export function firTree(seed: number, height = 16): TreeGeo {
  const r = createSeededRandom(seed);
  const wood: THREE.BufferGeometry[] = [];
  const trunk = new THREE.CylinderGeometry(0.12, 0.45, height, 7, 3);
  trunk.translate(0, height / 2, 0);
  const tp = trunk.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < tp.count; i += 1) {
    const y = tp.getY(i);
    tp.setX(i, tp.getX(i) + Math.sin(y * 0.3 + seed) * 0.15);
  }
  trunk.computeVertexNormals();
  const tuv = trunk.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < tuv.count; i += 1) tuv.setY(i, tuv.getY(i) * height * 0.25);
  wood.push(trunk);
  const cards: THREE.BufferGeometry[] = [];
  const levels = Math.round(height / 1.2);
  for (let l = 0; l < levels; l += 1) {
    const k = l / (levels - 1);
    const y = height * (0.18 + k * 0.8);
    const len = (1 - k) * 4.2 + 0.7;
    const count = Math.max(4, Math.round(8 - k * 4));
    for (let b = 0; b < count; b += 1) {
      const yaw = (b / count) * Math.PI * 2 + l * 0.7 + r() * 0.4;
      const droop = 0.35 + (1 - k) * 0.35 + r() * 0.15;
      cards.push(card(len, len * 0.62, yaw, droop, (r() - 0.5) * 0.5, 0, y, 0));
      cards.push(card(len * 0.9, len * 0.5, yaw + 0.2, droop + 0.25, Math.PI / 2 + (r() - 0.5) * 0.3, 0, y - 0.1, 0));
    }
  }
  // Leader at the crown.
  for (let i = 0; i < 3; i += 1) cards.push(card(1.6, 1.1, (i / 3) * Math.PI * 2, -1.2, 0, 0, height - 0.6, 0));
  const foliage = merge(cards);
  sphericalNormals(foliage, (y) => new THREE.Vector3(0, y - 1.5, 0));
  return { wood: merge(wood), foliage };
}

function branchTube(from: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, bend: number, r: () => number, radial = 5): { geo: THREE.BufferGeometry; tip: THREE.Vector3; pts: THREE.Vector3[] } {
  const pts: THREE.Vector3[] = [from.clone()];
  const d = dir.clone().normalize();
  let p = from.clone();
  for (let i = 1; i <= 4; i += 1) {
    d.add(new THREE.Vector3((r() - 0.5) * bend, (r() - 0.3) * bend * 0.6, (r() - 0.5) * bend)).normalize();
    p = p.clone().addScaledVector(d, len / 4);
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tubular = 5;
  const geo = new THREE.TubeGeometry(curve, tubular, rad, radial);
  // Taper toward the tip.
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const segs = tubular;
  for (let i = 0; i < pos.count; i += 1) {
    const ring = Math.floor(i / (radial + 1));
    const t = ring / segs;
    const c = curve.getPoint(Math.min(1, t));
    const v = new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).sub(c).multiplyScalar(1 - t * 0.65);
    pos.setXYZ(i, c.x + v.x, c.y + v.y, c.z + v.z);
  }
  geo.computeVertexNormals();
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, uv.getX(i) * len * 0.3, uv.getY(i) * 2);
  return { geo, tip: p, pts };
}

/** Gnarled broadleaf: twisting trunk, two orders of branches, leaf clusters at the tips. */
export function broadleafTree(seed: number, height = 14, leafy = true, spread = 1): TreeGeo {
  const r = createSeededRandom(seed);
  const wood: THREE.BufferGeometry[] = [];
  const cards: THREE.BufferGeometry[] = [];
  const trunk = branchTube(new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(0, 1, 0), height * 0.62, height * 0.06, 0.25, r, 7);
  wood.push(trunk.geo);
  // Root flare.
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + r();
    wood.push(branchTube(new THREE.Vector3(0, height * 0.12, 0), new THREE.Vector3(Math.cos(a), -0.7, Math.sin(a)), height * 0.2, height * 0.035, 0.2, r, 4).geo);
  }
  const clusters: THREE.Vector3[] = [];
  const n1 = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n1; i += 1) {
    const k = 0.45 + (i / n1) * 0.5;
    const base = trunk.pts[Math.min(4, Math.round(k * 4))].clone();
    const a = (i / n1) * Math.PI * 2 + r();
    const dir = new THREE.Vector3(Math.cos(a) * spread, 0.55 + r() * 0.5, Math.sin(a) * spread);
    const b = branchTube(base, dir, height * (0.35 + r() * 0.15), height * 0.03, 0.5, r);
    wood.push(b.geo);
    clusters.push(b.tip);
    for (let j = 0; j < 2; j += 1) {
      const sb = b.pts[2 + (j % 3)];
      const sd = dir.clone().add(new THREE.Vector3((r() - 0.5) * 1.6, r() * 0.6, (r() - 0.5) * 1.6));
      const s = branchTube(sb, sd, height * (0.18 + r() * 0.1), height * 0.012, 0.7, r, 3);
      wood.push(s.geo);
      clusters.push(s.tip);
    }
  }
  clusters.push(trunk.tip);
  if (leafy) {
    for (const c of clusters) {
      const size = height * (0.24 + r() * 0.1);
      for (let k = 0; k < 3; k += 1) {
        const g = new THREE.PlaneGeometry(size, size);
        g.rotateY((k / 3) * Math.PI + r());
        g.rotateX((r() - 0.5) * 0.8);
        g.translate(c.x, c.y + size * 0.1, c.z);
        cards.push(g);
      }
    }
  }
  const crownC = new THREE.Vector3(0, height * 0.7, 0);
  const foliage = cards.length ? merge(cards) : null;
  if (foliage) sphericalNormals(foliage, () => crownC);
  return { wood: merge(wood), foliage };
}

/** Pale dead tree: branches only. */
export function deadTree(seed: number, height = 9): TreeGeo {
  return broadleafTree(seed, height, false, 1.3);
}

export type Forest = { add: (kind: number, m: THREE.Matrix4, near?: boolean) => void; build: (parent: THREE.Object3D) => void };

/** Collect instances per tree variant and emit two instanced meshes (wood + foliage) per variant. */
export function forest(variants: Array<{ geo: TreeGeo; wood: THREE.Material; leaves: THREE.Material | null; shadow: boolean }>): Forest {
  // Two lists per variant: near-path trees cast shadows, distant ones don't.
  const lists: THREE.Matrix4[][] = variants.flatMap(() => [[], []]);
  return {
    add: (kind, m, near = true) => lists[kind * 2 + (near ? 0 : 1)].push(m),
    build: (parent) => {
      lists.forEach((list, li) => {
        const v = variants[Math.floor(li / 2)];
        const castsShadow = v.shadow && li % 2 === 0;
        if (!list.length) return;
        const parts: Array<[THREE.BufferGeometry, THREE.Material]> = [[v.geo.wood, v.wood]];
        if (v.geo.foliage && v.leaves) parts.push([v.geo.foliage, v.leaves]);
        for (const [g, m] of parts) {
          const inst = new THREE.InstancedMesh(g, m, list.length);
          list.forEach((mm, k) => inst.setMatrixAt(k, mm));
          inst.instanceMatrix.needsUpdate = true;
          inst.castShadow = castsShadow;
          inst.receiveShadow = true;
          inst.computeBoundingSphere();
          parent.add(inst);
        }
      });
    },
  };
}
