import * as THREE from 'three';
import { rng } from './Kit';

/**
 * Painted sky: a gradient dome with a soft sun, brushed cirrus streaks and
 * stars, plus towering cumulus billboards painted procedurally (lit tops,
 * cool flat-bottomed shadows) floating on a ring around the camera. Each
 * palette also drives the sun, the hemisphere fill (which is the colour of
 * every shadow in the painted shading) and the fog.
 */
export interface SkyPalette {
  top: THREE.ColorRepresentation;
  horizon: THREE.ColorRepresentation;
  ground: THREE.ColorRepresentation;
  sun: THREE.ColorRepresentation;
  sunDir: THREE.Vector3;
  cloud: THREE.ColorRepresentation;
  cloudShadow: THREE.ColorRepresentation;
  cloudCover: number;
  stars: number;
  fog: THREE.ColorRepresentation;
  fogDensity: number;
  sunIntensity: number;
  /** shadow fill colour + strength */
  shade: THREE.ColorRepresentation;
  ambient: number;
  exposure: number;
}

const P = (o: Omit<SkyPalette, 'sunDir'> & { sunDir: [number, number, number] }): SkyPalette => ({ ...o, sunDir: new THREE.Vector3(...o.sunDir).normalize() });

export const PALETTES: Record<string, SkyPalette> = {
  sunset: P({ top: '#3d5aa8', horizon: '#ffc08a', ground: '#6a4a52', sun: '#ffe2b0', sunDir: [-0.55, 0.16, -0.83], cloud: '#fff0dc', cloudShadow: '#a77a98', cloudCover: 0.55, stars: 0, fog: '#e8b898', fogDensity: 0.00034, sunIntensity: 2.3, shade: '#8a90c8', ambient: 2.1, exposure: 1.0 }),
  goldenPlains: P({ top: '#3a78d0', horizon: '#ffe0b0', ground: '#7a6a48', sun: '#fff2cc', sunDir: [0.6, 0.3, -0.75], cloud: '#ffffff', cloudShadow: '#9aa4cc', cloudCover: 0.5, stars: 0, fog: '#eed8b4', fogDensity: 0.00026, sunIntensity: 2.4, shade: '#93a2d8', ambient: 2.1, exposure: 1.0 }),
  dusk: P({ top: '#1f2a62', horizon: '#ec8a72', ground: '#3a2a40', sun: '#ffbe94', sunDir: [0.7, 0.08, -0.7], cloud: '#ffc0a0', cloudShadow: '#5a3a70', cloudCover: 0.55, stars: 0.25, fog: '#a87a88', fogDensity: 0.00034, sunIntensity: 1.9, shade: '#6a6aa8', ambient: 1.7, exposure: 1.05 }),
  night: P({ top: '#081236', horizon: '#26386a', ground: '#0c1020', sun: '#b4caff', sunDir: [-0.3, 0.55, -0.78], cloud: '#4a5a8a', cloudShadow: '#141a3a', cloudCover: 0.35, stars: 1, fog: '#18244a', fogDensity: 0.00045, sunIntensity: 0.8, shade: '#3a4a8a', ambient: 1.1, exposure: 1.15 }),
  morning: P({ top: '#2f7ae0', horizon: '#d8ecff', ground: '#78889a', sun: '#fff8e4', sunDir: [0.45, 0.42, -0.8], cloud: '#ffffff', cloudShadow: '#9cb0d8', cloudCover: 0.55, stars: 0, fog: '#cfe0f2', fogDensity: 0.00022, sunIntensity: 2.4, shade: '#9cb0e4', ambient: 2.2, exposure: 0.98 }),
  overcast: P({ top: '#62759a', horizon: '#d0d6de', ground: '#58606c', sun: '#fff4dc', sunDir: [-0.35, 0.45, -0.85], cloud: '#eef0f4', cloudShadow: '#7a849a', cloudCover: 0.85, stars: 0, fog: '#b0bac8', fogDensity: 0.0003, sunIntensity: 1.5, shade: '#9aa6c0', ambient: 2.4, exposure: 1.0 }),
  interior: P({ top: '#1a1208', horizon: '#3a2610', ground: '#0d0904', sun: '#ffcf86', sunDir: [0.2, 0.9, 0.2], cloud: '#3a2610', cloudShadow: '#100a04', cloudCover: 0, stars: 0, fog: '#2a1a0a', fogDensity: 0.004, sunIntensity: 1.8, shade: '#7a5a4a', ambient: 1.4, exposure: 1.1 }),
  storm: P({ top: '#2e2238', horizon: '#ea6a40', ground: '#2e1c1c', sun: '#ffa060', sunDir: [-0.6, 0.12, -0.79], cloud: '#e08060', cloudShadow: '#4a2438', cloudCover: 0.75, stars: 0, fog: '#9a5444', fogDensity: 0.0004, sunIntensity: 2.0, shade: '#7a5a8a', ambient: 1.7, exposure: 1.05 }),
  dawn: P({ top: '#4a70b8', horizon: '#ffd0a8', ground: '#6a5a5a', sun: '#ffecd0', sunDir: [0.3, 0.14, -0.95], cloud: '#fff0e4', cloudShadow: '#a888b0', cloudCover: 0.45, stars: 0.05, fog: '#e8c4b4', fogDensity: 0.00026, sunIntensity: 2.2, shade: '#9a98d0', ambient: 2.0, exposure: 1.0 }),
  space: P({ top: '#020208', horizon: '#06061a', ground: '#020208', sun: '#ffe8c0', sunDir: [0.6, 0.3, -0.7], cloud: '#000000', cloudShadow: '#000000', cloudCover: 0, stars: 1, fog: '#020208', fogDensity: 0.0, sunIntensity: 2.4, shade: '#2a2a5a', ambient: 0.9, exposure: 1.0 }),
};

