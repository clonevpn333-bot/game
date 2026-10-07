import * as THREE from 'three';
import { radialTexture } from './Materials';

export interface ParticleOpts {
  color?: THREE.ColorRepresentation;
  color2?: THREE.ColorRepresentation;
  size?: number;
  sizeEnd?: number;
  life?: number;
  speed?: number;
  spread?: number; // radians-ish cone/sphere randomness
  dir?: THREE.Vector3;
  gravity?: number;
  drag?: number;
  radius?: number; // spawn radius
  alpha?: number;
}

const vert = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uScale;
  void main(){
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = min(aSize * uScale / max(0.1, -mv.z), 420.0);
    // fade particles that drift right into the lens so they never white-out a shot
    vAlpha = aAlpha * smoothstep(1.5, 9.0, -mv.z);
    vColor = aColor;
  }
`;
const fragSrc = /* glsl */ `
  uniform sampler2D uMap;
  varying float vAlpha;
  varying vec3 vColor;
  void main(){
    vec4 t = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(vColor, t.a * vAlpha);
    if (gl_FragColor.a < 0.003) discard;
  }
`;

class Pool {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly col: Float32Array;
  private readonly size: Float32Array;
  private readonly alpha: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly s0: Float32Array;
  private readonly s1: Float32Array;
  private readonly a0: Float32Array;
  private readonly grav: Float32Array;
  private readonly dragA: Float32Array;
  private readonly c0: Float32Array;
  private readonly c1: Float32Array;
  private cursor = 0;
  readonly material: THREE.ShaderMaterial;

  constructor(readonly capacity: number, additive: boolean) {
    const g = new THREE.BufferGeometry();
    this.pos = new Float32Array(capacity * 3);
    this.col = new Float32Array(capacity * 3);
    this.size = new Float32Array(capacity);
    this.alpha = new Float32Array(capacity);
    this.vel = new Float32Array(capacity * 3);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.s0 = new Float32Array(capacity);
    this.s1 = new Float32Array(capacity);
    this.a0 = new Float32Array(capacity);
    this.grav = new Float32Array(capacity);
    this.dragA = new Float32Array(capacity);
    this.c0 = new Float32Array(capacity * 3);
    this.c1 = new Float32Array(capacity * 3);
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: fragSrc,
      uniforms: { uMap: { value: radialTexture() }, uScale: { value: 600 } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  spawn(p: THREE.Vector3, v: THREE.Vector3, o: Required<ParticleOpts>, c0: THREE.Color, c1: THREE.Color): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    this.pos.set([p.x, p.y, p.z], i * 3);
    this.vel.set([v.x, v.y, v.z], i * 3);
    this.life[i] = 0;
    this.maxLife[i] = o.life * (0.7 + Math.random() * 0.6);
    this.s0[i] = o.size * (0.7 + Math.random() * 0.6);
    this.s1[i] = o.sizeEnd;
    this.a0[i] = o.alpha;
    this.grav[i] = o.gravity;
    this.dragA[i] = o.drag;
    this.c0.set([c0.r, c0.g, c0.b], i * 3);
    this.c1.set([c1.r, c1.g, c1.b], i * 3);
  }

  update(dt: number): void {
    for (let i = 0; i < this.capacity; i++) {
      const ml = this.maxLife[i];
      if (ml <= 0) continue;
      const l = (this.life[i] += dt);
      const t = l / ml;
      if (t >= 1) {
        this.maxLife[i] = 0;
        this.alpha[i] = 0;
        this.size[i] = 0;
        continue;
      }
      const k = i * 3;
      const d = Math.exp(-this.dragA[i] * dt);
      this.vel[k] *= d;
      this.vel[k + 1] = this.vel[k + 1] * d - this.grav[i] * dt;
      this.vel[k + 2] *= d;
      this.pos[k] += this.vel[k] * dt;
      this.pos[k + 1] += this.vel[k + 1] * dt;
      this.pos[k + 2] += this.vel[k + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] * this.s0[i] - this.s0[i]) * t;
      this.alpha[i] = this.a0[i] * Math.min(1, t * 6) * (1 - t * t);
      this.col[k] = this.c0[k] + (this.c1[k] - this.c0[k]) * t;
      this.col[k + 1] = this.c0[k + 1] + (this.c1[k + 1] - this.c0[k + 1]) * t;
      this.col[k + 2] = this.c0[k + 2] + (this.c1[k + 2] - this.c0[k + 2]) * t;
    }
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
  }

  clear(): void {
    this.maxLife.fill(0);
    this.alpha.fill(0);
    this.size.fill(0);
  }
}

const tmpP = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const c0 = new THREE.Color();
const c1 = new THREE.Color();

/** Two pooled particle layers: soft "dust" (alpha) and "glow" (additive). */
export class Particles {
  readonly dust = new Pool(2400, false);
  readonly glow = new Pool(1600, true);

  constructor(scene: THREE.Scene) {
    scene.add(this.dust.points, this.glow.points);
  }

  setViewportHeight(h: number): void {
    this.dust.material.uniforms.uScale.value = h * 0.9;
    this.glow.material.uniforms.uScale.value = h * 0.9;
  }

  emit(layer: 'dust' | 'glow', at: THREE.Vector3, count: number, opts: ParticleOpts = {}): void {
    const o: Required<ParticleOpts> = {
      color: opts.color ?? '#d8c0a0',
      color2: opts.color2 ?? opts.color ?? '#d8c0a0',
      size: opts.size ?? 1,
      sizeEnd: opts.sizeEnd ?? 1.6,
      life: opts.life ?? 1.2,
      speed: opts.speed ?? 2,
      spread: opts.spread ?? 1,
      dir: opts.dir ?? new THREE.Vector3(0, 1, 0),
      gravity: opts.gravity ?? 0,
      drag: opts.drag ?? 1,
      radius: opts.radius ?? 0.2,
      alpha: opts.alpha ?? 0.8,
    };
    c0.set(o.color);
    c1.set(o.color2);
    const pool = layer === 'dust' ? this.dust : this.glow;
    for (let i = 0; i < count; i++) {
      tmpP.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).multiplyScalar(o.radius).add(at);
      tmpV.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).multiplyScalar(o.spread).add(o.dir).normalize();
      tmpV.multiplyScalar(o.speed * (0.5 + Math.random() * 0.8));
      pool.spawn(tmpP, tmpV, o, c0, c1);
    }
  }

  // ---- authored presets
  impactDust(at: THREE.Vector3, scale = 1): void {
    this.emit('dust', at, Math.floor(26 * scale), { color: '#c9b394', color2: '#8c7a6a', size: 2.2 * scale, sizeEnd: 3, life: 1.6, speed: 5 * scale, spread: 1.2, dir: new THREE.Vector3(0, 0.3, 0), drag: 1.8, radius: 0.6 * scale, alpha: 0.55 });
  }

  stompDust(at: THREE.Vector3, radius: number): void {
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      tmpP.set(Math.cos(a) * radius * 0.6, 0.5, Math.sin(a) * radius * 0.6).add(at);
      this.emit('dust', tmpP, 1, { color: '#cdb59a', color2: '#7c6c62', size: radius * 0.32, sizeEnd: 2.2, life: 3, speed: radius * 0.6, spread: 0.15, dir: new THREE.Vector3(Math.cos(a), 0.12, Math.sin(a)), drag: 1.0, radius: 0.5, alpha: 0.38 });
    }
  }

  sparks(at: THREE.Vector3, color: THREE.ColorRepresentation = '#ffcf7a', count = 14): void {
    this.emit('glow', at, count, { color, color2: '#ff6a2a', size: 0.25, sizeEnd: 0.2, life: 0.45, speed: 7, spread: 1.4, gravity: 12, drag: 1.5, radius: 0.05, alpha: 1 });
  }

  slash(at: THREE.Vector3, dir: THREE.Vector3): void {
    this.emit('glow', at, 10, { color: '#bfe8ff', color2: '#5fa8ff', size: 0.5, sizeEnd: 0.2, life: 0.3, speed: 4, spread: 0.6, dir, drag: 4, radius: 0.3, alpha: 0.8 });
  }

  motes(at: THREE.Vector3, color: THREE.ColorRepresentation = '#9ff4ff', count = 2, radius = 1): void {
    this.emit('glow', at, count, { color, color2: '#ffffff', size: 0.35, sizeEnd: 0.1, life: 2.5, speed: 0.6, spread: 1, dir: new THREE.Vector3(0, 1, 0), drag: 0.5, radius, alpha: 0.9 });
  }

  embers(at: THREE.Vector3, count = 1): void {
    this.emit('glow', at, count, { color: '#ffb347', color2: '#ff3a10', size: 0.18, sizeEnd: 0.3, life: 2.2, speed: 1.6, spread: 0.4, dir: new THREE.Vector3(0, 1, 0), gravity: -0.4, drag: 0.6, radius: 0.3, alpha: 1 });
  }

  update(dt: number): void {
    this.dust.update(dt);
    this.glow.update(dt);
  }

  clear(): void {
    this.dust.clear();
    this.glow.clear();
  }
}

