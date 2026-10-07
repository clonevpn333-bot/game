import * as THREE from 'three';
import { radialTexture, WORLD_TIME } from '../gfx/Materials';
import { addOutline, ghibli, toonMaterial } from '../gfx/Toon';
import { cyl, merge, tint, xf, box, bell, rng } from './Kit';

/** Banner on a pole; the cloth ripples in the vertex shader. */
export function makeBanner(color: string, w = 1.6, h = 5, trim = '#d8b04a'): { group: THREE.Group; cloth: THREE.Mesh } {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(merge([tint(xf(cyl(0.08, 0.08, h + 1.5, 6), [0, (h + 1.5) / 2, 0]), '#4a3020'), tint(xf(new THREE.SphereGeometry(0.14, 8, 6), [0, h + 1.6, 0]), trim)]), toonMaterial({ vertexColors: true }));
  pole.castShadow = true;
  const geo = new THREE.PlaneGeometry(w, h, 4, 10);
  geo.translate(w / 2, -h / 2, 0);
  const col = new Float32Array(geo.attributes.position.count * 3);
  const c = new THREE.Color(color);
  const t = new THREE.Color(trim);
  for (let i = 0; i < geo.attributes.position.count; i++) {
    const y = geo.attributes.position.getY(i);
    const k = y < -h + 0.35 ? t : c;
    col.set([k.r, k.g, k.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.MeshToonMaterial({ vertexColors: true, side: THREE.DoubleSide });
  m.onBeforeCompile = (s) => {
    s.uniforms.uTime = WORLD_TIME;
    ghibli(s, {
      brushScale: 0.5,
      vertDecl: 'uniform float uTime;',
      vertBody: 'vec3 wpb = (modelMatrix * vec4(0.0,0.0,0.0,1.0)).xyz; transformed.z += sin(uTime * 3.0 + position.y * 0.8 + position.x * 2.0 + wpb.x * 0.1) * 0.22 * position.x;',
    });
  };
  m.customProgramCacheKey = () => 'banner';
  const cloth = new THREE.Mesh(geo, m);
  cloth.position.set(0.08, h + 1.4, 0);
  cloth.castShadow = true;
  group.add(pole, cloth);
  return { group, cloth };
}

/** No-op kept for script compatibility (banners animate on the GPU). */
export function waveBanner(_cloth: THREE.Mesh, _time: number, _strength = 1): void {}

export function glowCard(color: THREE.ColorRepresentation, size: number, opacity = 0.6): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTexture(), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(size);
  return s;
}

const fogBanks = new Set<THREE.Group>();

/** Large soft haze billboards for aerial depth; they fade as the camera nears. */
export function fogBank(count: number, center: THREE.Vector3, spread: THREE.Vector3, size: number, color: string, opacity = 0.35): THREE.Group {
  const g = new THREE.Group();
  g.userData.opacity = opacity;
  g.userData.size = size;
  fogBanks.add(g);
  const r = rng(Math.round(center.x * 7 + center.z * 3 + count));
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({ map: radialTexture(), color, transparent: true, opacity, depthWrite: false, fog: true });
    const s = new THREE.Sprite(mat);
    s.position.set(center.x + (r() - 0.5) * spread.x, center.y + (r() - 0.5) * spread.y, center.z + (r() - 0.5) * spread.z);
    s.scale.set(size * (0.7 + r() * 0.8), size * 0.45 * (0.7 + r() * 0.6), 1);
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

/** Flocks circling high above — small, dark, constantly flapping. */
export class Birds {
  readonly mesh: THREE.InstancedMesh;
  private readonly data: { r: number; h: number; a: number; s: number; ph: number }[] = [];
  center = new THREE.Vector3();
  private readonly m = new THREE.Matrix4();

  constructor(count: number, center: THREE.Vector3, radius: number, height: number, color = '#2a2228') {
    this.center.copy(center);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.4, -1.2, 0.3, -0.2, 0, 0, -0.3, 0, 0, 0.4, 1.2, 0.3, -0.2, 0, 0, -0.3]), 3));
    g.computeVertexNormals();
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, fog: true }), count);
    this.mesh.frustumCulled = false;
    const r = rng(count + 17);
    for (let i = 0; i < count; i++) this.data.push({ r: radius * (0.6 + r() * 0.6), h: height + (r() - 0.5) * height * 0.3, a: r() * Math.PI * 2, s: (0.08 + r() * 0.06) * (r() < 0.5 ? 1 : -1), ph: r() * 10 });
  }

  update(dt: number, time: number): void {
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const e = new THREE.Euler();
    this.data.forEach((b, i) => {
      b.a += b.s * dt;
      p.set(this.center.x + Math.cos(b.a) * b.r, this.center.y + b.h + Math.sin(time * 0.7 + b.ph) * 4, this.center.z + Math.sin(b.a) * b.r);
      q.setFromEuler(e.set(0, -b.a + (b.s > 0 ? 0 : Math.PI), Math.sin(time + b.ph) * 0.3));
      const flap = 0.4 + Math.abs(Math.sin(time * 9 + b.ph)) * 0.9;
      sc.set(2.2, 2.2 * flap, 2.2);
      this.m.compose(p, q, sc);
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/** Street lamps (warm practicals). */
export function lamps(points: [number, number][]): THREE.Group {
  const g = new THREE.Group();
  const geo = merge([tint(xf(cyl(0.1, 0.15, 4.2, 8), [0, 2.1, 0]), '#2e2622'), tint(xf(box(0.5, 0.08, 0.5), [0, 4.25, 0]), '#2e2622'), tint(xf(new THREE.ConeGeometry(0.42, 0.4, 4), [0, 4.95, 0], [0, Math.PI / 4, 0]), '#3a4a52')]);
  const im = new THREE.InstancedMesh(geo, toonMaterial({ vertexColors: true }), points.length);
  const gl = new THREE.InstancedMesh(xf(box(0.34, 0.42, 0.34), [0, 4.52, 0]), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc46a').multiplyScalar(2) }), points.length);
  const m = new THREE.Matrix4();
  points.forEach(([x, z], i) => {
    m.makeTranslation(x, 0, z);
    im.setMatrixAt(i, m);
    gl.setMatrixAt(i, m);
  });
  im.castShadow = true;
  g.add(im, gl);
  addOutline(im, 0.02, 1);
  return g;
}

/** A standing bell-shrine (two posts, a lintel, a bronze bell). */
export function shrineGeo(): { stone: THREE.BufferGeometry; bronze: THREE.BufferGeometry } {
  return {
    stone: merge([tint(xf(box(1.2, 7, 1.2), [-1.6, 3.5, 0]), '#fff'), tint(xf(box(1.2, 7, 1.2), [1.6, 3.5, 0]), '#fff'), tint(xf(box(4.8, 0.9, 1.6), [0, 7.3, 0]), '#fff')]),
    bronze: merge([tint(xf(bell(0.8, 14), [0, 5.2, 0]), '#fff')]),
  };
}
