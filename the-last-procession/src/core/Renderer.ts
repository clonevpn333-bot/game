import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 0.55 },
    uGrain: { value: 0.045 },
    uFlash: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 0.95, 0.85) },
    uDesat: { value: 0 },
    uLift: { value: new THREE.Color(0.02, 0.012, 0.03) },
    uAberration: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uFlash, uDesat, uAberration;
    uniform vec3 uFlashColor, uLift;
    varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 dir = vUv - 0.5;
      vec4 c = texture2D(tDiffuse, vUv);
      if (uAberration > 0.0) {
        c.r = texture2D(tDiffuse, vUv + dir * uAberration).r;
        c.b = texture2D(tDiffuse, vUv - dir * uAberration).b;
      }
      float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
      c.rgb = mix(c.rgb, vec3(l) * vec3(1.02, 1.0, 0.96), uDesat);
      // shadow lift toward a cool purple, a classic animated-film grade
      c.rgb += uLift * (1.0 - smoothstep(0.0, 0.5, l));
      float d = length(dir * vec2(1.15, 1.0));
      c.rgb *= mix(1.0, smoothstep(0.92, 0.28, d), uVignette);
      c.rgb += (rand(vUv * 913.0 + fract(uTime * 7.31)) - 0.5) * uGrain;
      c.rgb = mix(c.rgb, uFlashColor, uFlash);
      gl_FragColor = vec4(c.rgb, 1.0);
    }
  `,
};

export class RenderPipeline {
  readonly renderer: THREE.WebGLRenderer;
  readonly composer: EffectComposer;
  readonly bloom: UnrealBloomPass;
  readonly grade: ShaderPass;
  private readonly renderPass: RenderPass;
  maxDpr: number;
  private lastW = 0;
  private lastH = 0;

  constructor(canvas: HTMLCanvasElement, scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
    this.maxDpr = mobile ? 1.5 : 2;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // count every pass (scene + post) in the per-frame diagnostics
    this.renderer.info.autoReset = false;

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.4, 1.7);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);
  }

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.renderPass.camera = camera;
  }

  resize(camera: THREE.PerspectiveCamera): void {
    const canvas = this.renderer.domElement;
    const w = Math.max(1, Math.floor(canvas.clientWidth));
    const h = Math.max(1, Math.floor(canvas.clientHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    if (w === this.lastW && h === this.lastH && this.renderer.getPixelRatio() === dpr) return;
    this.lastW = w;
    this.lastH = h;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(w, h);
    // bloom at reduced resolution: cheap and softer, which suits the painterly look
    this.bloom.resolution.set(w * 0.5, h * 0.5);
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
