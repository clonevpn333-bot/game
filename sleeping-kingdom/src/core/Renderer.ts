import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Cinematic grade, applied before OutputPass (linear HDR). It handles vignette, film grain,
 * hurt pulse (red edges), white flash, chromatic split on impacts, and a split-tone
 * (cool shadows, warm highlights) that keeps the night from going grey.
 */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTime: { value: 0 },
    uVignette: { value: 0.9 },
    uGrain: { value: 0.045 },
    uHurt: { value: 0 },
    uFlash: { value: 0 },
    uChroma: { value: 0 },
    uFade: { value: 0 },
    uShadowTint: { value: new THREE.Color(0.75, 0.85, 1.25) },
    uHighTint: { value: new THREE.Color(1.12, 1.0, 0.86) },
    uSaturation: { value: 1.08 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uHurt, uFlash, uChroma, uFade, uSaturation;
    uniform vec3 uShadowTint, uHighTint; varying vec2 vUv;
    float rand(vec2 co){ return fract(sin(dot(co, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 dir = vUv - 0.5;
      float d = length(dir);
      vec3 c;
      if (uChroma > 0.0005) {
        vec2 off = dir * uChroma;
        c = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      } else {
        c = texture2D(tDiffuse, vUv).rgb;
      }
      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(lum), c, uSaturation);
      float hl = smoothstep(0.05, 0.9, lum);
      c *= mix(uShadowTint, uHighTint, hl);
      float vig = smoothstep(0.85, 0.25, d);
      c *= mix(1.0, vig, uVignette);
      float hurtMask = smoothstep(0.25, 0.75, d) * uHurt;
      c = mix(c, vec3(0.55, 0.02, 0.02) * (0.6 + lum), hurtMask);
      c += vec3(1.0, 0.95, 0.85) * uFlash;
      float g = rand(vUv * vec2(1920.0, 1080.0) + fract(uTime * 7.13)) - 0.5;
      c += g * uGrain * (0.35 + lum);
      c *= 1.0 - uFade;
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

export type RenderPipeline = {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  bloom: UnrealBloomPass;
  grade: ShaderPass;
  resize: (camera: THREE.PerspectiveCamera, maxDpr: number) => void;
  render: () => void;
};

export function createPipeline(
  canvas: HTMLCanvasElement,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): RenderPipeline {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = false;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.45, 0.82);
  composer.addPass(bloom);
  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);
  composer.addPass(new OutputPass());

  let lastW = 0;
  let lastH = 0;
  let lastDpr = 0;
  const resize = (cam: THREE.PerspectiveCamera, maxDpr: number) => {
    const w = Math.max(1, Math.floor(canvas.clientWidth));
    const h = Math.max(1, Math.floor(canvas.clientHeight));
    const mobile = Math.min(w, h) < 600;
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? Math.min(maxDpr, 1.5) : maxDpr);
    if (w === lastW && h === lastH && dpr === lastDpr) return;
    lastW = w;
    lastH = h;
    lastDpr = dpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(dpr);
    composer.setSize(w, h);
    bloom.resolution.set(w * dpr * 0.5, h * dpr * 0.5);
    cam.aspect = w / h;
    // Portrait phones need a wider vertical FOV so the knight and the threat both fit.
    cam.userData.aspectFovBoost = w / h < 1 ? 14 : 0;
    cam.updateProjectionMatrix();
  };

  return { renderer, composer, bloom, grade, resize, render: () => {
    renderer.info.reset();
    composer.render();
  } };
}
