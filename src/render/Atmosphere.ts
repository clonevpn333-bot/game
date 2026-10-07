import * as THREE from 'three';
import { dreamUniforms } from './DreamShading';
import { DEFAULT_SKY, Sky, SkyParams } from './Sky';
import { DEFAULT_POST, PostParams, PostPipeline } from './Post';
import type { MoteKind, Vfx } from '../systems/Vfx';

export interface FogParams {
  color: string;
  sun: string;
  low: string;
  density: number;
  base: number;
  falloff: number;
  heightMix: number;
  max: number;
}

export interface ChapterLook {
  sky: SkyParams;
  fog: FogParams;
  sunDir: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  rimColor: string;
  rimStrength: number;
  wobble: number;
  dread: number;
  post: PostParams;
  motes: { kind: MoteKind; color: string; density: number };
  envIntensity: number;
  shadows: boolean;
}

export const BASE_LOOK: ChapterLook = {
  sky: { ...DEFAULT_SKY },
  fog: { color: '#f6d9e6', sun: '#ffe9c4', low: '#d8c8f0', density: 0.012, base: 0, falloff: 0.03, heightMix: 0.5, max: 0.96 },
  sunDir: [0.4, 0.45, -0.8],
  sunColor: '#ffe6cc',
  sunIntensity: 2.4,
  hemiSky: '#e9ddff',
  hemiGround: '#f6c9d6',
  hemiIntensity: 1.2,
  rimColor: '#fff2f8',
  rimStrength: 0.35,
  wobble: 0,
  dread: 0,
  post: { ...DEFAULT_POST },
  motes: { kind: 'pollen', color: '#fff4d6', density: 0.8 },
  envIntensity: 0.8,
  shadows: true,
};

/** Merge a partial look over the base (one level deep for nested objects). */
export function look(over: Partial<{ [K in keyof ChapterLook]: ChapterLook[K] extends object ? Partial<ChapterLook[K]> : ChapterLook[K] }>): ChapterLook {
  const out = structuredClone(BASE_LOOK) as ChapterLook;
  for (const [k, v] of Object.entries(over)) {
    const key = k as keyof ChapterLook;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out[key] as object, v);
    else (out as unknown as Record<string, unknown>)[key] = v;
  }
  return out;
}

const isColor = (s: unknown): s is string => typeof s === 'string' && s.startsWith('#');
const ca = new THREE.Color();
const cb = new THREE.Color();

function blend<T>(a: T, b: T, t: number): T {
  if (typeof a === 'number' && typeof b === 'number') return (a + (b - a) * t) as T;
  if (isColor(a) && isColor(b)) {
    ca.set(a);
    cb.set(b);
    return `#${ca.lerp(cb, t).getHexString()}` as T;
  }
  if (Array.isArray(a) && Array.isArray(b)) return a.map((x, i) => blend(x, b[i], t)) as T;
  if (a && b && typeof a === 'object') {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(b as object)) o[k] = blend((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], t);
    return o as T;
  }
  return t < 0.5 ? a : b;
}

export class Atmosphere {
  readonly sky = new Sky();
  readonly hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1);
  readonly sun = new THREE.DirectionalLight('#ffffff', 2);
  current: ChapterLook = structuredClone(BASE_LOOK);
  private from: ChapterLook | null = null;
  private to: ChapterLook | null = null;
  private t = 0;
  private dur = 1;
  private envDirty = true;
  private pmrem: THREE.PMREMGenerator;
  private envRT: THREE.WebGLRenderTarget | null = null;
  private readonly envScene = new THREE.Scene();
  private readonly envSky = new Sky();

  constructor(
    private readonly scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    private readonly post: PostPipeline,
    private readonly vfx: Vfx,
    mobile: boolean,
  ) {
    scene.add(this.sky.mesh, this.hemi, this.sun, this.sun.target);
    this.sun.castShadow = true;
    const size = mobile ? 1024 : 2048;
    this.sun.shadow.mapSize.set(size, size);
    const s = this.sun.shadow.camera;
    s.left = -28; s.right = 28; s.top = 28; s.bottom = -28; s.near = 1; s.far = 160;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    this.sun.shadow.radius = 4;
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envSky.mesh.scale.setScalar(100);
    this.envScene.add(this.envSky.mesh);
  }

  set(l: ChapterLook): void {
    this.current = structuredClone(l);
    this.to = null;
    this.apply(this.current);
    this.envDirty = true;
    this.vfx.setMotes(l.motes.kind, l.motes.color, l.motes.density);
  }

  /** Smoothly blend to another look over `dur` seconds. */
  blendTo(l: ChapterLook, dur: number): void {
    this.from = structuredClone(this.current);
    this.to = structuredClone(l);
    this.t = 0;
    this.dur = Math.max(0.01, dur);
    if (l.motes.kind !== this.current.motes.kind) this.vfx.setMotes(l.motes.kind, l.motes.color, l.motes.density);
  }

  private apply(l: ChapterLook): void {
    const u = dreamUniforms;
    u.uFogColor.value.set(l.fog.color);
    u.uFogSunColor.value.set(l.fog.sun);
    u.uFogLowColor.value.set(l.fog.low);
    u.uFogDensity.value = l.fog.density;
    u.uFogBase.value = l.fog.base;
    u.uFogHeightFalloff.value = l.fog.falloff;
    u.uFogHeightMix.value = l.fog.heightMix;
    u.uFogMax.value = l.fog.max;
    u.uSunDir.value.set(...l.sunDir).normalize();
    u.uRimColor.value.set(l.rimColor);
    u.uRimStrength.value = l.rimStrength;
    u.uWobble.value = l.wobble;
    u.uDread.value = l.dread;
    this.sky.apply(l.sky);
    this.hemi.color.set(l.hemiSky);
    this.hemi.groundColor.set(l.hemiGround);
    this.hemi.intensity = l.hemiIntensity;
    this.sun.color.set(l.sunColor);
    this.sun.intensity = l.sunIntensity;
    this.sun.castShadow = l.shadows;
    this.scene.environmentIntensity = l.envIntensity;
    this.post.apply(l.post);
  }

  update(dt: number, focus: THREE.Vector3, camera: THREE.Camera): void {
    if (this.to && this.from) {
      this.t += dt / this.dur;
      const k = Math.min(1, this.t);
      const e = k * k * (3 - 2 * k);
      this.current = blend(this.from, this.to, e);
      this.current.motes = this.to.motes;
      this.apply(this.current);
      if (k >= 1) {
        this.current = this.to;
        this.to = null;
        this.envDirty = true;
      }
    }
    // keep the shadow frustum centred on the player
    const d = new THREE.Vector3(...this.current.sunDir).normalize();
    const snap = 2;
    const fx = Math.round(focus.x / snap) * snap;
    const fz = Math.round(focus.z / snap) * snap;
    this.sun.target.position.set(fx, focus.y, fz);
    this.sun.position.set(fx + d.x * 80, focus.y + d.y * 80, fz + d.z * 80);
    this.sky.follow(camera);
    if (this.envDirty) this.rebuildEnv();
  }

  private rebuildEnv(): void {
    this.envDirty = false;
    this.envSky.apply(this.current.sky);
    this.envRT?.dispose();
    this.envRT = this.pmrem.fromScene(this.envScene, 0, 0.1, 500);
    this.scene.environment = this.envRT.texture;
  }

  dispose(): void {
    this.envRT?.dispose();
    this.pmrem.dispose();
  }
}

export { DEFAULT_SKY, DEFAULT_POST };