const domeVert = /* glsl */ `
  varying vec3 vDir;
  void main(){
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const domeFrag = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uTop, uHorizon, uGround, uSun, uCloud, uCloudShadow;
  uniform vec3 uSunDir;
  uniform float uTime, uCover, uStars;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), u.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
  void main(){
    vec3 d = normalize(vDir);
    float h = d.y;
    // painted gradient: saturated zenith, luminous band at the horizon
    vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.45)) : mix(uHorizon, uGround, pow(clamp(-h * 5.0, 0.0, 1.0), 0.6));
    col = mix(col, uHorizon * 1.08, (1.0 - smoothstep(0.0, 0.08, abs(h))) * 0.35);
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSun * (smoothstep(0.9993, 0.9996, sd) * 4.0 + pow(sd, 14.0) * 0.32 + pow(sd, 3.0) * 0.1);
    if (uStars > 0.0 && h > 0.0) {
      vec2 sp = d.xz / (d.y + 0.25) * 160.0;
      float s = step(0.9965, hash(floor(sp)));
      float tw = 0.6 + 0.4 * sin(uTime * 2.0 + hash(floor(sp)) * 40.0);
      col += vec3(s * tw * uStars * smoothstep(0.0, 0.3, h)) * 1.4;
    }
    // brushed cirrus: stretched streaks high up
    if (uCover > 0.0 && h > 0.02) {
      vec2 cp = d.xz / (h + 0.08);
      cp = vec2(cp.x * 0.35 + cp.y * 0.2, cp.y * 1.6) + vec2(uTime * 0.004, 0.0);
      float n = fbm(cp * 1.2);
      float c = smoothstep(0.55, 0.85, n) * smoothstep(0.02, 0.25, h) * uCover;
      vec3 cc = mix(uCloudShadow, uCloud, 0.6 + 0.4 * smoothstep(0.5, 1.0, n));
      col = mix(col, cc, c * 0.55);
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const cloudVert = /* glsl */ `
  attribute vec4 aCloud; // x: variant (0..3), y: width, z: height, w: flip
  varying vec2 vUv;
  varying float vFade;
  void main(){
    vec4 c = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec4 mv = modelViewMatrix * c;
    vec2 off = position.xy * vec2(aCloud.y * aCloud.w, aCloud.z);
    mv.xy += off;
    vUv = vec2((uv.x + aCloud.x) / 4.0, uv.y);
    vec3 wp = (modelMatrix * c).xyz - cameraPosition;
    vFade = smoothstep(-0.02, 0.06, normalize(wp).y + 0.03);
    gl_Position = projectionMatrix * mv;
    gl_Position.z = gl_Position.w * 0.99999;
  }
