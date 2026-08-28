/* A small hand-rolled post chain: bloom plus screen-space light shafts driven by
 * the depth buffer, so the sun actually rakes through the ridgelines and clouds. */
import * as THREE from '../../../../vendor/three/three.module.js';

const QUAD_VERT = `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const BRIGHT = `
varying vec2 vUv;
uniform sampler2D tSrc;
uniform float uThreshold;
uniform float uKnee;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = clamp((l - uThreshold) / max(uKnee, 0.0001), 0.0, 1.0);
  gl_FragColor = vec4(c * k * k, 1.0);
}`;

const BLUR = `
varying vec2 vUv;
uniform sampler2D tSrc;
uniform vec2 uDir;
void main() {
  vec3 sum = texture2D(tSrc, vUv).rgb * 0.2270270270;
  sum += texture2D(tSrc, vUv + uDir * 1.3846153846).rgb * 0.3162162162;
  sum += texture2D(tSrc, vUv - uDir * 1.3846153846).rgb * 0.3162162162;
  sum += texture2D(tSrc, vUv + uDir * 3.2307692308).rgb * 0.0702702703;
  sum += texture2D(tSrc, vUv - uDir * 3.2307692308).rgb * 0.0702702703;
  gl_FragColor = vec4(sum, 1.0);
}`;

const SHAFTS = `
varying vec2 vUv;
uniform sampler2D tSrc;
uniform sampler2D tDepth;
uniform vec2 uSun;
uniform float uStrength;
uniform float uVisible;
void main() {
  vec2 delta = (vUv - uSun) * (1.0 / 24.0) * 0.92;
  vec2 uv = vUv;
  vec3 acc = vec3(0.0);
  float w = 1.0;
  for (int i = 0; i < 24; i++) {
    float d = texture2D(tDepth, uv).x;
    vec3 c = texture2D(tSrc, uv).rgb;
    // only sky contributes; everything else occludes the shaft
    float sky = step(0.99995, d);
    acc += c * sky * w;
    w *= 0.94;
    uv -= delta;
  }
  acc /= 24.0;
  float edge = smoothstep(0.95, 0.12, length(vUv - uSun));
  gl_FragColor = vec4(acc * uStrength * edge * uVisible, 1.0);
}`;

const COMPOSITE = `
varying vec2 vUv;
uniform sampler2D tScene;
uniform sampler2D tBloom;
uniform sampler2D tShafts;
uniform float uBloom;
uniform float uVignette;
uniform float uGrain;
uniform float uTime;
uniform vec3 uSunTint;
uniform float uExposure;
float hash(vec2 p){ return fract(sin(dot(p, vec2(41.0, 289.0))) * 43758.5453); }
vec3 ACES(vec3 x) {
  const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
// render targets stay linear HDR; the final pass tone maps and encodes sRGB
vec3 toSRGB(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
void main() {
  vec3 col = texture2D(tScene, vUv).rgb;
  col += texture2D(tBloom, vUv).rgb * uBloom;
  col += texture2D(tShafts, vUv).rgb * uSunTint;
  float v = 1.0 - uVignette * pow(length(vUv - 0.5) * 1.42, 2.4);
  col *= clamp(v, 0.0, 1.0);
  col = toSRGB(ACES(max(col, vec3(0.0)) * uExposure));
  col += (hash(vUv * 1024.0 + uTime) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

function pass(fragmentShader, uniforms) {
  return new THREE.ShaderMaterial({ uniforms, vertexShader: QUAD_VERT, fragmentShader, depthTest: false, depthWrite: false });
}

export class Post {
  constructor(renderer, width, height) {
    this.renderer = renderer;
    this.enabled = true;
    this.quality = 1;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);

    const depth = new THREE.DepthTexture(1, 1);
    depth.type = THREE.UnsignedIntType;
    this.rtScene = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType, depthTexture: depth, depthBuffer: true,
    });
    const opts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, type: THREE.HalfFloatType, depthBuffer: false };
    this.rtBrightA = new THREE.WebGLRenderTarget(1, 1, opts);
    this.rtBrightB = new THREE.WebGLRenderTarget(1, 1, opts);
    this.rtShafts = new THREE.WebGLRenderTarget(1, 1, opts);

    this.mBright = pass(BRIGHT, { tSrc: { value: null }, uThreshold: { value: 1.05 }, uKnee: { value: 0.7 } });
    this.mBlur = pass(BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.mShafts = pass(SHAFTS, {
      tSrc: { value: null }, tDepth: { value: depth },
      uSun: { value: new THREE.Vector2(0.5, 0.5) }, uStrength: { value: 0.5 }, uVisible: { value: 1 },
    });
    this.mComposite = pass(COMPOSITE, {
      tScene: { value: null }, tBloom: { value: null }, tShafts: { value: null },
      uBloom: { value: 0.42 }, uVignette: { value: 0.34 }, uGrain: { value: 0.014 },
      uExposure: { value: 1.0 },
      uTime: { value: 0 }, uSunTint: { value: new THREE.Color(1, 0.86, 0.66) },
    });
    this.setSize(width, height);
  }

  setSize(w, h) {
    this.width = w; this.height = h;
    const q = this.quality;
    this.rtScene.setSize(Math.max(2, (w * q) | 0), Math.max(2, (h * q) | 0));
    const hw = Math.max(2, (w * q / 2) | 0), hh = Math.max(2, (h * q / 2) | 0);
    this.rtShafts.setSize(hw, hh);
    this.rtBrightA.setSize(Math.max(2, hw / 2 | 0), Math.max(2, hh / 2 | 0));
    this.rtBrightB.setSize(Math.max(2, hw / 2 | 0), Math.max(2, hh / 2 | 0));
  }

  draw(material, target) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target || null);
    this.renderer.render(this.scene, this.camera);
  }

  /** @param sunScreen {x,y} in 0..1, or null when the sun is behind the camera. */
  render(scene, camera, sunScreen, time, sunColor) {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.clear();
    r.render(scene, camera);

    if (!this.enabled) { this.draw(blit(this.rtScene.texture, this), null); return; }

    // light shafts
    this.mShafts.uniforms.tSrc.value = this.rtScene.texture;
    this.mShafts.uniforms.uVisible.value = sunScreen ? 1 : 0;
    if (sunScreen) this.mShafts.uniforms.uSun.value.set(sunScreen.x, sunScreen.y);
    this.draw(this.mShafts, this.rtShafts);

    // bloom
    this.mBright.uniforms.tSrc.value = this.rtScene.texture;
    this.draw(this.mBright, this.rtBrightA);
    for (let i = 0; i < 2; i++) {
      this.mBlur.uniforms.tSrc.value = this.rtBrightA.texture;
      this.mBlur.uniforms.uDir.value.set(1 / this.rtBrightA.width, 0);
      this.draw(this.mBlur, this.rtBrightB);
      this.mBlur.uniforms.tSrc.value = this.rtBrightB.texture;
      this.mBlur.uniforms.uDir.value.set(0, 1 / this.rtBrightA.height);
      this.draw(this.mBlur, this.rtBrightA);
    }

    const u = this.mComposite.uniforms;
    u.tScene.value = this.rtScene.texture;
    u.tBloom.value = this.rtBrightA.texture;
    u.tShafts.value = this.rtShafts.texture;
    u.uTime.value = time;
    if (sunColor) u.uSunTint.value.copy(sunColor);
    this.draw(this.mComposite, null);
  }
}

let blitMat = null;
function blit(tex, post) {
  if (!blitMat) blitMat = pass(`varying vec2 vUv; uniform sampler2D tSrc;
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c)); }
    vec3 ACES(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
    void main(){ gl_FragColor = vec4(toSRGB(ACES(texture2D(tSrc, vUv).rgb)), 1.0); }`, { tSrc: { value: null } });
  blitMat.uniforms.tSrc.value = tex;
  return blitMat;
}
