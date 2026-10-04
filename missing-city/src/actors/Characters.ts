import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { G } from '../render/Globals';

export type CharName =
  | 'elias' | 'maya' | 'reyes' | 'voss' | 'ellie' | 'elias_teen' | 'elias_child'
  | 'civ_man' | 'civ_woman' | 'civ_office' | 'civ_nurse' | 'civ_kid' | 'remnant';

export const ALL_CHARS: CharName[] = ['elias', 'maya', 'reyes', 'voss', 'ellie', 'elias_teen', 'elias_child', 'civ_man', 'civ_woman', 'civ_office', 'civ_nurse', 'civ_kid', 'remnant'];
export const CIVILIANS: CharName[] = ['civ_man', 'civ_woman', 'civ_office', 'civ_nurse', 'civ_kid'];

const UPPER = /^(spine|chest|neck|head|shoulder|upperarm|forearm|hand|f\d)/;

interface Entry {
  gltf: GLTF;
  clips: Map<string, THREE.AnimationClip>;
  upper: Map<string, THREE.AnimationClip>;
  lower: Map<string, THREE.AnimationClip>;
}

const loader = new GLTFLoader();
const lib = new Map<CharName, Entry>();
const pending = new Map<CharName, Promise<Entry>>();

export function loadCharacter(name: CharName, base = './assets/characters/'): Promise<Entry> {
  const hit = lib.get(name);
  if (hit) return Promise.resolve(hit);
  const p = pending.get(name);
  if (p) return p;
  const pr = loader.loadAsync(`${base}${name}.glb`).then((gltf) => {
    const clips = new Map<string, THREE.AnimationClip>();
    const upper = new Map<string, THREE.AnimationClip>();
    const lower = new Map<string, THREE.AnimationClip>();
    for (const c of gltf.animations) {
      clips.set(c.name, c);
      const u = c.clone();
      u.tracks = u.tracks.filter((t) => UPPER.test(t.name.split('.')[0]));
      upper.set(c.name, u);
      const l = c.clone();
      l.tracks = l.tracks.filter((t) => !UPPER.test(t.name.split('.')[0]));
      lower.set(c.name, l);
    }
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
        const mat = m.material as THREE.MeshStandardMaterial;
        mat.envMapIntensity = 0.7;
        if (mat.map) mat.map.anisotropy = 4;
      }
    });
    const e = { gltf, clips, upper, lower };
    lib.set(name, e);
    return e;
  });
  pending.set(name, pr);
  return pr;
}

export function isLoaded(name: CharName): boolean {
  return lib.has(name);
}

// ------------------------------------------------------------------ material variants
function ghostOf(src: THREE.MeshStandardMaterial): THREE.Material {
  // one material per ghost so each recording can fade on its own
  const mat = new THREE.MeshStandardMaterial({ map: src.map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, roughness: 1 });
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = G.uTime;
    s.vertexShader = 'varying vec3 vGW;\n' + s.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n vGW = (modelMatrix * vec4(transformed,1.0)).xyz;');
    s.fragmentShader = 'uniform float uTime;\nvarying vec3 vGW;\n' + s.fragmentShader.replace(
      '#include <dithering_fragment>',
      `float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 1.7);
       float scan = 0.6 + 0.4 * sin(vGW.y * 70.0 - uTime * 7.0);
       float flick = 0.85 + 0.15 * sin(uTime * 19.0 + vGW.x * 4.0);
       vec3 base = diffuseColor.rgb;
       vec3 tint = mix(vec3(0.55, 0.85, 1.0), base * 1.4 + 0.15, 0.4);
       float a = (0.08 + fres * 0.8) * scan * flick * opacity;
       gl_FragColor = vec4(tint * a * 1.3, a);
       #include <dithering_fragment>`,
    );
  };
  mat.customProgramCacheKey = () => 'ghost-glb';
  return mat;
}

