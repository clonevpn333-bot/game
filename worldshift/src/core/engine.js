import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { G } from './state.js';

// Final full-screen pass: exposure, ACES tonemap, era colour grade, vignette,
// grain, chromatic aberration and the timeline-shift distortion.
const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uExposure: { value: 1.0 },
    uLift: { value: new THREE.Vector3(0, 0, 0) },
    uGamma: { value: new THREE.Vector3(1, 1, 1) },
    uGain: { value: new THREE.Vector3(1, 1, 1) },
    uSat: { value: 1.0 },
    uContrast: { value: 1.0 },
    uTint: { value: new THREE.Vector3(1, 1, 1) },
    uShadowTint: { value: new THREE.Vector3(1, 1, 1) },
    uVignette: { value: 0.35 },
    uGrain: { value: 0.04 },
    uCA: { value: 0.0015 },
    uDistort: { value: 0.0 },
    uFlash: { value: 0.0 },
    uFlashColor: { value: new THREE.Vector3(0.6, 0.9, 1.0) },
    uDamage: { value: 0.0 },
    uLowHealth: { value: 0.0 },
    uScan: { value: 0.0 },
    uPeek: { value: 0.0 },
    uPeekColor: { value: new THREE.Vector3(0.5, 0.8, 1.0) },
    uLetterbox: { value: 0.0 },
    uFade: { value: 0.0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uTime, uExposure, uSat, uContrast, uVignette, uGrain, uCA, uDistort, uFlash, uDamage, uLowHealth, uScan, uPeek, uLetterbox, uFade;
    uniform vec3 uLift, uGamma, uGain, uTint, uShadowTint, uFlashColor, uPeekColor;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

    vec3 aces(vec3 x) {
      const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }
    vec3 toSRGB(vec3 c) {
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }

    void main() {
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r = length(c * vec2(uRes.x / uRes.y, 1.0));

      // Shift distortion: radial shockwave + slight swirl
      if (uDistort > 0.001) {
        float wave = sin(r * 34.0 - uTime * 26.0) * 0.012 * uDistort;
        float pull = -0.06 * uDistort * (1.0 - r);
        float ang = uDistort * 0.08 * (1.0 - smoothstep(0.0, 0.8, r));
        float s = sin(ang), co = cos(ang);
        c = mat2(co, -s, s, co) * c;
        uv = 0.5 + c * (1.0 + pull) + normalize(c + 1e-5) * wave;
        // horizontal tearing bands
        float band = step(0.93, hash(vec2(floor(uv.y * 40.0), floor(uTime * 30.0))));
        uv.x += band * (hash(vec2(uTime, uv.y)) - 0.5) * 0.06 * uDistort;
      }

      float ca = uCA + uDistort * 0.02 + uDamage * 0.006 + uPeek * 0.004;
      vec2 dir = (uv - 0.5);
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;

      col *= uExposure;
      col = aces(col);
      col = toSRGB(col);

      // Grade: lift / gamma / gain
      col = col * uGain + uLift * (1.0 - col);
      col = pow(max(col, 0.0), 1.0 / uGamma);
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      // split toning: shadows vs highlights
      col *= mix(uShadowTint, uTint, smoothstep(0.05, 0.75, luma));
      luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(luma), col, uSat * (1.0 - uLowHealth * 0.7));
      col = (col - 0.5) * uContrast + 0.5;

      // Peek tint at the screen edge
      float edge = smoothstep(0.35, 0.85, r);
      col = mix(col, col * 0.6 + uPeekColor * 0.25, uPeek * edge);

      // Damage + low health vignette
      col = mix(col, vec3(0.55, 0.02, 0.02), clamp(uDamage * edge * 1.2 + uLowHealth * edge * (0.35 + 0.15 * sin(uTime * 6.0)), 0.0, 0.85));

      // Vignette
      col *= 1.0 - uVignette * smoothstep(0.25, 1.05, r);

      // Shift flash + scanlines
      col += uFlashColor * uFlash;
      if (uScan > 0.001) {
        float sl = 0.5 + 0.5 * sin(vUv.y * uRes.y * 1.4 + uTime * 40.0);
        col *= 1.0 - uScan * 0.25 * sl;
        col += uFlashColor * uScan * 0.08 * step(0.985, hash(vec2(floor(vUv.y * 120.0), floor(uTime * 24.0))));
      }

      // Film grain
      float g = hash(vUv * uRes + fract(uTime * 7.31) * 100.0) - 0.5;
      col += g * uGrain;

      // Letterbox for cinematic moments
      float lb = uLetterbox * 0.11;
      if (vUv.y < lb || vUv.y > 1.0 - lb) col = vec3(0.0);

      col = mix(col, vec3(0.0), uFade);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace; // final pass does sRGB
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.info.autoReset = false;
    this.renderer = renderer;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(G.settings.fov, 1, 0.12, 4200);
    this.camera.position.set(0, 2, 5);

    this.pixelRatio = 1;
    this.applyQuality(G.settings.quality, false);

    const size = this._size();
    this.rt = new THREE.WebGLRenderTarget(size.w, size.h, {
      type: THREE.HalfFloatType,
      samples: this.msaa,
    });
    this.composer = new EffectComposer(renderer, this.rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.w, size.h), 0.55, 0.55, 0.82);
    this.composer.addPass(this.bloom);
    this.finalPass = new ShaderPass(FinalShader);
    this.composer.addPass(this.finalPass);
    this.final = this.finalPass.uniforms;

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  applyQuality(q, rebuild = true) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (q === 'low') {
      this.pixelRatio = Math.min(dpr, 1) * 0.75;
      this.msaa = 0;
      this.shadowSize = 1024;
    } else if (q === 'medium') {
      this.pixelRatio = Math.min(dpr, 1);
      this.msaa = 2;
      this.shadowSize = 2048;
    } else {
      this.pixelRatio = Math.min(dpr, 1.5);
      this.msaa = 4;
      this.shadowSize = 2048;
    }
    if (rebuild && this.rt) {
      this.rt.samples = this.msaa;
      this.resize();
    }
  }

  _size() {
    const w = Math.max(1, Math.floor(window.innerWidth * this.pixelRatio));
    const h = Math.max(1, Math.floor(window.innerHeight * this.pixelRatio));
    return { w, h };
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
    const s = this._size();
    this.final.uRes.value.set(s.w, s.h);
  }

  render(dt) {
    this.final.uTime.value = G.time;
    this.renderer.info.reset();
    this.composer.render(dt);
  }
}
