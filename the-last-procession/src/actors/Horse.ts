import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getToonRamp, blobShadow } from '../render/Materials';
import { xf } from '../render/Geo';

const toonVC = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getToonRamp() });
const ink = (() => {
  const m = new THREE.MeshBasicMaterial({ color: 0x140c16, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal * 0.03;');
  };
  m.customProgramCacheKey = () => 'ink-outline-horse';
  return m;
})();

function col(g: THREE.BufferGeometry, c: string): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  const cc = new THREE.Color(c);
  const a = new Float32Array(n.attributes.position.count * 3);
  for (let i = 0; i < n.attributes.position.count; i++) a.set([cc.r, cc.g, cc.b], i * 3);
  n.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return n;
}

/** Stylized war horse with a procedural gallop. Rider sits on `saddle`. */
export class Horse {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly saddle = new THREE.Object3D();
  readonly pillion = new THREE.Object3D();
  private readonly neck = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly legs: { hip: THREE.Group; knee: THREE.Group; front: boolean; off: number }[] = [];
  phase = 0;
  speed = 0;
  jump = 0; // 0..1 jump arc progress (>0 while airborne)
  onHoof: (() => void) | null = null;
  private lastBeat = 0;

  constructor(coat = '#6b3e26', mane = '#1e1410', cloth = '#24406e') {
    this.root.add(this.body);
    const parts: Record<string, THREE.BufferGeometry[]> = {};
    const add = (k: string, g: THREE.BufferGeometry, c: string) => (parts[k] ??= []).push(col(g, c));
    const B = this.body;
    B.position.y = 1.55;
    add('body', xf(new THREE.CapsuleGeometry(0.55, 1.5, 4, 10), [0, 0, 0], [Math.PI / 2, 0, 0]), coat);
    add('body', xf(new THREE.BoxGeometry(0.9, 0.12, 0.9), [0, 0.55, 0.05]), cloth);
    add('body', xf(new THREE.BoxGeometry(1.0, 0.5, 0.75), [0, 0.25, 0.05]), cloth);
    add('body', xf(new THREE.BoxGeometry(0.5, 0.18, 0.55), [0, 0.68, -0.05]), '#4a2c1a');
    add('body', xf(new THREE.BoxGeometry(1.02, 0.06, 0.8), [0, 0.0, 0.05]), '#d8b04a');
    this.neck.position.set(0, 0.35, 0.95);
    this.neck.rotation.x = -0.75;
    B.add(this.neck);
    add('neck', xf(new THREE.CylinderGeometry(0.28, 0.42, 1.1, 8), [0, 0.5, 0]), coat);
    add('neck', xf(new THREE.BoxGeometry(0.1, 1.1, 0.3), [0, 0.55, -0.25], [0.1, 0, 0]), mane);
    add('neck', xf(new THREE.BoxGeometry(0.34, 0.36, 0.8), [0, 1.08, 0.3], [0.85, 0, 0]), coat);
    add('neck', xf(new THREE.BoxGeometry(0.26, 0.26, 0.3), [0, 0.86, 0.62], [0.85, 0, 0]), '#3a2418');
    add('neck', xf(new THREE.ConeGeometry(0.07, 0.22, 4), [0.12, 1.36, 0.1]), coat);
    add('neck', xf(new THREE.ConeGeometry(0.07, 0.22, 4), [-0.12, 1.36, 0.1]), coat);
    add('neck', xf(new THREE.BoxGeometry(0.36, 0.05, 0.05), [0, 1.02, 0.45], [0.85, 0, 0]), '#d8b04a');
    this.tail.position.set(0, 0.25, -1.25);
    B.add(this.tail);
    add('tail', xf(new THREE.ConeGeometry(0.16, 1.0, 6), [0, -0.45, -0.1], [Math.PI - 0.3, 0, 0]), mane);
    const legDefs: [number, number, boolean, number][] = [
      [0.28, 0.8, true, 0],
      [-0.28, 0.8, true, 0.12],
      [0.28, -0.85, false, 0.55],
      [-0.28, -0.85, false, 0.67],
    ];
    legDefs.forEach(([x, z, front, off], i) => {
      const hip = new THREE.Group();
      hip.position.set(x, -0.2, z);
      B.add(hip);
      const knee = new THREE.Group();
      knee.position.y = -0.62;
      hip.add(knee);
      add(`h${i}`, xf(new THREE.CylinderGeometry(0.15, 0.11, 0.68, 7), [0, -0.3, 0]), coat);
      add(`k${i}`, xf(new THREE.CylinderGeometry(0.09, 0.08, 0.6, 7), [0, -0.3, 0]), coat);
      add(`k${i}`, xf(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 7), [0, -0.66, 0.02]), '#1a1210');
      add(`k${i}`, xf(new THREE.CylinderGeometry(0.115, 0.1, 0.12, 7), [0, -0.5, 0]), '#e8e0d0');
      (this as unknown as Record<string, THREE.Group>)[`_h${i}`] = hip;
      (this as unknown as Record<string, THREE.Group>)[`_k${i}`] = knee;
      this.legs.push({ hip, knee, front, off });
    });
    const target = (k: string): THREE.Object3D => {
      if (k === 'body') return B;
      if (k === 'neck') return this.neck;
      if (k === 'tail') return this.tail;
      const i = Number(k.slice(1));
      return k[0] === 'h' ? this.legs[i].hip : this.legs[i].knee;
    };
    for (const [k, list] of Object.entries(parts)) {
      const g = mergeGeometries(list.map((x) => { if (!x.attributes.uv) x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); return x; }), false)!;
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, toonVC);
      m.castShadow = true;
      target(k).add(m, new THREE.Mesh(g, ink));
    }
    this.saddle.position.set(0, 0.78, 0.05);
    this.pillion.position.set(0, 0.74, -0.55);
    B.add(this.saddle, this.pillion);
    const sh = blobShadow(1.4, 0.4);
    sh.scale.set(0.8, 1.4, 1);
    sh.position.y = 0.03;
    this.root.add(sh);
  }

  update(dt: number): void {
    const gallop = Math.min(1, this.speed / 14);
    const freq = 1.2 + gallop * 1.2;
    this.phase += dt * freq * (this.speed > 0.3 ? 1 : 0);
    const ph = this.phase;
    this.legs.forEach((l) => {
      const u = (ph + l.off) % 1;
      const s = Math.sin(u * Math.PI * 2);
      const amp = 0.25 + gallop * 0.45;
      l.hip.rotation.x = s * amp * (l.front ? -1 : 1) * -1;
      l.knee.rotation.x = l.front ? Math.max(0, Math.cos(u * Math.PI * 2)) * 1.3 * gallop + 0.05 : -Math.max(0, Math.cos(u * Math.PI * 2)) * 0.9 * gallop;
      if (this.jump > 0) {
        l.hip.rotation.x = l.front ? -0.9 : 0.8;
        l.knee.rotation.x = l.front ? 1.6 : -0.7;
      }
    });
    const beat = Math.floor(ph * 2);
    if (beat !== this.lastBeat && this.speed > 2 && this.jump <= 0) {
      this.lastBeat = beat;
      this.onHoof?.();
    }
    const bounce = Math.abs(Math.sin(ph * Math.PI * 2)) * 0.12 * gallop;
    this.body.position.y = 1.55 + bounce;
    this.body.rotation.x = Math.sin(ph * Math.PI * 2) * 0.06 * gallop - (this.jump > 0 ? Math.cos(this.jump * Math.PI) * 0.3 : 0);
    this.neck.rotation.x = -0.75 + Math.sin(ph * Math.PI * 2 + 1) * 0.12 * gallop;
    this.tail.rotation.x = 0.4 + gallop * 0.6 + Math.sin(ph * 12) * 0.1;
  }
}
