// Post-processing: screen-space ambient occlusion (depth only) and a filmic
// grade (split toning, saturation/contrast, vignette, grain) driven by time of
// day and weather.
import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const AO_FS = `
uniform sampler2D tDiffuse; uniform sampler2D tDepth;
uniform vec2 uRes; uniform float uNear; uniform float uFar; uniform mat4 uProjInv; uniform float uRadius; uniform float uStrength; uniform float uNight;
varying vec2 vUv;
float viewZ(float d) { return (uNear * uFar) / ((uFar - uNear) * d - uFar); }
vec3 viewPos(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  vec4 clip = vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
  vec4 v = uProjInv * clip;
  return v.xyz / v.w;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
void main() {
  vec4 col = texture2D(tDiffuse, vUv);
  float d = texture2D(tDepth, vUv).x;
  if (d >= 0.99999) { gl_FragColor = col; return; }
  vec3 P = viewPos(vUv);
  vec2 px = 1.0 / uRes;
  vec3 Px = viewPos(vUv + vec2(px.x, 0.0)) - P, Py = viewPos(vUv + vec2(0.0, px.y)) - P;
  vec3 Nc = cross(Px, Py);
  float nl = length(Nc);
  if (nl < 1e-8 || P.z > -0.01) { gl_FragColor = col; return; }
  vec3 N = Nc / nl;
  float dist = -P.z;
  // radius in pixels from world radius
  float rpx = clamp(uRadius * uRes.y / (dist * 1.2), 3.0, 60.0);
  float ang = hash(vUv * uRes) * 6.2831;
  float occ = 0.0;
  const int S = 12;
  for (int i = 0; i < S; i++) {
    float t = (float(i) + 0.5) / float(S);
    float a = ang + t * 15.7;
    vec2 off = vec2(cos(a), sin(a)) * rpx * t * px;
    vec3 Q = viewPos(vUv + off);
    vec3 v = Q - P;
    float vv = dot(v, v);
    float o = max(0.0, dot(N, v) - 0.02 * dist) / (vv + 0.05);
    occ += o * (1.0 - smoothstep(uRadius * 1.5, uRadius * 3.0, sqrt(vv)));
  }
  occ = occ / float(S) * uRadius * 1.6;
  if (!(occ >= 0.0) || occ > 1e6) occ = 0.0;
  occ = clamp(occ, 0.0, 1.0);
  float fade = 1.0 - smoothstep(180.0, 420.0, dist);
  float ao = 1.0 - occ * uStrength * fade * (1.0 - uNight * 0.4);
  gl_FragColor = vec4(col.rgb * ao, col.a);
}`;

