// Renderer, scene graph roots, post-processing and quality settings.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.035 },
    uAberration: { value: 0.0012 },
    uDamage: { value: 0 },
    uStill: { value: 0 },      // desaturation / blue drain used by Stillness moments
    uFlash: { value: 0 },
    uFade: { value: 0 },       // 0 = visible, 1 = black
    uWarmth: { value: 0.04 },
    uContrast: { value: 1.06 },
    uSaturation: { value: 1.06 },
    uFocus: { value: 0 },      // kinetic focus: slight radial blur & cyan edge
  },
  vertexShader: /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uVignette, uGrain, uAberration, uDamage, uStill, uFlash, uFade, uWarmth, uContrast, uSaturation, uFocus;
    varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv; vec2 c = uv - 0.5; float r = length(c);
      float ab = uAberration * (1.0 + uDamage * 3.0 + uFocus * 2.0) * r;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ab).b;
      if (uFocus > 0.0) {
        vec3 acc = col; for (int i = 1; i < 6; i++) { acc += texture2D(tDiffuse, uv - c * float(i) * 0.006 * uFocus).rgb; }
        col = mix(col, acc / 6.0, smoothstep(0.15, 0.6, r) * uFocus);
      }
      // grade
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation * (1.0 - uStill * 0.85));
      col = (col - 0.5) * uContrast + 0.5;
      col += vec3(uWarmth, uWarmth * 0.35, -uWarmth * 0.5) * (1.0 - uStill);
      col = mix(col, col * vec3(0.82, 0.92, 1.08) + vec3(0.0, 0.01, 0.03), uStill);
      col = mix(col, vec3(0.55, 0.85, 1.0) * (l + 0.2), uFocus * 0.08 * smoothstep(0.3, 0.7, r));
      // damage
      col = mix(col, vec3(0.6, 0.03, 0.02), uDamage * smoothstep(0.25, 0.75, r) * 0.85);
      // vignette
      col *= 1.0 - uVignette * smoothstep(0.35, 0.85, r) * (1.0 + uStill * 0.6);
      // grain
      float g = h(uv * 1000.0 + fract(uTime * 7.13)) - 0.5;
      col += g * uGrain;
      col += uFlash;
      col *= 1.0 - uFade;
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.quality = loadQuality();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', logarithmicDepthBuffer: true, stencil: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.pixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.08, 40000);
    this.scene.add(this.camera);

    // City frame: everything that rides on Meridian. Physics lives here too.
    this.cityRoot = new THREE.Group(); this.cityRoot.name = 'cityRoot';
    // Outside world, transformed by the inverse of the city's motion every frame.
    this.worldRoot = new THREE.Group(); this.worldRoot.name = 'worldRoot';
    this.scene.add(this.cityRoot, this.worldRoot);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 0.86);
    this.bloom.enabled = this.quality.bloom;
    this.composer.addPass(this.bloom);
    this.output = new OutputPass();
    this.composer.addPass(this.output);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.grade);

    this.time = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  applyQuality(q) {
    Object.assign(this.quality, q);
    saveQuality(this.quality);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.quality.pixelRatio));
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.bloom.enabled = this.quality.bloom;
    this.scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(mm => (mm.needsUpdate = true)); } });
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.bloom.resolution.set(w * pr * 0.5, h * pr * 0.5);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(dt) {
    this.time += dt;
    this.grade.uniforms.uTime.value = this.time;
    this.composer.render(dt);
  }
}

function loadQuality() {
  const def = { pixelRatio: 1.5, shadows: true, bloom: true, shadowSize: 2048, crowd: 1 };
  try { return Object.assign(def, JSON.parse(localStorage.getItem('marchlight.quality') || '{}')); } catch { return def; }
}
function saveQuality(q) { try { localStorage.setItem('marchlight.quality', JSON.stringify(q)); } catch { /* ignore */ } }