const remnantMats = new WeakMap<THREE.Material, THREE.MeshStandardMaterial>();
function remnantOf(src: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  let m = remnantMats.get(src);
  if (m) return m;
  const mat = src.clone();
  mat.roughness = 0.35;
  mat.metalness = 0.3;
  mat.onBeforeCompile = (s) => {
    s.uniforms.uTime = G.uTime;
    mat.userData.shader = s;
    s.vertexShader = 'uniform float uTime;\nvarying vec3 vRW;\n' + s.vertexShader.replace(
      '#include <skinning_vertex>',
      `#include <skinning_vertex>
       float st = floor(uTime * 9.0);
       float hs = fract(sin(dot(floor(transformed * 7.0) + st, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
       float burst = step(0.84, fract(sin(st * 3.17) * 917.13));
       transformed += normal * (hs - 0.35) * 0.035 * (0.4 + burst * 2.5);`,
    ).replace('#include <project_vertex>', '#include <project_vertex>\n vRW = (modelMatrix * vec4(transformed,1.0)).xyz;');
    s.fragmentShader = 'uniform float uTime;\nvarying vec3 vRW;\n' + s.fragmentShader.replace(
      '#include <dithering_fragment>',
      `float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.4);
       vec3 irid = 0.5 + 0.5 * cos(6.2831 * (fres + vec3(0.0, 0.33, 0.67) + uTime * 0.1));
       float pulse = 0.6 + 0.4 * sin(uTime * 5.0 + vRW.y * 3.0);
       gl_FragColor.rgb = gl_FragColor.rgb * 0.6 + irid * fres * 0.8 + vec3(0.3, 0.7, 1.0) * fres * pulse * 0.5;
       #include <dithering_fragment>`,
    );
  };
  mat.customProgramCacheKey = () => 'remnant-glb';
  remnantMats.set(src, mat);
  return mat;
}

const frozenMats = new WeakMap<THREE.Material, THREE.MeshStandardMaterial>();
function frozenOf(src: THREE.MeshStandardMaterial): THREE.MeshStandardMaterial {
  let m = frozenMats.get(src);
  if (m) return m;
  const mat = src.clone();
  mat.onBeforeCompile = (s) => {
    s.fragmentShader = s.fragmentShader.replace(
      '#include <dithering_fragment>',
      `float fz = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.0);
       gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0.7, 0.66, 0.9) * dot(gl_FragColor.rgb, vec3(0.33)), 0.55) + vec3(0.55, 0.45, 1.0) * fz * 0.7;
       #include <dithering_fragment>`,
    );
  };
  mat.customProgramCacheKey = () => 'frozen-glb';
  frozenMats.set(src, mat);
  return mat;
}

export type Look = 'normal' | 'ghost' | 'remnant' | 'frozen';

// ------------------------------------------------------------------ actor
export class Actor {
  readonly root = new THREE.Group();
  readonly model: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  readonly mesh: THREE.SkinnedMesh | null = null;
  private entry: Entry;
  private actions = new Map<string, THREE.AnimationAction>();
  private loco: { name: string; w: number }[] = [];
  private oneShot: THREE.AnimationAction | null = null;
  private pose: THREE.AnimationAction | null = null;
  private aimUpper: THREE.AnimationAction | null = null;
  private bones = new Map<string, THREE.Bone>();
  speed = 0;
  crouch = 0;
  aim = 0;
  /** override locomotion with a looping pose clip (sit, talk, cower...) */
  poseName: string | null = null;
  talking = 0;
  private blinkT = 2;
  private blinkV = 0;
  private morphIdx: Record<string, number> = {};
  look: Look;
  /** head look target in world space */
  lookAt: THREE.Vector3 | null = null;
  private headQ = new THREE.Quaternion();
  timeScale = 1;
  visible = true;

