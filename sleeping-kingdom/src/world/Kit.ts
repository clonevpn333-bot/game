import * as THREE from 'three';
import { merge } from './geo';
import { tfbm } from './Textures';

/** Collects geometry per material and merges it into one mesh per material (few draw calls). */
export class Kit {
  private readonly parts = new Map<THREE.Material, THREE.BufferGeometry[]>();

  add(mat: THREE.Material, ...geos: THREE.BufferGeometry[]): void {
    let list = this.parts.get(mat);
    if (!list) {
      list = [];
      this.parts.set(mat, list);
    }
    list.push(...geos);
  }

  build(parent: THREE.Object3D, name: string, shadow = true): void {
    for (const [mat, list] of this.parts) {
      if (!list.length) continue;
      const mesh = new THREE.Mesh(merge(list), mat);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      mesh.name = name;
      parent.add(mesh);
    }
    this.parts.clear();
  }
}

const q = new THREE.Quaternion();
const e = new THREE.Euler();

export function mtx(p: THREE.Vector3, yaw: number, s: number, sy = s, tiltX = 0, tiltZ = 0): THREE.Matrix4 {
  e.set(tiltX, yaw, tiltZ);
  q.setFromEuler(e);
  return new THREE.Matrix4().compose(p, q, new THREE.Vector3(s, sy, s));
}

/** Instanced scatter sets. */
export class Scatter {
  private readonly sets: Array<{ geo: THREE.BufferGeometry; mat: THREE.Material; list: THREE.Matrix4[]; shadow: boolean }> = [];

  set(geo: THREE.BufferGeometry, mat: THREE.Material, shadow: boolean): number {
    this.sets.push({ geo, mat, list: [], shadow });
    return this.sets.length - 1;
  }

  add(i: number, m: THREE.Matrix4): void {
    this.sets[i].list.push(m);
  }

  build(parent: THREE.Object3D): void {
    for (const set of this.sets) {
      if (!set.list.length) continue;
      const inst = new THREE.InstancedMesh(set.geo, set.mat, set.list.length);
      set.list.forEach((m, i) => inst.setMatrixAt(i, m));
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = set.shadow;
      inst.receiveShadow = true;
      inst.computeBoundingSphere();
      parent.add(inst);
    }
  }
}

let rippleTex: THREE.CanvasTexture | null = null;
function ripples(): THREE.CanvasTexture {
  if (rippleTex) return rippleTex;
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(s, s);
  for (let y = 0; y < s; y += 1) {
    for (let x = 0; x < s; x += 1) {
      const v = tfbm(x / 18, y / 18, 14, 401, 4) * 0.6 + tfbm(x / 6, y / 6, 43, 402, 2) * 0.4;
      const o = (y * s + x) * 4;
      img.data[o] = img.data[o + 1] = img.data[o + 2] = v * 255;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  rippleTex = new THREE.CanvasTexture(c);
  rippleTex.wrapS = rippleTex.wrapT = THREE.RepeatWrapping;
  rippleTex.repeat.set(60, 60);
  return rippleTex;
}

/** Still black water with drifting ripples; reflects the environment and the torches. */
export function waterMesh(size: number, color: string, opacity = 0.9): THREE.Mesh {
  const tex = ripples().clone();
  tex.needsUpdate = true;
  tex.repeat.set(size / 14, size / 14);
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.55,
    roughness: 0.1,
    bumpMap: tex,
    bumpScale: 0.6,
    transparent: true,
    opacity,
    envMapIntensity: 1.4,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2), mat);
  mesh.receiveShadow = true;
  mesh.renderOrder = 1;
  mesh.name = 'water';
  return mesh;
}

export function flowWater(mesh: THREE.Mesh, dt: number): void {
  const m = mesh.material as THREE.MeshStandardMaterial;
  if (m.bumpMap) {
    m.bumpMap.offset.x += dt * 0.006;
    m.bumpMap.offset.y += dt * 0.004;
  }
}

/** Reed/grass blade card texture (alpha). */
export function bladeTex(base: [number, number, number], key: string, tall = true): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  let seed = key.length * 97 + 13;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < (tall ? 34 : 46); i += 1) {
    const x = 6 + rnd() * 116;
    const h = (tall ? 150 : 80) + rnd() * (tall ? 100 : 60);
    const lean = (rnd() - 0.5) * 30;
    const lit = 0.6 + rnd() * 0.6;
    ctx.strokeStyle = `rgb(${base[0] * lit},${base[1] * lit},${base[2] * lit})`;
    ctx.lineWidth = tall ? 1 + rnd() * 1.6 : 2 + rnd() * 3;
    ctx.beginPath();
    ctx.moveTo(x, 256);
    ctx.quadraticCurveTo(x + lean * 0.3, 256 - h * 0.6, x + lean, 256 - h);
    ctx.stroke();
    if (tall && rnd() < 0.25) {
      ctx.fillStyle = `rgb(${70 * lit},${50 * lit},${30 * lit})`;
      ctx.beginPath();
      ctx.ellipse(x + lean, 256 - h + 8, 3.5, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function bladeGeo(w: number, h: number): THREE.BufferGeometry {
  const a = new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0);
  const b = a.clone().rotateY(Math.PI / 3);
  const c = a.clone().rotateY((Math.PI * 2) / 3);
  return merge([a, b, c]);
}

/** Velmour's mountain on the horizon with its Founder's eye burning, visible from every later chapter. */
export function velmourOnHorizon(parent: THREE.Object3D, o: THREE.Vector3, scale = 1, color = '#0c1014'): THREE.Sprite {
  const parts: THREE.BufferGeometry[] = [];
  parts.push(new THREE.ConeGeometry(420 * scale, 520 * scale, 9).translate(o.x, o.y + 120 * scale, o.z));
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 14; i += 1) {
    const x = o.x - 120 * scale + i * 18 * scale;
    const h = (60 + rnd() * 120) * scale;
    const zz = o.z + (rnd() - 0.5) * 60 * scale;
    parts.push(new THREE.CylinderGeometry(4 * scale, 5 * scale, h, 6).translate(x, o.y + 380 * scale + h / 2, zz));
    parts.push(new THREE.ConeGeometry(6 * scale, 40 * scale, 6).translate(x, o.y + 380 * scale + h + 20 * scale, zz));
  }
  const mesh = new THREE.Mesh(merge(parts), new THREE.MeshBasicMaterial({ color, fog: false }));
  parent.add(mesh);
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,220,120,1)');
  g.addColorStop(0.25, 'rgba(255,160,50,0.8)');
  g.addColorStop(1, 'rgba(255,100,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const eye = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  eye.position.set(o.x - 300 * scale, o.y + 250 * scale, o.z + 80 * scale);
  eye.scale.setScalar(260 * scale);
  parent.add(eye);
  return eye;
}
