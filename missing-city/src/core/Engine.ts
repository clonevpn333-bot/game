import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { G } from '../render/Globals';

/** Final cinematic pass: grade, echo replay look, damage, grain, vignette, aberration, fade. */
const FinalShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: G.uTime,
    uEcho: G.uEcho,
    uWarp: G.uWarp,
    uFlash: G.uFlash,
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.9 },
    uGrain: { value: 0.032 },
    uAberration: { value: 0.0015 },
    uDamage: { value: 0 },
    uFade: { value: 0 },
    uSat: { value: 1 },
    uTint: { value: new THREE.Color(1, 1, 1) },
    uLift: { value: new THREE.Color(0.0, 0.004, 0.012) },
    uGlitch: { value: 0 },
    uWhite: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uEcho, uWarp, uFlash, uVignette, uGrain, uAberration, uDamage, uFade, uSat, uGlitch, uWhite;
    uniform vec2 uRes;
    uniform vec3 uTint, uLift;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float hash1(float p) { return fract(sin(p * 91.345) * 47453.5453); }
    void main() {
      vec2 uv = vUv;
      float t = uTime;
      // Echo: slow heat-shimmer waves plus horizontal tape tears
      float echo = uEcho;
      float g = uGlitch + uWarp * 0.25;
      if (echo > 0.001 || g > 0.001) {
        uv.x += sin(uv.y * 38.0 + t * 3.0) * 0.0016 * echo;
        uv.y += sin(uv.x * 22.0 - t * 2.0) * 0.0012 * echo;
        float band = floor(uv.y * 48.0 + floor(t * 14.0) * 3.0);
        float tear = step(1.0 - 0.06 * (echo * 0.5 + g), hash1(band + floor(t * 9.0)));
        uv.x += (hash1(band * 1.7) - 0.5) * 0.04 * tear * (echo * 0.5 + g);
      }
      vec2 dir = uv - 0.5;
      float dist = length(dir);
      float ab = uAberration + echo * 0.004 + uDamage * 0.006 + g * 0.01;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ab).b;

      // grade (pre-tonemap linear HDR): lift shadows toward teal, sat control
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSat);
      col = col * uTint + uLift * (1.0 - clamp(luma * 4.0, 0.0, 1.0));

      // echo replay grade: faded warm film with cyan highlights + scanlines
      if (echo > 0.001) {
        vec3 film = vec3(luma) * vec3(1.12, 0.98, 0.82) + vec3(0.015, 0.02, 0.03);
        film += smoothstep(0.4, 1.6, luma) * vec3(-0.1, 0.12, 0.2);
        float scan = 0.94 + 0.06 * sin(uv.y * uRes.y * 1.6 + t * 30.0);
        col = mix(col, film * scan, echo * 0.78);
        col += vec3(0.02, 0.05, 0.07) * echo * (1.0 - dist);
      }

      // damage: desaturate edges and pulse red
      if (uDamage > 0.001) {
        float edge = smoothstep(0.25, 0.75, dist);
        col = mix(col, vec3(luma) * vec3(0.9, 0.25, 0.22), edge * uDamage * 0.9);
      }

      // vignette
      float vig = smoothstep(0.85, 0.25, dist * (0.9 + uVignette * 0.35));
      col *= mix(1.0, vig, uVignette);

      // lightning / flashes
      col += vec3(0.6, 0.65, 0.8) * uFlash * 0.25;

      // film grain (luma-weighted)
      float n = hash(uv * uRes + fract(t * 61.0) * 100.0) - 0.5;
      col += n * uGrain * (0.35 + 0.65 * (1.0 - clamp(luma, 0.0, 1.0)));

      col = mix(col, vec3(4.0), uWhite);
      col *= (1.0 - uFade);
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }
  `,
};

export type Quality = 'low' | 'medium' | 'high';

export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.08, 900);
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  readonly finalPass: ShaderPass;
  readonly renderPass: RenderPass;
  quality: Quality = 'high';
  private maxDpr = 1.5;
  private lastW = 0;
  private lastH = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.scene.add(this.camera);

    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.45, 0.82);
    this.composer.addPass(this.bloom);
    this.finalPass = new ShaderPass(FinalShader);
    this.composer.addPass(this.finalPass);
    this.composer.addPass(new OutputPass());
    this.resize(true);
  }

  get post() {
    return this.finalPass.uniforms as unknown as typeof FinalShader.uniforms;
  }

  setQuality(q: Quality): void {
    this.quality = q;
    this.maxDpr = q === 'high' ? Math.min(window.devicePixelRatio || 1, 1.75) : q === 'medium' ? 1.15 : 0.85;
    this.renderer.shadowMap.enabled = q !== 'low';
    this.bloom.enabled = q !== 'low';
    this.resize(true);
  }

  resize(force = false): void {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    if (!force && w === this.lastW && h === this.lastH) return;
    this.lastW = w;
    this.lastH = h;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    // bloom at half resolution is plenty and much cheaper
    this.bloom.resolution.set(w * dpr * 0.5, h * dpr * 0.5);
    this.post.uRes.value.set(w * dpr, h * dpr);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.resize();
    this.renderer.info.reset();
    this.composer.render();
  }
}
