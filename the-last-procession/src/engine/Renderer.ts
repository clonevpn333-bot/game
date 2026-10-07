import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TOON } from '../gfx/Toon';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 0.5 },
    uGrain: { value: 0.014 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 0.96, 0.88) },
    uDesat: { value: 0 },
    uLift: { value: new THREE.Color(0.018, 0.012, 0.03) },
    uWarm: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uFlash, uDesat, uWarm;
    uniform vec3 uFlashColor, uLift;
    varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 dir = vUv - 0.5;
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(c.rgb, vec3(l) * vec3(1.02, 1.0, 0.96), uDesat);
      // filmic split-tone: cool shadows, warm highlights
      c.rgb += uLift * (1.0 - smoothstep(0.0, 0.45, l));
      c.rgb *= mix(vec3(1.0), vec3(1.04, 1.0, 0.95), smoothstep(0.4, 1.0, l) * (0.5 + uWarm));
      // gentle S-curve for animated-film contrast
      c.rgb = mix(c.rgb, c.rgb * c.rgb * (3.0 - 2.0 * c.rgb), 0.18);
      float d = length(dir * vec2(1.1, 1.0));
      c.rgb *= mix(1.0, smoothstep(0.95, 0.3, d), uVignette);
      c.rgb += (rand(vUv * 913.0 + fract(uTime * 7.31)) - 0.5) * uGrain;
      c.rgb = mix(c.rgb, uFlashColor, uFlash);
      gl_FragColor = vec4(c.rgb, 1.0);
    }
  `,
};

/**
 * Render pipeline: scene → depth-of-field (cutscenes only) → bloom on authored
 * emissives → ACES output → film grade (split tone, vignette, grain, flashes).
 */
export class Renderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  readonly dof: BokehPass;
  readonly grade: ShaderPass;
  private readonly renderPass: RenderPass;
  maxDpr: number;
  private lastW = 0;
  private lastH = 0;
  private lastDpr = 0;

  constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
    this.maxDpr = mobile ? 1.5 : 2;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.dof = new BokehPass(scene, camera, { focus: 6, aperture: 0.0025, maxblur: 0.008 });
    this.dof.enabled = false;
    this.composer.addPass(this.dof);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.35, 1.8);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  /** Depth of field for cinematic shots: focus distance in metres; 0 disables. */
  setFocus(dist: number, aperture = 0.0022): void {
    this.dof.enabled = dist > 0;
    if (dist > 0) {
      (this.dof.uniforms as Record<string, { value: number }>).focus.value = dist;
      (this.dof.uniforms as Record<string, { value: number }>).aperture.value = aperture;
    }
  }

  resize(camera: THREE.PerspectiveCamera): void {
    const canvas = this.renderer.domElement;
    const w = Math.max(1, Math.floor(canvas.clientWidth));
    const h = Math.max(1, Math.floor(canvas.clientHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    if (w === this.lastW && h === this.lastH && dpr === this.lastDpr) return;
    this.lastW = w;
    this.lastH = h;
    this.lastDpr = dpr;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    this.bloom.resolution.set(w * 0.5, h * 0.5);
    TOON.res.value.set(w * dpr, h * dpr);
    TOON.outlinePx.value = 1.5 * dpr;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  render(time: number): void {
    this.grade.uniforms.uTime.value = time;
    this.renderer.info.reset();
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
    this.renderer.dispose();
  }
}
