import * as THREE from 'three';
import { createSeededRandom } from '../utils/random';
import { rockGeo } from '../world/geo';
import { Mats } from '../world/Materials';

type Particle = { life: number; max: number; vel: THREE.Vector3; size: number; grav: number; drag: number };

class ParticlePool {
  readonly points: THREE.Points;
  private readonly parts: Particle[] = [];
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly sizeA: Float32Array;
  private readonly alpha: Float32Array;
  private readonly baseCol: Float32Array;
  private cursor = 0;

  constructor(private readonly count: number, additive: boolean) {
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.baseCol = new Float32Array(count * 3);
    this.sizeA = new Float32Array(count);
    this.alpha = new Float32Array(count);
    for (let i = 0; i < count; i += 1) this.parts.push({ life: 0, max: 1, vel: new THREE.Vector3(), size: 1, grav: 0, drag: 0 });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.sizeA, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: `attribute float aSize; attribute float aAlpha; attribute vec3 color; varying vec3 vC; varying float vA;
        void main(){ vC = color; vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = min(aSize * (280.0 / max(0.1, -mv.z)), 90.0); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vC, a); }`,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
  }

  spawn(p: THREE.Vector3, vel: THREE.Vector3, color: THREE.Color, size: number, life: number, grav: number, drag: number): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const part = this.parts[i];
    part.life = life;
    part.max = life;
    part.vel.copy(vel);
    part.size = size;
    part.grav = grav;
    part.drag = drag;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.baseCol.set([color.r, color.g, color.b], i * 3);
  }

  update(dt: number): void {
    for (let i = 0; i < this.count; i += 1) {
      const part = this.parts[i];
      if (part.life <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      part.life -= dt;
      part.vel.y -= part.grav * dt;
      part.vel.multiplyScalar(Math.exp(-part.drag * dt));
      this.pos[i * 3] += part.vel.x * dt;
      this.pos[i * 3 + 1] += part.vel.y * dt;
      this.pos[i * 3 + 2] += part.vel.z * dt;
      const k = Math.max(0, part.life / part.max);
      this.alpha[i] = k;
      this.sizeA[i] = part.size * (0.4 + 0.6 * k);
      this.col[i * 3] = this.baseCol[i * 3];
      this.col[i * 3 + 1] = this.baseCol[i * 3 + 1];
      this.col[i * 3 + 2] = this.baseCol[i * 3 + 2];
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.color.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }
}

type Ring = { mesh: THREE.Mesh; life: number; max: number; from: number; to: number; kind: 'shock' | 'tele' | 'marker' };
type Debris = { mesh: THREE.Mesh; vel: THREE.Vector3; target: THREE.Vector3; active: boolean; spin: THREE.Vector3; onLand: (p: THREE.Vector3) => void };

export class Vfx {
  readonly group = new THREE.Group();
  private readonly glow = new ParticlePool(700, true);
  private readonly smoke = new ParticlePool(300, false);
  private readonly rings: Ring[] = [];
  private readonly debris: Debris[] = [];
  private readonly rng = createSeededRandom(31);
  private readonly trail: THREE.Mesh;
  private readonly trailPts: Array<{ a: THREE.Vector3; b: THREE.Vector3; t: number }> = [];
  private readonly trailMat: THREE.MeshBasicMaterial;
  readonly impactLight = new THREE.PointLight('#ffb070', 0, 14, 2);
  private impactT = 0;
  private readonly tmp = new THREE.Vector3();
  private readonly c = new THREE.Color();
  reducedMotion = false;

  constructor(private readonly space: THREE.Object3D) {
    this.group.add(this.glow.points, this.smoke.points, this.impactLight);
    this.trailMat = new THREE.MeshBasicMaterial({
      color: '#cfe0ff',
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexColors: true,
    });
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 2 * 3), 3));
    tg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(16 * 2 * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < 15; i += 1) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    tg.setIndex(idx);
    this.trail = new THREE.Mesh(tg, this.trailMat);
    this.trail.frustumCulled = false;
    this.trail.visible = false;
    this.group.add(this.trail);
    for (let i = 0; i < 12; i += 1) {
      const mat = new THREE.MeshBasicMaterial({ color: '#ffc060', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2), mat);
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.group.add(mesh);
      this.rings.push({ mesh, life: 0, max: 1, from: 1, to: 1, kind: 'shock' });
    }
    const rg = rockGeo(5, 0);
    const rc = new Float32Array(rg.attributes.position.count * 3).fill(0.65);
    rg.setAttribute('color', new THREE.BufferAttribute(rc, 3));
    for (let i = 0; i < 16; i += 1) {
      const mesh = new THREE.Mesh(rg, Mats().rock);
      mesh.castShadow = true;
      mesh.visible = false;
      this.group.add(mesh);
      this.debris.push({ mesh, vel: new THREE.Vector3(), target: new THREE.Vector3(), active: false, spin: new THREE.Vector3(), onLand: () => undefined });
    }
  }

  private rnd(n = 1): number {
    return (this.rng() - 0.5) * 2 * n;
  }

  sparks(p: THREE.Vector3, count: number, color = '#ffd0a0', speed = 7): void {
    this.c.set(color);
    for (let i = 0; i < count; i += 1) {
      this.tmp.set(this.rnd(), this.rng() * 1.2, this.rnd()).normalize().multiplyScalar(speed * (0.4 + this.rng()));
      this.glow.spawn(p, this.tmp, this.c, 0.12 + this.rng() * 0.12, 0.3 + this.rng() * 0.4, 14, 1.5);
    }
  }

  ichor(p: THREE.Vector3, count: number): void {
    this.c.set('#ff6a20');
    for (let i = 0; i < count; i += 1) {
      this.tmp.set(this.rnd(), this.rng() * 1.5, this.rnd()).multiplyScalar(4);
      this.glow.spawn(p, this.tmp, this.c, 0.2 + this.rng() * 0.2, 0.5 + this.rng() * 0.5, 9, 1);
    }
  }

  dust(p: THREE.Vector3, count: number, spread = 1, color = '#6a6460'): void {
    this.c.set(color);
    for (let i = 0; i < count; i += 1) {
      const q = this.tmp.set(p.x + this.rnd(spread), p.y + this.rng() * 0.4, p.z + this.rnd(spread));
      const v = new THREE.Vector3(this.rnd(1.5), 0.6 + this.rng() * 1.6, this.rnd(1.5));
      this.smoke.spawn(q, v, this.c, 0.9 + this.rng() * 1.2, 0.9 + this.rng() * 0.9, -0.2, 1.4);
    }
  }

  holyMotes(p: THREE.Vector3, count: number): void {
    this.c.set('#ffd890');
    for (let i = 0; i < count; i += 1) {
      const q = this.tmp.set(p.x + this.rnd(0.6), p.y + this.rng() * 1.6, p.z + this.rnd(0.6));
      this.glow.spawn(q, new THREE.Vector3(this.rnd(0.3), 0.8 + this.rng(), this.rnd(0.3)), this.c, 0.14, 1.2 + this.rng(), -0.3, 0.5);
    }
  }

  impact(p: THREE.Vector3, strength: number, color = '#ffb070'): void {
    this.impactLight.position.copy(p);
    this.impactLight.color.set(color);
    this.impactLight.intensity = 30 * strength;
    this.impactT = 0.18;
  }

  ring(p: THREE.Vector3, from: number, to: number, life: number, color: string, kind: Ring['kind'] = 'shock'): void {
    const r = this.rings.find((x) => x.life <= 0) ?? this.rings[0];
    r.mesh.position.copy(p).setY(p.y + 0.12);
    r.life = life;
    r.max = life;
    r.from = from;
    r.to = to;
    r.kind = kind;
    (r.mesh.material as THREE.MeshBasicMaterial).color.set(color);
    r.mesh.visible = true;
  }

  dropDebris(target: THREE.Vector3, delay: number, onLand: (p: THREE.Vector3) => void): void {
    const d = this.debris.find((x) => !x.active);
    if (!d) return;
    d.active = true;
    d.target.copy(target);
    const h = 22 + delay * 9.8 * 0.5 * delay;
    d.mesh.position.set(target.x + this.rnd(2), target.y + h, target.z + this.rnd(2));
    d.vel.set(0, 0, 0);
    d.mesh.scale.setScalar(0.7 + this.rng() * 0.8);
    d.spin.set(this.rnd(3), this.rnd(3), this.rnd(3));
    d.mesh.visible = true;
    d.onLand = onLand;
    // Telegraph: a red marker that closes in until impact.
    const fall = Math.sqrt((2 * h) / 18);
    this.ring(target, 2.6, 1.0, fall, '#ff4a2a', 'marker');
  }

  /** Sword trail between blade base and tip (world positions). */
  updateTrail(active: boolean, base: THREE.Vector3, tip: THREE.Vector3, heavy: boolean): void {
    if (active) {
      this.trailPts.unshift({ a: this.space.worldToLocal(base.clone()), b: this.space.worldToLocal(tip.clone()), t: 0 });
      if (this.trailPts.length > 16) this.trailPts.pop();
    } else if (this.trailPts.length) {
      this.trailPts.pop();
    }
    const n = this.trailPts.length;
    this.trail.visible = n > 2;
    if (!this.trail.visible) return;
    const pos = this.trail.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.trail.geometry.attributes.color as THREE.BufferAttribute;
    this.c.set(heavy ? '#ffcf8a' : '#bcd4ff');
    for (let i = 0; i < 16; i += 1) {
      const p = this.trailPts[Math.min(i, n - 1)];
      pos.setXYZ(i * 2, p.a.x, p.a.y, p.a.z);
      pos.setXYZ(i * 2 + 1, p.b.x, p.b.y, p.b.z);
      const k = Math.max(0, 1 - i / Math.max(1, n - 1));
      col.setXYZ(i * 2, this.c.r * k * 0.3, this.c.g * k * 0.3, this.c.b * k * 0.3);
      col.setXYZ(i * 2 + 1, this.c.r * k, this.c.g * k, this.c.b * k);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  }

  update(dt: number): void {
    this.glow.update(dt);
    this.smoke.update(dt);
    if (this.impactT > 0) {
      this.impactT -= dt;
      this.impactLight.intensity *= Math.exp(-14 * dt);
      if (this.impactT <= 0) this.impactLight.intensity = 0;
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      const k = 1 - Math.max(0, r.life) / r.max;
      const s = r.from + (r.to - r.from) * k;
      r.mesh.scale.setScalar(s);
      const m = r.mesh.material as THREE.MeshBasicMaterial;
      m.opacity = r.kind === 'tele' ? 0.4 + 0.5 * Math.sin(k * 30) * 0.5 + 0.3 : r.kind === 'marker' ? 0.5 + k * 0.5 : 1 - k;
      if (r.life <= 0) r.mesh.visible = false;
    }
    for (const d of this.debris) {
      if (!d.active) continue;
      d.vel.y -= 18 * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      if (d.mesh.position.y <= d.target.y + 0.4) {
        d.active = false;
        d.mesh.visible = false;
        this.dust(d.target, 10, 1.5);
        this.sparks(d.target, 8, '#ffa060', 5);
        d.onLand(d.target.clone());
      }
    }
  }

  clear(): void {
    for (const r of this.rings) {
      r.life = 0;
      r.mesh.visible = false;
    }
    for (const d of this.debris) {
      d.active = false;
      d.mesh.visible = false;
    }
    this.trailPts.length = 0;
  }
}
