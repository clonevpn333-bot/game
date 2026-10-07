import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Geometry kit for hard-surface set pieces: every helper returns a non-indexed
 * geometry carrying a vertex colour so a whole part (stone, gilt trim, dark
 * recesses) merges into one draw call under a single material.
 */

export type V = [number, number, number];

export function tint(g: THREE.BufferGeometry, color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const geo = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(color);
  const n = geo.attributes.position.count;
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    a[i * 3] = c.r;
    a[i * 3 + 1] = c.g;
    a[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
  for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') geo.deleteAttribute(k);
  return geo;
}

export function xf(g: THREE.BufferGeometry, p: V = [0, 0, 0], r: V = [0, 0, 0], s: V = [1, 1, 1]): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(r[0], r[1], r[2], 'YXZ')), new THREE.Vector3(...s));
  g.applyMatrix4(m);
  return g;
}

/** Point a geometry built along +Y so that it spans from a to b. */
export function span(g: THREE.BufferGeometry, a: THREE.Vector3, b: THREE.Vector3): THREE.BufferGeometry {
  const d = b.clone().sub(a);
  const len = d.length();
  g.applyMatrix4(new THREE.Matrix4().makeScale(1, len, 1));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(a, q, new THREE.Vector3(1, 1, 1)));
  return g;
}

export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const ok = list.map((g) => (g.index ? g.toNonIndexed() : g));
  for (const g of ok) {
    if (!g.attributes.color) tint(g, '#ffffff');
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'color') g.deleteAttribute(k);
  }
  const m = mergeGeometries(ok, false)!;
  m.computeBoundingSphere();
  return m;
}

/** Lathe from [radius, y] pairs (bottom→top), with flat or smooth shading. */
export function lathe(profile: [number, number][], seg = 32, phi0 = 0, phiLen = Math.PI * 2): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
  const g = new THREE.LatheGeometry(pts, seg, phi0, phiLen);
  g.computeVertexNormals();
  return g;
}

/** Unit-height tapered box along +Y (blade, slat, panel). */
export function blade(w0: number, w1: number, d0: number, d1: number, segY = 1): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(1, 1, 1, 1, segY, 1);
  g.translate(0, 0.5, 0);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i);
    p.setX(i, p.getX(i) * (w0 + (w1 - w0) * t));
    p.setZ(i, p.getZ(i) * (d0 + (d1 - d0) * t));
  }
  g.computeVertexNormals();
  return g;
}

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const cyl = (r0: number, r1: number, h: number, seg = 16, open = false) => new THREE.CylinderGeometry(r1, r0, h, seg, 1, open);
export const sph = (r: number, ws = 24, hs = 16) => new THREE.SphereGeometry(r, ws, hs);
export const torus = (R: number, r: number, rs = 10, ts = 48, arc = Math.PI * 2) => new THREE.TorusGeometry(R, r, rs, ts, arc);

/** Tube following a polyline with per-point radius. */
export function tube(pts: THREE.Vector3[], radii: number[], radial = 10): THREE.BufferGeometry {
  const pos: number[] = [];
  const idx: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < pts.length; i++) {
    const t = (i < pts.length - 1 ? pts[i + 1].clone().sub(pts[i]) : pts[i].clone().sub(pts[i - 1])).normalize();
    const ref = Math.abs(t.dot(up)) > 0.9 ? new THREE.Vector3(1, 0, 0) : up;
    const n = new THREE.Vector3().crossVectors(t, ref).normalize();
    const b = new THREE.Vector3().crossVectors(t, n).normalize();
    for (let k = 0; k <= radial; k++) {
      const a = (k / radial) * Math.PI * 2;
      const v = pts[i].clone().addScaledVector(n, Math.cos(a) * radii[i]).addScaledVector(b, Math.sin(a) * radii[i]);
      pos.push(v.x, v.y, v.z);
    }
  }
  for (let i = 0; i < pts.length - 1; i++) {
    for (let k = 0; k < radial; k++) {
      const a = i * (radial + 1) + k;
      const c = a + radial + 1;
      idx.push(a, c, a + 1, c, c + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Bell profile (open at the mouth) — the motif of the whole world. */
export function bell(r: number, seg = 20): THREE.BufferGeometry {
  return lathe(
    [
      [r * 1.0, 0],
      [r * 0.98, 0.06 * r],
      [r * 0.82, 0.22 * r],
      [r * 0.66, 0.55 * r],
      [r * 0.6, 0.95 * r],
      [r * 0.5, 1.18 * r],
      [r * 0.22, 1.3 * r],
      [0.0, 1.32 * r],
    ],
    seg,
  );
}

/** Seeded PRNG. */
export function rng(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