`;

const cloudFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uCloud, uCloudShadow, uSun;
  uniform float uCover;
  varying vec2 vUv;
  varying float vFade;
  void main(){
    vec4 t = texture2D(uMap, vUv);
    float a = t.a * vFade * smoothstep(0.0, 0.35, uCover);
    if (a < 0.01) discard;
    vec3 col = mix(uCloudShadow, uCloud, t.r);
    col += uSun * pow(t.g, 2.0) * 0.25;
    gl_FragColor = vec4(col, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/** Paint four cumulus variants into one atlas (R: light, G: rim, A: coverage). */
function cumulusAtlas(): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  const c = document.createElement('canvas');
  c.width = W * 4;
  c.height = H;
  const g = c.getContext('2d')!;
  for (let v = 0; v < 4; v++) {
    const r = rng(31 + v * 7);
    const ox = v * W;
    const blobs: [number, number, number][] = [];
    const base = H * 0.86;
    const n = 26 + v * 4;
    for (let i = 0; i < n; i++) {
      const u = r();
      const x = ox + W * (0.12 + u * 0.76);
      const tall = Math.pow(1 - Math.abs(u - 0.5) * 2, 0.7);
      const rad = H * (0.08 + r() * 0.1) * (0.6 + tall * 0.6);
      const y = base - rad * 0.6 - tall * H * (0.25 + r() * 0.3) * (v === 2 ? 1.25 : 1);
      blobs.push([x, Math.min(base - rad * 0.5, y), rad]);
    }
    // body in shadow tone
    g.save();
    g.beginPath();
    g.rect(ox, 0, W, base);
    g.clip();
    for (const [x, y, rad] of blobs) {
      g.fillStyle = 'rgba(70, 0, 0, 1)';
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    // lit tops: each puff lit from above-left, painted as a smaller offset disc
    for (const [x, y, rad] of blobs.sort((a, b) => b[1] - a[1])) {
      const gr = g.createRadialGradient(x - rad * 0.35, y - rad * 0.45, rad * 0.1, x - rad * 0.2, y - rad * 0.25, rad * 1.0);
      gr.addColorStop(0, 'rgba(255, 255, 0, 1)');
      gr.addColorStop(0.55, 'rgba(235, 120, 0, 1)');
      gr.addColorStop(1, 'rgba(110, 0, 0, 0)');
      g.fillStyle = gr;
      g.beginPath();
      g.arc(x, y, rad, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    // flat, slightly darker base band
    const bg = g.createLinearGradient(0, base - H * 0.12, 0, base);
    bg.addColorStop(0, 'rgba(0,0,0,0)');
    bg.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = bg;
    g.fillRect(ox, 0, W, H);
    g.globalCompositeOperation = 'source-over';
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly clouds: THREE.InstancedMesh;
  readonly uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGround: { value: new THREE.Color() },
    uSun: { value: new THREE.Color() },
    uCloud: { value: new THREE.Color() },
    uCloudShadow: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uTime: { value: 0 },
    uCover: { value: 0.5 },
    uStars: { value: 0 },
    uMap: { value: null as THREE.Texture | null },
  };
  readonly sunLight: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly fog: THREE.FogExp2;
  palette: SkyPalette = PALETTES.sunset;
  private from: SkyPalette | null = null;
  private to: SkyPalette | null = null;
  private blendT = 0;
  private blendDur = 0;
  exposure = 1;
  /** world radius of the shadow frustum around the focus */
  shadowRadius = 45;

  constructor(scene: THREE.Scene) {
    const mat = new THREE.ShaderMaterial({ vertexShader: domeVert, fragmentShader: domeFrag, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, depthTest: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    this.mesh.scale.setScalar(100);
    scene.add(this.mesh);

    // cumulus ring
    this.uniforms.uMap.value = cumulusAtlas();
    const cm = new THREE.ShaderMaterial({ vertexShader: cloudVert, fragmentShader: cloudFrag, uniforms: this.uniforms, transparent: true, depthWrite: false });
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.translate(0, 0.42, 0);
    const N = 28;
    const attr = new Float32Array(N * 4);
    this.clouds = new THREE.InstancedMesh(geo, cm, N);
    const r = rng(5);
    const m = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + r() * 0.2;
      const dist = 4200 + r() * 900;
      const y = 120 + r() * 380;
      m.makeTranslation(Math.sin(a) * dist, y, Math.cos(a) * dist);
      this.clouds.setMatrixAt(i, m);
      const big = r();
      attr.set([Math.floor(r() * 4), 1400 + big * 1700, 700 + big * 900, r() > 0.5 ? 1 : -1], i * 4);
    }
    geo.setAttribute('aCloud', new THREE.InstancedBufferAttribute(attr, 4));
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = -9;
    scene.add(this.clouds);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 2);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const sc = this.sunLight.shadow.camera;
    sc.near = 10;
    sc.far = 2600;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.04;
    scene.add(this.sunLight);
    scene.add(this.sunLight.target);
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.hemi);
    this.fog = new THREE.FogExp2(0xffffff, 0.0004);
    scene.fog = this.fog;
    this.setShadowRadius(45);
    this.apply(PALETTES.sunset);
  }

  setShadowRadius(r: number): void {
    this.shadowRadius = r;
    const sc = this.sunLight.shadow.camera;
    sc.left = -r;
    sc.right = r;
    sc.top = r;
    sc.bottom = -r;
    sc.updateProjectionMatrix();
  }

  setPalette(p: SkyPalette, blendSeconds = 0): void {
    if (blendSeconds <= 0) {
      this.from = this.to = null;
      this.apply(p);
      return;
    }
    this.from = { ...this.palette, sunDir: this.palette.sunDir.clone() };
    this.to = p;
    this.blendT = 0;
    this.blendDur = blendSeconds;
  }

  private apply(p: SkyPalette): void {
    this.palette = p;
    const u = this.uniforms;
    u.uTop.value.set(p.top);
    u.uHorizon.value.set(p.horizon);
    u.uGround.value.set(p.ground);
    u.uSun.value.set(p.sun);
    u.uCloud.value.set(p.cloud);
    u.uCloudShadow.value.set(p.cloudShadow);
    u.uSunDir.value.copy(p.sunDir).normalize();
    u.uCover.value = p.cloudCover;
    u.uStars.value = p.stars;
    this.fog.color.set(p.fog);
    this.fog.density = p.fogDensity;
    this.sunLight.color.set(p.sun);
    this.sunLight.intensity = p.sunIntensity;
    this.hemi.color.set(p.shade);
    this.hemi.groundColor.set(p.ground).lerp(new THREE.Color(p.shade), 0.5);
    this.hemi.intensity = p.ambient;
    this.exposure = p.exposure;
  }

  private mix(a: SkyPalette, b: SkyPalette, t: number): SkyPalette {
    const c = (x: THREE.ColorRepresentation, y: THREE.ColorRepresentation) => new THREE.Color(x).lerp(new THREE.Color(y), t);
    const n = (x: number, y: number) => x + (y - x) * t;
    return {
      top: c(a.top, b.top), horizon: c(a.horizon, b.horizon), ground: c(a.ground, b.ground), sun: c(a.sun, b.sun),
      sunDir: a.sunDir.clone().lerp(b.sunDir, t).normalize(), cloud: c(a.cloud, b.cloud), cloudShadow: c(a.cloudShadow, b.cloudShadow),
      cloudCover: n(a.cloudCover, b.cloudCover), stars: n(a.stars, b.stars), fog: c(a.fog, b.fog), fogDensity: n(a.fogDensity, b.fogDensity),
      sunIntensity: n(a.sunIntensity, b.sunIntensity), shade: c(a.shade, b.shade), ambient: n(a.ambient, b.ambient), exposure: n(a.exposure, b.exposure),
    };
  }

  /** Keeps the shadow frustum centred on the action and the dome/clouds on the camera. */
  update(dt: number, time: number, camera: THREE.Camera, focus: THREE.Vector3): void {
    if (this.from && this.to) {
      this.blendT += dt;
      const t = Math.min(1, this.blendT / this.blendDur);
      const k = t * t * (3 - 2 * t);
      this.apply(this.mix(this.from, this.to, k));
      if (t >= 1) {
        this.apply(this.to);
        this.from = this.to = null;
      }
    }
    this.uniforms.uTime.value = time;
    this.mesh.position.copy(camera.position);
    this.clouds.position.set(camera.position.x, camera.position.y * 0.5, camera.position.z);
    this.clouds.rotation.y = time * 0.002;
    const dir = this.palette.sunDir;
    const ld = new THREE.Vector3(dir.x, Math.max(dir.y, 0.35), dir.z).normalize();
    // snap the shadow camera to texels so shadows don't shimmer while moving
    const texel = (this.shadowRadius * 2) / this.sunLight.shadow.mapSize.x;
    const f = focus.clone();
    f.x = Math.round(f.x / texel) * texel;
    f.z = Math.round(f.z / texel) * texel;
    this.sunLight.target.position.copy(f);
    this.sunLight.position.copy(f).addScaledVector(ld, 1200);
    this.sunLight.target.updateMatrixWorld();
  }
}
