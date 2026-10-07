import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stoneTexture } from '../gfx/Materials';
import { addOutline, toonMaterial } from '../gfx/Toon';
import { Terrain, Trees, mountains } from './Nature';

/**
 * Set-building helpers used by the chapter scripts. Names follow the scripts'
 * vocabulary; everything they build uses the painted pipeline (toon shading,
 * colour-matched ink, painted terrain, instanced foliage).
 */

export type V3t = [number, number, number];

export function xf(geo: THREE.BufferGeometry, p: V3t = [0, 0, 0], r: V3t = [0, 0, 0], s: V3t = [1, 1, 1]): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  geo.applyMatrix4(m);
  return geo;
}

export const G = {
  box: (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z),
  cyl: (rt: number, rb: number, h: number, seg = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  sph: (r: number, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h),
  hemi: (r: number, w = 16, h = 8) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: (r: number, h: number, seg = 12) => new THREE.ConeGeometry(r, h, seg, 1),
  torus: (r: number, t: number, rs = 8, ts = 32, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  lathe: (pts: [number, number][], seg = 18) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg),
  oct: (r: number) => new THREE.OctahedronGeometry(r),
};

export function bellGeo(r: number, seg = 16): THREE.BufferGeometry {
  return G.lathe(
    [
      [0, r * 1.5],
      [r * 0.35, r * 1.45],
      [r * 0.55, r * 1.2],
      [r * 0.62, r * 0.6],
      [r * 0.8, r * 0.1],
      [r * 1.0, -r * 0.05],
      [r * 0.95, -r * 0.1],
    ],
    seg,
  );
}

export function gearGeo(r: number, thickness: number, teeth: number, toothSize: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [G.torus(r, thickness, 6, Math.max(16, teeth * 2))];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    parts.push(xf(G.box(toothSize, toothSize * 1.4, thickness * 1.6), [Math.cos(a) * (r + thickness), Math.sin(a) * (r + thickness), 0], [0, 0, a + Math.PI / 2]));
  }
  for (let i = 0; i < 6; i++) parts.push(xf(G.box(thickness * 0.8, r * 2, thickness * 0.8), [0, 0, 0], [0, 0, (i / 6) * Math.PI * 2]));
  return merge(parts);
}

/** Merge keeping position/normal/uv (for textured masonry). */
export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const norm = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    if (!n.attributes.normal) n.computeVertexNormals();
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  const m = mergeGeometries(norm, false)!;
  m.computeBoundingSphere();
  return m;
}

export function toon(color: THREE.ColorRepresentation, emissive?: THREE.ColorRepresentation, emissiveIntensity = 1): THREE.MeshToonMaterial {
  return toonMaterial({ color, emissive, emissiveIntensity });
}

/** Mesh with shadows and an ink outline. */
export function inked(geo: THREE.BufferGeometry, mat: THREE.Material, worldMax = 0.06): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = m.receiveShadow = true;
  addOutline(m, worldMax, 1, undefined, true);
  return m;
}

export interface MetalSet {
  hull: THREE.Material;
  dark: THREE.Material;
  trim: THREE.Material;
  stone: THREE.Material;
  glow: THREE.MeshBasicMaterial;
  glass: THREE.Material;
}

const metalCache = new Map<string, MetalSet>();
export function metalSet(kind: 'bronze' | 'verdigris' | 'ivory' | 'iron'): MetalSet {
  const hit = metalCache.get(kind);
  if (hit) return hit;
  const p = {
    bronze: { base: '#a47a4a', trim: '#e2b060', glow: '#ffd27a', stone: '#b4a68e' },
    verdigris: { base: '#6a9a88', trim: '#d4a85a', glow: '#7ff3ff', stone: '#9a9c90' },
    ivory: { base: '#ddd2bc', trim: '#d4aa5a', glow: '#ffe7a6', stone: '#c4b8a2' },
    iron: { base: '#5a5c66', trim: '#b4884e', glow: '#ff7a4a', stone: '#7a746e' },
  }[kind];
  const set: MetalSet = {
    hull: toonMaterial({ color: p.base, metal: true, brushScale: 2 }),
    dark: toonMaterial({ color: '#33302c', brushScale: 1 }),
    trim: toonMaterial({ color: p.trim, metal: true }),
    stone: toonMaterial({ map: stoneTexture(p.stone, kind.length * 31, 6), brushScale: 2 }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(p.glow).multiplyScalar(2.4) }),
    glass: toonMaterial({ color: '#2a3a4a', emissive: p.glow, emissiveIntensity: 0.6 }),
  };
  metalCache.set(kind, set);
  return set;
}

/** Painted terrain mesh (grass is streamed separately by the chapter). */
export function makeTerrain(opts: {
  size: number;
  seg: number;
  height: (x: number, z: number) => number;
  color: (x: number, z: number, h: number) => THREE.Color;
  center?: THREE.Vector2;
  grass?: (x: number, z: number, h: number, slope: number) => number;
  grassColor?: THREE.ColorRepresentation;
  map?: unknown;
}): Terrain {
  return new Terrain({
    size: opts.size,
    seg: opts.seg,
    center: opts.center ? [opts.center.x, opts.center.y] : undefined,
    height: opts.height,
    color: (x, z, h) => opts.color(x, z, h),
    grass: opts.grass,
    grassColor: opts.grassColor,
  });
}

export function makeTrees(points: THREE.Vector3[], palette: { leaf: string; trunk: string; dark?: string; shape?: 'round' | 'tall' | 'pine' } = { leaf: '#4f7a3a', trunk: '#5a3a26' }, scale = 1, seed = 1): THREE.Group {
  const leaf = new THREE.Color(palette.leaf);
  const dark = palette.dark ?? '#' + leaf.clone().multiplyScalar(0.42).offsetHSL(0.04, 0, 0).getHexString();
  const pts = points.map((p) => ({ x: p.x, y: p.y, z: p.z, s: scale }));
  const g = new THREE.Group();
  if (palette.shape) {
    g.add(new Trees(pts, { leaf: palette.leaf, leafDark: dark, trunk: palette.trunk, shape: palette.shape }, seed).group);
    return g;
  }
  // a natural mix: mostly round crowns with some pines and tall poplars
  const round = pts.filter((_, i) => i % 5 < 3);
  const pine = pts.filter((_, i) => i % 5 === 3);
  const tall = pts.filter((_, i) => i % 5 === 4);
  g.add(new Trees(round, { leaf: palette.leaf, leafDark: dark, trunk: palette.trunk, shape: 'round' }, seed).group);
  g.add(new Trees(pine, { leaf: '#' + leaf.clone().offsetHSL(0.03, -0.05, -0.08).getHexString(), leafDark: dark, trunk: palette.trunk, shape: 'pine' }, seed + 1).group);
  g.add(new Trees(tall, { leaf: '#' + leaf.clone().offsetHSL(-0.02, 0.05, 0.04).getHexString(), leafDark: dark, trunk: palette.trunk, shape: 'tall' }, seed + 2).group);
  return g;
}

export function makeMountainRing(radius: number, _count: number, height: number, color: THREE.ColorRepresentation, seed = 1, arc: [number, number] = [0, Math.PI * 2]): THREE.Group {
  const c = new THREE.Color(color);
  const l1 = c.clone().lerp(new THREE.Color('#c8d4e8'), 0.3);
  const l2 = c.clone().lerp(new THREE.Color('#dde6f2'), 0.55);
  return mountains({ radius, height, colors: ['#' + c.getHexString(), '#' + l1.getHexString(), '#' + l2.getHexString()], snow: 0.95, seed, arc });
}