  constructor(readonly name: CharName, look: Look = 'normal') {
    const e = lib.get(name);
    if (!e) throw new Error(`character ${name} not loaded`);
    this.entry = e;
    this.look = look;
    this.model = SkeletonUtils.clone(e.gltf.scene);
    this.root.add(this.model);
    this.model.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (sm.isSkinnedMesh) {
        (this as { mesh: THREE.SkinnedMesh | null }).mesh = sm;
        const src = sm.material as THREE.MeshStandardMaterial;
        if (look === 'ghost') {
          sm.material = ghostOf(src);
          sm.castShadow = false;
          sm.receiveShadow = false;
        } else if (look === 'remnant') sm.material = remnantOf(src);
        else if (look === 'frozen') sm.material = frozenOf(src);
        if (sm.morphTargetDictionary) this.morphIdx = sm.morphTargetDictionary;
      }
      const b = o as THREE.Bone;
      if (b.isBone) this.bones.set(b.name, b);
    });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.setLocoSet();
  }

  has(clip: string): boolean {
    return this.entry.clips.has(clip);
  }

  bone(n: string): THREE.Bone | undefined {
    return this.bones.get(n.replace('.', ''));
  }

  private action(name: string, part: 'full' | 'upper' | 'lower' = 'full'): THREE.AnimationAction | null {
    const key = `${part}:${name}`;
    let a = this.actions.get(key);
    if (a) return a;
    const map = part === 'full' ? this.entry.clips : part === 'upper' ? this.entry.upper : this.entry.lower;
    const clip = map.get(name);
    if (!clip) return null;
    a = this.mixer.clipAction(clip);
    this.actions.set(key, a);
    return a;
  }

  private setLocoSet(): void {
    const names = this.name === 'remnant' ? ['rem_idle', 'rem_walk', 'rem_run'] : ['idle', 'walk', 'run', 'sprint', 'crouch_idle', 'crouch_walk'];
    this.loco = names.filter((n) => this.has(n)).map((n) => ({ name: n, w: 0 }));
    for (const l of this.loco) {
      const a = this.action(l.name)!;
      a.play();
      a.setEffectiveWeight(0);
      a.time = Math.random() * a.getClip().duration;
    }
  }

  /** Play a one-shot clip (melee, vault...). Returns its duration. */
  play(name: string, opts: { fade?: number; speed?: number; hold?: boolean } = {}): number {
    const a = this.action(name);
    if (!a) return 0;
    const fade = opts.fade ?? 0.15;
    if (this.oneShot && this.oneShot !== a) this.oneShot.fadeOut(fade);
    a.reset();
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.timeScale = opts.speed ?? 1;
    a.setEffectiveWeight(1);
    a.fadeIn(fade);
    a.play();
    this.oneShot = a;
    const dur = a.getClip().duration / a.timeScale;
    if (!opts.hold) {
      window.setTimeout(() => {
        if (this.oneShot === a) {
          a.fadeOut(0.25);
          this.oneShot = null;
        }
      }, Math.max(0, dur * 1000 - 200));
    }
    return dur;
  }

  stopOneShot(fade = 0.2): void {
    if (this.oneShot) this.oneShot.fadeOut(fade);
    this.oneShot = null;
  }

  /** Loop a pose clip instead of locomotion (null to release). */
  setPose(name: string | null, fade = 0.4): void {
    if (this.poseName === name) return;
    if (this.pose) this.pose.fadeOut(fade);
    this.pose = null;
    this.poseName = name;
    if (!name) return;
    const a = this.action(name);
    if (!a) return;
    a.reset();
    a.setLoop(THREE.LoopRepeat, Infinity);
    a.setEffectiveWeight(1);
    a.fadeIn(fade);
    a.play();
    this.pose = a;
  }

  morph(name: string, v: number): void {
    const i = this.morphIdx[name];
    if (i === undefined || !this.mesh?.morphTargetInfluences) return;
    this.mesh.morphTargetInfluences[i] = v;
  }

  update(dt: number): void {
    const d = dt * this.timeScale;
    // locomotion weights
    const sp = this.speed;
    const busy = (this.oneShot ? 1 : 0) + (this.pose ? 1 : 0);
    const rem = this.name === 'remnant';
    const target: Record<string, number> = {};
    if (rem) {
      target.rem_idle = THREE.MathUtils.clamp(1 - sp / 1.5, 0, 1);
      target.rem_walk = sp < 1.5 ? THREE.MathUtils.clamp(sp / 1.5, 0, 1) : THREE.MathUtils.clamp(1 - (sp - 1.5) / 2.5, 0, 1);
      target.rem_run = THREE.MathUtils.clamp((sp - 1.5) / 2.5, 0, 1);
    } else {
      const c = this.crouch;
      const stand = 1 - c;
      target.idle = stand * THREE.MathUtils.clamp(1 - sp / 1.4, 0, 1);
      target.walk = stand * (sp < 1.4 ? THREE.MathUtils.clamp(sp / 1.4, 0, 1) : THREE.MathUtils.clamp(1 - (sp - 1.4) / 2.2, 0, 1));
      const hasSprint = this.has('sprint');
      target.run = stand * (sp < 3.6 || !hasSprint ? THREE.MathUtils.clamp((sp - 1.4) / 2.2, 0, 1) : THREE.MathUtils.clamp(1 - (sp - 3.6) / 1.8, 0, 1));
      target.sprint = stand * THREE.MathUtils.clamp((sp - 3.6) / 1.8, 0, 1);
      target.crouch_idle = c * THREE.MathUtils.clamp(1 - sp / 1.0, 0, 1);
      target.crouch_walk = c * THREE.MathUtils.clamp(sp / 1.0, 0, 1);
    }
    for (const l of this.loco) {
      const want = (target[l.name] ?? 0) * (busy ? 0 : 1);
      l.w = THREE.MathUtils.damp(l.w, want, 10, d);
      const a = this.action(l.name)!;
      a.setEffectiveWeight(l.w);
      // keep foot cadence matched to ground speed
      if (l.name === 'walk' || l.name === 'rem_walk') a.timeScale = THREE.MathUtils.clamp(sp / 1.4, 0.6, 1.6);
      else if (l.name === 'run' || l.name === 'rem_run') a.timeScale = THREE.MathUtils.clamp(sp / 3.4, 0.7, 1.4);
      else if (l.name === 'sprint') a.timeScale = THREE.MathUtils.clamp(sp / 5.2, 0.8, 1.3);
      else if (l.name === 'crouch_walk') a.timeScale = THREE.MathUtils.clamp(sp / 1.0, 0.6, 1.5);
      else a.timeScale = 1;
    }
    // aim overlay (upper body)
    if (this.has('aim_idle')) {
      if (this.aim > 0.01 && !this.aimUpper) {
        this.aimUpper = this.action('aim_idle', 'upper');
        this.aimUpper?.play();
      }
      if (this.aimUpper) {
        const w = this.aim * (this.oneShot ? 0 : 1);
        this.aimUpper.setEffectiveWeight(w * 6);
        if (this.aim <= 0.01) {
          this.aimUpper.stop();
          this.aimUpper = null;
        }
      }
    }
    this.mixer.update(d);
    // head look
    if (this.lookAt) {
      const head = this.bone('head');
      if (head) {
        const hp = head.getWorldPosition(new THREE.Vector3());
        const local = this.root.worldToLocal(this.lookAt.clone());
        const hl = this.root.worldToLocal(hp.clone());
        const dir = local.sub(hl);
        const yaw = THREE.MathUtils.clamp(Math.atan2(dir.x, dir.z), -1.1, 1.1);
        const pitch = THREE.MathUtils.clamp(-Math.atan2(dir.y, Math.hypot(dir.x, dir.z)), -0.5, 0.5);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch * 0.6, yaw * 0.7, 0, 'YXZ'));
        this.headQ.slerp(q, 1 - Math.exp(-6 * dt));
        head.quaternion.premultiply(this.headQ);
      }
    }
    // face: blink + talk jaw
    if (this.morphIdx.blink !== undefined) {
      this.blinkT -= dt;
      if (this.blinkT <= 0) {
        this.blinkV = 1;
        this.blinkT = 2 + Math.random() * 4;
      }
      this.blinkV = Math.max(0, this.blinkV - dt * 7);
      this.morph('blink', Math.sin(this.blinkV * Math.PI));
      const jaw = this.talking > 0 ? (0.25 + 0.35 * Math.abs(Math.sin(performance.now() * 0.018)) * (0.5 + 0.5 * Math.sin(performance.now() * 0.0071))) : 0;
      this.morph('jaw_open', THREE.MathUtils.damp(this.mesh?.morphTargetInfluences?.[this.morphIdx.jaw_open] ?? 0, jaw, 18, dt));
    }
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
  }
}
