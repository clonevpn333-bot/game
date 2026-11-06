// Renderer, post-processing chain and quality presets.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

export const QUALITY = {
  low: { pixelRatio: 0.75, shadows: 1024, bloom: false, maxLights: 4, drawScale: 0.6, fxaa: true },
  medium: { pixelRatio: 1.0, shadows: 2048, bloom: true, maxLights: 6, drawScale: 0.8, fxaa: true },
  high: { pixelRatio: 1.0, shadows: 2048, bloom: true, maxLights: 8, drawScale: 1.0, fxaa: true },
  ultra: { pixelRatio: 1.5, shadows: 4096, bloom: true, maxLights: 10, drawScale: 1.2, fxaa: true },
};

// Display-space grading, vignette, chromatic aberration, radial speed blur and
// the "reality rewrite" distortion used by chapter transformations.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.35 },
    uSaturation: { value: 1.0 },
    uContrast: { value: 1.0 },
    uLift: { value: new THREE.Vector3(0, 0, 0) },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uCA: { value: 0.0015 },
    uSpeedBlur: { value: 0.0 },
    uRewrite: { value: 0.0 },
    uFlash: { value: 0.0 },
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uGrain: { value: 0.02 },
    uDamage: { value: 0.0 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes;
    uniform float uVignette, uSaturation, uContrast, uCA, uSpeedBlur, uRewrite, uFlash, uGrain, uDamage;
    uniform vec3 uLift, uGain, uFlashColor;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    vec3 sampleCA(vec2 uv, float amt){
      vec2 d = (uv - 0.5) * amt;
      return vec3(texture2D(tDiffuse, uv + d).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - d).b);
    }
    void main(){
      vec2 uv = vUv;
      // reality rewrite: horizontal tearing bands that slide out of phase
      if (uRewrite > 0.0) {
        float band = floor(uv.y * mix(8.0, 60.0, hash(vec2(floor(uTime*12.0), 1.0))));
        float r = hash(vec2(band, floor(uTime * 20.0)));
        float shift = (r - 0.5) * 0.08 * uRewrite * step(1.0 - uRewrite * 0.7, r);
        uv.x += shift;
        uv += (vec2(hash(uv + uTime), hash(uv - uTime)) - 0.5) * 0.004 * uRewrite;
      }
      float ca = uCA + uRewrite * 0.02 + uDamage * 0.01;
      vec3 col = sampleCA(uv, ca * length(uv - 0.5) * 2.0 + ca * 0.2);
      if (uSpeedBlur > 0.001) {
        vec3 acc = col; vec2 dir = (uv - 0.5);
        for (int i = 1; i < 8; i++) { acc += texture2D(tDiffuse, uv - dir * uSpeedBlur * float(i) * 0.012).rgb; }
        float m = smoothstep(0.15, 0.6, length(dir));
        col = mix(col, acc / 8.0, m);
      }
      // grading (display space)
      col = col * uGain + uLift * (1.0 - col);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col = (col - 0.5) * uContrast + 0.5;
      // rewrite tint: desaturate and push cyan/magenta separation
      col = mix(col, vec3(l) * vec3(0.8, 1.05, 1.2), uRewrite * 0.4);
      // vignette
      vec2 v = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      col *= mix(1.0, smoothstep(1.15, 0.25, length(v)), uVignette);
      // damage: red pulse at edges
      col = mix(col, vec3(0.5, 0.02, 0.02), uDamage * smoothstep(0.35, 0.95, length(v)) * 0.8);
      col += (hash(vUv * uRes + uTime) - 0.5) * uGrain;
      col = mix(col, uFlashColor, clamp(uFlash, 0.0, 1.0));
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

export class Renderer {
  constructor(canvas, quality = 'high') {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    const r = this.renderer;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.pmrem = new THREE.PMREMGenerator(r);
    this.setQuality(quality);
    this.scene = null; this.camera = null;
    this.composer = new EffectComposer(r, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType }));
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.55, 0.85);
    this.output = new OutputPass();
    this.grade = new ShaderPass(GradeShader);
    this.fxaa = new ShaderPass(FXAAShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);
    this.composer.addPass(this.grade);
    this.composer.addPass(this.fxaa);
    this.gradeDefaults = { vignette: 0.35, saturation: 1, contrast: 1, lift: [0, 0, 0], gain: [1, 1, 1], ca: 0.0015, grain: 0.015 };
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  setQuality(name) {
    this.qualityName = QUALITY[name] ? name : 'high';
    this.quality = QUALITY[this.qualityName];
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2) * this.quality.pixelRatio);
    if (this.bloom) this.bloom.enabled = this.quality.bloom;
    if (this.composer) this.resize();
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.renderer.setSize(w, h, false);
    if (!this.composer) return;
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.fxaa.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    this.grade.uniforms.uRes.value.set(w * pr, h * pr);
    if (this.camera) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  }

  setGrade(g = {}) {
    const u = this.grade.uniforms, d = { ...this.gradeDefaults, ...g };
    u.uVignette.value = d.vignette; u.uSaturation.value = d.saturation; u.uContrast.value = d.contrast;
    u.uLift.value.fromArray(d.lift); u.uGain.value.fromArray(d.gain); u.uCA.value = d.ca; u.uGrain.value = d.grain;
    if (g.bloom) { this.bloom.strength = g.bloom[0]; this.bloom.radius = g.bloom[1]; this.bloom.threshold = g.bloom[2]; }
    if (g.exposure !== undefined) this.renderer.toneMappingExposure = g.exposure;
  }

  set(scene, camera) {
    this.scene = scene; this.camera = camera;
    this.renderPass.scene = scene; this.renderPass.camera = camera;
    this.resize();
  }

  render(dt, time) {
    if (!this.scene) return;
    this.grade.uniforms.uTime.value = time;
    this.composer.render(dt);
  }
}
