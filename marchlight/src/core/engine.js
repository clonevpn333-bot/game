// Renderer, scene graph roots, post-processing and quality settings.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// Atmosphere: exponential height fog integrated along each view ray (thick near the ground far
// below, thin up on the city), tinted toward the sun, plus screen-space light shafts that stream
// from the sun past anything that occludes the sky. Reads the scene's float depth (reverse-Z).
class AtmospherePass extends Pass {
  constructor(camera) {
    super();
    this.camera = camera; this.needsSwap = true;
    this.uniforms = {
      tDiffuse: { value: null }, tDepth: { value: null }, uInvProj: { value: new THREE.Matrix4() }, uCamWorld: { value: new THREE.Matrix4() },
      uCamPos: { value: new THREE.Vector3() }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.85, 0.65) },
      uFogCol: { value: new THREE.Color(0.72, 0.78, 0.84) }, uDensity: { value: 0.00055 }, uFalloff: { value: 0.0042 }, uBaseY: { value: -400 },
      uInterior: { value: 0 }, uGod: { value: 0.45 }, uSunUv: { value: new THREE.Vector2() }, uSunOn: { value: 0 },
    };
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({ uniforms: this.uniforms, depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: `
        uniform sampler2D tDiffuse, tDepth; uniform mat4 uInvProj, uCamWorld; uniform vec3 uCamPos, uSunDir, uSunCol, uFogCol;
        uniform float uDensity, uFalloff, uBaseY, uInterior, uGod, uSunOn; uniform vec2 uSunUv; varying vec2 vUv;
        vec3 worldAt(vec2 uv, float d){ vec4 v = uInvProj * vec4(uv * 2.0 - 1.0, d, 1.0); v /= v.w; return (uCamWorld * v).xyz; }
        void main(){
          vec4 col = texture2D(tDiffuse, vUv);
          float d = texture2D(tDepth, vUv).r;                 // reverse-Z: 1 near, 0 far / sky
          bool sky = d <= 0.0;
          vec3 dir = normalize(worldAt(vUv, sky ? 0.5 : d) - uCamPos);
          float dist = sky ? 30000.0 : length(worldAt(vUv, d) - uCamPos);
          // ∫ a·exp(-b·(y - base)) along the ray
          float h0 = max(uCamPos.y - uBaseY, 0.0), k = dir.y * uFalloff;
          float od = abs(k) > 1e-5 ? (uDensity / uFalloff) * exp(-h0 * uFalloff) * (1.0 - exp(-dist * k)) / dir.y : uDensity * exp(-h0 * uFalloff) * dist;
          float fog = (1.0 - exp(-max(od, 0.0))) * (sky ? 0.4 : 1.0) * (1.0 - uInterior * 0.75);
          float sunAmt = pow(max(dot(dir, uSunDir), 0.0), 6.0);
          vec3 fogC = mix(uFogCol, uSunCol * 1.1, sunAmt * 0.4);
          vec3 c = mix(col.rgb, fogC, fog);
          // light shafts
          if (uSunOn > 0.001) {
            vec2 delta = (uSunUv - vUv) / 28.0; vec2 uv = vUv; float illum = 0.0, decay = 1.0;
            for (int i = 0; i < 28; i++) { uv += delta; if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break; illum += (texture2D(tDepth, uv).r <= 0.0 ? 1.0 : 0.0) * decay; decay *= 0.955; }
            float near = exp(-length((vUv - uSunUv) * vec2(1.6, 1.0)) * 3.2); // shafts radiate from the sun, not a veil over the frame
            c += uSunCol * (illum / 28.0) * near * uGod * uSunOn * (1.0 - uInterior * 0.5);
          }
          gl_FragColor = vec4(c, col.a);
        }` }));
  }
  render(renderer, writeBuffer, readBuffer) {
    const u = this.uniforms, cam = this.camera;
    u.tDiffuse.value = readBuffer.texture; u.tDepth.value = readBuffer.depthTexture;
    u.uInvProj.value.copy(cam.projectionMatrixInverse); u.uCamWorld.value.copy(cam.matrixWorld); u.uCamPos.value.setFromMatrixPosition(cam.matrixWorld);
    // the sun on screen, and how much the camera faces it
    const sp = _sunP.copy(u.uCamPos.value).addScaledVector(u.uSunDir.value, 5000).project(cam);
    const facing = cam.getWorldDirection(_sunD).dot(u.uSunDir.value);
    u.uSunUv.value.set(sp.x * 0.5 + 0.5, sp.y * 0.5 + 0.5);
    u.uSunOn.value = facing > 0 ? Math.pow(facing, 1.5) * Math.max(0, 1 - Math.max(Math.abs(sp.x), Math.abs(sp.y)) / 2.2) : 0;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}
