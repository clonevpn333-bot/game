// ============================================================================
//  Built-in stylized shader pack:
//   - chunk materials (baked light + tint + AO + fog + waving water/foliage)
//   - dynamic sky dome, sun, moon, stars
//   - post FX: volumetric god rays, bloom, color grading, ACES tonemap
// ============================================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---- shared uniforms (referenced by chunk materials + sky) -------------------
export function createUniforms() {
  return {
    uTime: { value: 0 },
    uDayLight: { value: 1 },
    uSunDir: { value: new THREE.Vector3(0.3, 0.9, 0.2) },
    uFogColor: { value: new THREE.Color(0x88bbff) },
    uFogNear: { value: 40 },
    uFogFar: { value: 170 },
    uAmbient: { value: 0.07 },
    uCamPos: { value: new THREE.Vector3() },
    uUnderwater: { value: 0 },
  };
}

// ---- atlas texture ----------------------------------------------------------
export function createAtlasTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 1;
  return t;
}

// ---- chunk materials --------------------------------------------------------
const VERT = /* glsl */`
attribute vec2 alight;
attribute float ao;
attribute float wave;
varying vec2 vUv; varying vec3 vColor; varying vec2 vLight; varying float vAo;
varying float vFog; varying vec3 vNormalW;
uniform float uTime; uniform float uFogNear; uniform float uFogFar;
void main(){
  vUv = uv; vColor = color; vLight = alight; vAo = ao; vNormalW = normal;
  vec4 wpos = modelMatrix * vec4(position, 1.0);
#ifdef WATER
  if (normal.y > 0.5) {
    wpos.y += sin(uTime*1.6 + wpos.x*0.7 + wpos.z*0.7)*0.05
            + cos(uTime*1.1 + wpos.x*0.3 - wpos.z*0.5)*0.04 - 0.11;
  }
#endif
#ifdef FOLIAGE
  if (wave > 0.5) {
    float s = sin(uTime*2.2 + wpos.x*0.8 + wpos.z*0.8);
    wpos.x += s*0.09*wave;
    wpos.z += cos(uTime*1.9 + wpos.x*0.6)*0.06*wave;
  }
#endif
  vec4 mv = viewMatrix * wpos;
  float d = length(mv.xyz);
  vFog = clamp((d - uFogNear)/(uFogFar - uFogNear), 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */`
uniform sampler2D map;
uniform float uDayLight; uniform vec3 uFogColor; uniform float uAmbient;
uniform vec3 uSunDir; uniform float uUnderwater;
varying vec2 vUv; varying vec3 vColor; varying vec2 vLight; varying float vAo;
varying float vFog; varying vec3 vNormalW;
void main(){
  vec4 tex = texture2D(map, vUv);
#ifdef CUTOUT
  if (tex.a < 0.5) discard;
#endif
  tex.rgb = pow(tex.rgb, vec3(2.2)); // sRGB -> linear
  float sky = vLight.x;
  float blk = vLight.y;
  float skyContrib = sky * uDayLight;
  float light = max(blk, skyContrib);
  light = max(light, uAmbient);
  // gentle ambient curve + slight directional bump
  float ndl = clamp(dot(normalize(vNormalW), normalize(uSunDir)), 0.0, 1.0);
  light *= (0.86 + 0.14 * ndl * uDayLight);
  // warm tint where block light dominates
  float warm = clamp(blk - skyContrib, 0.0, 1.0);
  vec3 lightCol = mix(vec3(1.0), vec3(1.15, 0.82, 0.5), warm);
  vec3 col = tex.rgb * vColor * light * (0.35 + 0.65*vAo) * lightCol;
  float alpha = tex.a;
#ifdef WATER
  alpha = 0.74;
  col += vec3(0.02,0.05,0.09) * uDayLight;
#endif
  vec3 fog = pow(uFogColor, vec3(2.2));
  col = mix(col, fog, vFog);
  if (uUnderwater > 0.5) col = mix(col, vec3(0.05,0.18,0.35), 0.35);
  gl_FragColor = vec4(col, alpha);
}`;

function makeMat(texture, uniforms, defines, opts) {
  const u = Object.assign({ map: { value: texture } }, uniforms);
  const m = new THREE.ShaderMaterial({
    uniforms: u, vertexShader: VERT, fragmentShader: FRAG,
    defines, vertexColors: true,
    transparent: !!opts.transparent,
    depthWrite: opts.depthWrite !== false,
    side: opts.side || THREE.FrontSide,
  });
  return m;
}

export function createChunkMaterials(texture, uniforms) {
  return {
    0: makeMat(texture, uniforms, { CUTOUT: '', FOLIAGE: '' }, { transparent: false }),
    1: makeMat(texture, uniforms, {}, { transparent: true, depthWrite: true }),
    2: makeMat(texture, uniforms, { WATER: '' }, { transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  };
}

// ---- sky / sun / moon / stars ----------------------------------------------
const SKY_VERT = `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_FRAG = /* glsl */`
varying vec3 vDir;
uniform vec3 uTop, uMid, uBottom, uSunColor; uniform vec3 uSunDir; uniform float uDay;
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
  vec3 col = mix(uBottom, uMid, smoothstep(0.30,0.5,h));
  col = mix(col, uTop, smoothstep(0.5,0.92,h));
  // sun glow
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * pow(sd, 64.0) * 1.3;
  col += uSunColor * pow(sd, 6.0) * 0.18 * uDay;
  // horizon haze toward sun
  col += uSunColor * pow(sd,3.0) * (1.0-h) * 0.25;
  gl_FragColor = vec4(pow(col, vec3(2.2)), 1.0);
}`;

