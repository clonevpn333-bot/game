// Renderer, post-processing (bloom + broadcast grade), quality presets.
import * as THREE from 'three';
import { EffectComposer } from '../../vendor/three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../../vendor/three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../../vendor/three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../../vendor/three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from '../../vendor/three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from '../../vendor/three/addons/environments/RoomEnvironment.js';

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.35 },
    uAberration: { value: 0.0 },
    uDamage: { value: 0.0 },
    uUnderwater: { value: 0.0 },
    uGlitch: { value: 0.0 },
    uFlash: { value: 0.0 },
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uSat: { value: 1.0 },
    uGrain: { value: 0.045 },
    uScan: { value: 0.0 },
    uLetterbox: { value: 0.0 },
    uHeal: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uAberration, uDamage, uUnderwater, uGlitch, uFlash, uSat, uGrain, uScan, uLetterbox, uHeal;
    uniform vec3 uFlashColor;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      // underwater wobble
      if (uUnderwater > 0.0) {
        uv.x += sin(uv.y * 18.0 + uTime * 2.2) * 0.0035 * uUnderwater;
        uv.y += cos(uv.x * 14.0 + uTime * 1.7) * 0.0030 * uUnderwater;
      }
      // glitch: blocky horizontal tears
      if (uGlitch > 0.0) {
        float band = floor(uv.y * 24.0 + floor(uTime * 18.0));
        float r = hash(vec2(band, floor(uTime * 23.0)));
        if (r < uGlitch * 0.5) uv.x += (hash(vec2(band, 7.0)) - 0.5) * 0.12 * uGlitch;
      }
      vec2 c = uv - 0.5;
      float dist = length(c);
      float ab = uAberration * 0.012 + uGlitch * 0.01 + uDamage * 0.004;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + c * ab).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - c * ab).b;
      // saturation
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSat);
      // underwater grade
      col = mix(col, col * vec3(0.35, 0.75, 1.0) + vec3(0.0, 0.05, 0.09), uUnderwater * 0.8);
      // vignette
      float v = smoothstep(0.85, 0.2, dist);
      col *= mix(1.0, v, uVignette);
      // damage: red pulsing edges
      float edge = smoothstep(0.25, 0.75, dist);
      col = mix(col, vec3(0.85, 0.02, 0.05), edge * uDamage * 0.75);
      col = mix(col, vec3(0.2, 1.0, 0.5), edge * uHeal * 0.35);
      // broadcast scanlines
      col *= 1.0 - uScan * 0.12 * (0.5 + 0.5 * sin(vUv.y * uRes.y * 1.5));
      // grain
      float g = hash(vUv * uRes + fract(uTime) * 100.0) - 0.5;
      col += g * uGrain;
      // flash
      col = mix(col, uFlashColor, clamp(uFlash, 0.0, 1.0));
      // letterbox
      float lb = uLetterbox * 0.11;
      if (vUv.y < lb || vUv.y > 1.0 - lb) col = vec3(0.0);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export const QUALITY = {
  low: { pixelRatio: 0.75, shadows: false, shadowSize: 512, bloom: false, particles: 0.5, antialias: false },
  medium: { pixelRatio: 1.0, shadows: true, shadowSize: 1024, bloom: true, particles: 0.75, antialias: false },
  high: { pixelRatio: 1.5, shadows: true, shadowSize: 2048, bloom: true, particles: 1, antialias: true },
  ultra: { pixelRatio: 2.0, shadows: true, shadowSize: 4096, bloom: true, particles: 1, antialias: true },
};

export class Renderer {
  constructor(container, quality = 'high') {
    this.container = container;
    this.qualityName = quality;
    this.q = QUALITY[quality] || QUALITY.high;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.pixelRatio));
    r.setSize(window.innerWidth, window.innerHeight);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = this.q.shadows;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(r.domElement);
    r.domElement.id = 'gl';

    const pmrem = new THREE.PMREMGenerator(r);
    this.envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.fx = FinalShader.uniforms;
    this.composer = null;
    this.size = new THREE.Vector2();
    this.flashDecay = 4;
    this._buildComposer();
    window.addEventListener('resize', () => this.resize());
  }
  _buildComposer() {
    const r = this.renderer;
    const w = window.innerWidth, h = window.innerHeight;
    const pr = r.getPixelRatio();
    const target = new THREE.WebGLRenderTarget(w * pr, h * pr, {
      type: THREE.HalfFloatType,
      samples: this.q.antialias ? 4 : 0,
    });
    this.composer = new EffectComposer(r, target);
    this.renderPass = new RenderPass(null, null);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.42, 0.5, 0.92);
    this.bloom.enabled = this.q.bloom;
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.finalPass = new ShaderPass({ ...FinalShader, uniforms: this.fx });
    this.composer.addPass(this.finalPass);
    this.resize();
  }
  setQuality(name) {
    if (!QUALITY[name]) return;
    this.qualityName = name;
    this.q = QUALITY[name];
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.q.pixelRatio));
    this.renderer.shadowMap.enabled = this.q.shadows;
    this.composer.dispose?.();
    this._buildComposer();
    this.needsMaterialUpdate = true;
  }
  setBloom(strength, radius, threshold) {
    this.bloom.strength = strength;
    if (radius !== undefined) this.bloom.radius = radius;
    if (threshold !== undefined) this.bloom.threshold = threshold;
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.fx.uRes.value.set(w, h);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }
  render(scene, camera, dt, time) {
    this.camera = camera;
    if (Math.abs(camera.aspect - window.innerWidth / window.innerHeight) > 0.001) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    }
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.fx.uTime.value = time;
    this.fx.uFlash.value = Math.max(0, this.fx.uFlash.value - dt * this.flashDecay);
    this.fx.uAberration.value = Math.max(0, this.fx.uAberration.value - dt * 2.5);
    this.composer.render(dt);
  }
  flash(amount = 0.6, color = 0xffffff, decay = 4) {
    this.fx.uFlash.value = Math.max(this.fx.uFlash.value, amount);
    this.fx.uFlashColor.value.set(color);
    this.flashDecay = decay;
  }
  kick(amount = 0.5) { this.fx.uAberration.value = Math.min(2, this.fx.uAberration.value + amount); }
}