const _sunP = new THREE.Vector3(), _sunD = new THREE.Vector3();

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.025 },
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
      // split toning: cool, slightly teal shadows and warm highlights; a gentle filmic S-curve
      float lt = clamp(l, 0.0, 1.0);
      col += (vec3(-0.014, 0.004, 0.02) * (1.0 - lt) + vec3(0.022, 0.009, -0.016) * lt) * (1.0 - uStill);
      vec3 cc = clamp(col, 0.0, 1.0); col = mix(col, cc * cc * (3.0 - 2.0 * cc), 0.22);
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
    // Depth precision for a scene that spans 8 cm to 40 km: reversed-Z into a float depth buffer
    // where the browser has EXT_clip_control (keeps early-Z rejection, which a logarithmic depth
    // buffer turns off by writing gl_FragDepth in every fragment); logarithmic depth otherwise.
    const reversed = !/[?&]depth=log/.test(location.search) && hasClipControl();
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', reversedDepthBuffer: reversed, logarithmicDepthBuffer: !reversed, stencil: false });
    this.reversedDepth = reversed;
    this.dynScale = 1; // dynamic resolution (see adapt)
    this.renderer.setPixelRatio(this.targetPixelRatio());
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.08, 40000);
    this.scene.add(this.camera);

    // City frame: everything that rides on Meridian. Physics lives here too.
    this.cityRoot = new THREE.Group(); this.cityRoot.name = 'cityRoot';
    // Outside world, transformed by the inverse of the city's motion every frame.
    this.worldRoot = new THREE.Group(); this.worldRoot.name = 'worldRoot';
    this.scene.add(this.cityRoot, this.worldRoot);

    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType });
    if (reversed) rt.depthTexture = new THREE.DepthTexture(1, 1, THREE.FloatType); // 32-bit float depth
    this.composer = new EffectComposer(this.renderer, rt);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    if (reversed) { this.atmosphere = new AtmospherePass(this.camera); this.composer.addPass(this.atmosphere); } // needs the depth texture
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.6, 0.95);
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
    this.renderer.setPixelRatio(this.targetPixelRatio());
    this.renderer.shadowMap.enabled = this.quality.shadows;
    this.bloom.enabled = this.quality.bloom;
    this.scene.traverse(o => { if (o.material) { const m = Array.isArray(o.material) ? o.material : [o.material]; m.forEach(mm => (mm.needsUpdate = true)); } });
    this.resize();
  }

  targetPixelRatio() { return Math.min(window.devicePixelRatio, this.quality.pixelRatio) * (this.quality.autoRes ? this.dynScale : 1); }

  // Dynamic resolution: watch real frame times and trade pixels for frame rate (and back).
  adapt(rawDt) {
    if (!this.quality.autoRes || rawDt <= 0 || rawDt > 0.5) return; // ignore hitches (tab switches, loads)
    this.ft = this.ft ? this.ft + (rawDt - this.ft) * 0.05 : rawDt;
    this.adaptT = (this.adaptT || 0) + rawDt;
    const target = 1 / (this.quality.targetFps || 55);
    let s = this.dynScale;
    if (this.ft > target * 1.12 && this.adaptT > 0.75) s = Math.max(0.5, s - 0.08);
    else if (this.ft < target * 0.8 && this.adaptT > 3) s = Math.min(1, s + 0.05);
    else return;
    this.adaptT = 0;
    if (s !== this.dynScale) { this.dynScale = s; this.renderer.setPixelRatio(this.targetPixelRatio()); this.resize(); }
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
    this.renderer.info.reset();
    this.composer.render(dt);
  }
}

function hasClipControl() {
  try { const gl = document.createElement('canvas').getContext('webgl2'); const ok = !!gl?.getExtension('EXT_clip_control'); gl?.getExtension('WEBGL_lose_context')?.loseContext(); return ok; } catch { return false; }
}

function loadQuality() {
  const def = { pixelRatio: 1.25, shadows: true, bloom: true, shadowSize: 2048, crowd: 1, autoRes: true, targetFps: 55 };
  try { return Object.assign(def, JSON.parse(localStorage.getItem('marchlight.quality') || '{}')); } catch { return def; }
}
function saveQuality(q) { try { localStorage.setItem('marchlight.quality', JSON.stringify(q)); } catch { /* ignore */ } }