const GRADE_FS = `
uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uTime;
uniform float uSat; uniform float uContrast; uniform vec3 uShadowTint; uniform vec3 uHighTint; uniform float uVig; uniform float uGrain; uniform float uLift;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c = (c - 0.5) * uContrast + 0.5 + uLift;
  vec3 tint = mix(uShadowTint, uHighTint, smoothstep(0.05, 0.85, l));
  c *= tint;
  vec2 q = vUv - 0.5;
  q.x *= uRes.x / uRes.y;
  c *= 1.0 - uVig * pow(clamp(length(q) * 1.15, 0.0, 1.0), 2.4);
  c += (hash(vUv * uRes + fract(uTime) * 91.0) - 0.5) * uGrain;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

export class AOPass extends Pass {
  constructor(camera) {
    super();
    this.camera = camera;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: AO_FS,
      uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: 0.5 }, uFar: { value: 5000 }, uProjInv: { value: new THREE.Matrix4() }, uRadius: { value: 1.6 }, uStrength: { value: 0.75 }, uNight: { value: 0 } },
      depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  setSize(w, h) { this.mat.uniforms.uRes.value.set(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    const U = this.mat.uniforms;
    U.tDiffuse.value = readBuffer.texture;
    U.tDepth.value = readBuffer.depthTexture;
    U.uNear.value = this.camera.near; U.uFar.value = this.camera.far;
    U.uProjInv.value.copy(this.camera.projectionMatrixInverse);
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
}

export class GradePass extends Pass {
  constructor() {
    super();
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: GRADE_FS,
      uniforms: {
        tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uTime: { value: 0 },
        uSat: { value: 1.08 }, uContrast: { value: 1.06 }, uShadowTint: { value: new THREE.Color(0.96, 0.99, 1.06) }, uHighTint: { value: new THREE.Color(1.04, 1.0, 0.95) },
        uVig: { value: 0.32 }, uGrain: { value: 0.022 }, uLift: { value: 0 },
      },
      depthTest: false, depthWrite: false,
    });
    this.quad = new FullScreenQuad(this.mat);
  }
  setSize(w, h) { this.mat.uniforms.uRes.value.set(w, h); }
  render(renderer, writeBuffer, readBuffer) {
    this.mat.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.quad.render(renderer);
  }
  // look of the moment: day, golden hour, night, overcast/rain
  setMood(env, weather) {
    const U = this.mat.uniforms;
    const day = env.dayF ?? 1, gold = env.golden ?? 0, night = env.night ?? 0;
    const wet = Math.min(1, (weather.cloud || 0) * 0.6 + (weather.precip || 0));
    U.uSat.value = (1.08 + gold * 0.12) * (1 - wet * 0.18) * (1 - night * 0.08);
    U.uContrast.value = 1.06 + gold * 0.04 + night * 0.06 - wet * 0.04;
    const sh = new THREE.Color(0.96, 0.99, 1.07).lerp(new THREE.Color(0.9, 0.95, 1.14), night).lerp(new THREE.Color(0.93, 0.96, 1.05), wet * 0.6);
    const hi = new THREE.Color(1.04, 1.0, 0.95).lerp(new THREE.Color(1.1, 0.98, 0.86), gold).lerp(new THREE.Color(1.08, 0.98, 0.88), night * 0.7).lerp(new THREE.Color(1.0, 1.0, 1.02), wet * 0.6);
    U.uShadowTint.value.copy(sh); U.uHighTint.value.copy(hi);
    U.uVig.value = 0.28 + night * 0.16;
    U.uLift.value = -0.01 * day + 0.006 * night;
  }
}

// Height-aware fog: haze collects near the ground so tall buildings punch through.
// Patches three's fog chunks once, before any material compiles.
let patched = false;
export function patchHeightFog() {
  if (patched) return;
  patched = true;
  const SC = THREE.ShaderChunk;
  SC.fog_pars_vertex = '#ifdef USE_FOG\n\tvarying float vFogDepth;\n\tvarying float vFogWY;\n#endif';
  SC.fog_vertex = `#ifdef USE_FOG
\tvFogDepth = - mvPosition.z;
\t#ifdef USE_INSTANCING
\tvFogWY = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;
\t#else
\tvFogWY = (modelMatrix * vec4(transformed, 1.0)).y;
\t#endif
#endif`;
  SC.fog_pars_fragment = `#ifdef USE_FOG
\tuniform vec3 fogColor;
\tvarying float vFogDepth;
\tvarying float vFogWY;
\t#ifdef FOG_EXP2
\t\tuniform float fogDensity;
\t#else
\t\tuniform float fogNear;
\t\tuniform float fogFar;
\t#endif
#endif`;
  SC.fog_fragment = `#ifdef USE_FOG
\t#ifdef FOG_EXP2
\t\tfloat hf = 0.35 + 0.65 * exp(-max(0.0, vFogWY) * 0.018);
\t\tfloat fogFactor = 1.0 - exp(- fogDensity * fogDensity * vFogDepth * vFogDepth * hf);
\t#else
\t\tfloat fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
\t#endif
\tgl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
#endif`;
}