export function createSky(uniforms) {
  const group = new THREE.Group();
  const geo = new THREE.SphereGeometry(900, 32, 16);
  const skyU = {
    uTop: { value: new THREE.Color(0x2a6bd6) },
    uMid: { value: new THREE.Color(0x7fb4f1) },
    uBottom: { value: new THREE.Color(0xbfd9f2) },
    uSunColor: { value: new THREE.Color(0xfff2cc) },
    uSunDir: uniforms.uSunDir,
    uDay: uniforms.uDayLight,
  };
  const mat = new THREE.ShaderMaterial({ uniforms: skyU, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, side: THREE.BackSide, depthWrite: false, fog: false });
  const dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false;
  group.add(dome);

  // sun
  const sun = new THREE.Mesh(new THREE.CircleGeometry(60, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6d0, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
  group.add(sun);
  // moon
  const moon = new THREE.Mesh(new THREE.CircleGeometry(42, 24),
    new THREE.MeshBasicMaterial({ color: 0xdfe6ff, transparent: true, depthWrite: false, fog: false }));
  group.add(moon);

  // stars
  const starGeo = new THREE.BufferGeometry();
  const N = 1400, pos = [];
  for (let i = 0; i < N; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(820);
    if (v.y < 0) v.y = -v.y;
    pos.push(v.x, v.y, v.z);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 3.0, sizeAttenuation: true, transparent: true, depthWrite: false, fog: false }));
  stars.frustumCulled = false;
  group.add(stars);

  return {
    group, dome, sun, moon, stars, skyU,
    setColors(top, mid, bottom, sunCol) { skyU.uTop.value.copy(top); skyU.uMid.value.copy(mid); skyU.uBottom.value.copy(bottom); skyU.uSunColor.value.copy(sunCol); },
    update(camera, sunDir, dayLight) {
      group.position.copy(camera.position);
      const R = 700;
      sun.position.copy(camera.position).addScaledVector(sunDir, R);
      sun.lookAt(camera.position);
      moon.position.copy(camera.position).addScaledVector(sunDir, -R);
      moon.lookAt(camera.position);
      stars.material.opacity = Math.pow(1.0 - dayLight, 1.5);
      sun.material.opacity = THREE.MathUtils.clamp(dayLight * 1.3, 0, 1);
      moon.material.opacity = THREE.MathUtils.clamp(1.0 - dayLight, 0, 1);
    },
  };
}

// ---- god rays pass ----------------------------------------------------------
const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSun: { value: new THREE.Vector2(0.5, 0.7) },
    uVisible: { value: 0 },
    uDensity: { value: 0.92 },
    uWeight: { value: 0.30 },
    uDecay: { value: 0.95 },
    uExposure: { value: 0.5 },
    uThreshold: { value: 0.55 },
    uColor: { value: new THREE.Color(0xfff0c8) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    #define SAMPLES 64
    varying vec2 vUv; uniform sampler2D tDiffuse;
    uniform vec2 uSun; uniform float uVisible, uDensity, uWeight, uDecay, uExposure, uThreshold;
    uniform vec3 uColor;
    void main(){
      vec3 base = texture2D(tDiffuse, vUv).rgb;
      if (uVisible < 0.5) { gl_FragColor = vec4(base,1.0); return; }
      vec2 delta = (vUv - uSun) * (uDensity / float(SAMPLES));
      vec2 coord = vUv;
      float illum = uExposure;
      vec3 sum = vec3(0.0);
      for (int i=0;i<SAMPLES;i++){
        coord -= delta;
        vec3 s = texture2D(tDiffuse, coord).rgb;
        float l = dot(s, vec3(0.299,0.587,0.114));
        float m = smoothstep(uThreshold, uThreshold+0.4, l);
        sum += s * m * illum * uWeight;
        illum *= uDecay;
      }
      gl_FragColor = vec4(base + sum * uColor * uVisible, 1.0);
    }`,
};

// ---- color grade pass -------------------------------------------------------
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSat: { value: 1.18 },
    uContrast: { value: 1.06 },
    uBrightness: { value: 1.02 },
    uVignette: { value: 0.42 },
    uTint: { value: new THREE.Color(1.02, 1.0, 0.98) },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    varying vec2 vUv; uniform sampler2D tDiffuse;
    uniform float uSat, uContrast, uBrightness, uVignette; uniform vec3 uTint;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      c *= uBrightness; c *= uTint;
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      c = mix(vec3(l), c, uSat);
      c = (c - 0.5) * uContrast + 0.5;
      vec2 q = vUv - 0.5;
      float vig = smoothstep(0.85, 0.35, length(q));
      c *= mix(1.0, vig, uVignette);
      gl_FragColor = vec4(max(c, 0.0), 1.0);
    }`,
};

export function createPostFX(renderer, scene, camera) {
  const size = new THREE.Vector2();
  renderer.getDrawingBufferSize(size);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const godrays = new ShaderPass(GodRaysShader);
  composer.addPass(godrays);

  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.55, 0.6, 0.72);
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  const output = new OutputPass();
  composer.addPass(output);

  return {
    composer, godrays, bloom, grade,
    render() { composer.render(); },
    setSize(w, h) { composer.setSize(w, h); bloom.setSize(w, h); },
  };
}
