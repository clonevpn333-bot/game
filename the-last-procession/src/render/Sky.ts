import * as THREE from 'three';

export interface SkyPalette {
  top: THREE.ColorRepresentation;
  horizon: THREE.ColorRepresentation;
  ground: THREE.ColorRepresentation;
  sun: THREE.ColorRepresentation;
  sunDir: THREE.Vector3;
  cloud: THREE.ColorRepresentation;
  cloudShadow: THREE.ColorRepresentation;
  cloudCover: number; // 0..1
  stars: number; // 0..1
  fog: THREE.ColorRepresentation;
  fogDensity: number;
  sunIntensity: number;
  ambient: number;
  exposure: number;
}

export const PALETTES: Record<string, SkyPalette> = {
  sunset: {
    top: '#3b4f8f', horizon: '#ffb37a', ground: '#5a3b4a', sun: '#ffe3a8', sunDir: new THREE.Vector3(-0.55, 0.12, -0.83),
    cloud: '#ffd6b0', cloudShadow: '#8a5a78', cloudCover: 0.5, stars: 0, fog: '#d9a084', fogDensity: 0.00042, sunIntensity: 3.2, ambient: 1.0, exposure: 1.0,
  },
  goldenPlains: {
    top: '#4a78b8', horizon: '#ffd39a', ground: '#6b5a40', sun: '#fff0c4', sunDir: new THREE.Vector3(0.6, 0.18, -0.78),
    cloud: '#fff1da', cloudShadow: '#9d8098', cloudCover: 0.45, stars: 0, fog: '#e8c79d', fogDensity: 0.00032, sunIntensity: 3.4, ambient: 1.05, exposure: 1.0,
  },
  dusk: {
    top: '#1e2652', horizon: '#e0786a', ground: '#2e2238', sun: '#ffb487', sunDir: new THREE.Vector3(0.7, 0.05, -0.7),
    cloud: '#f2a487', cloudShadow: '#4a3060', cloudCover: 0.55, stars: 0.25, fog: '#9a6a7a', fogDensity: 0.0004, sunIntensity: 2.4, ambient: 0.85, exposure: 1.05,
  },
  night: {
    top: '#050a1c', horizon: '#1e2b52', ground: '#0a0d18', sun: '#a9c4ff', sunDir: new THREE.Vector3(-0.3, 0.55, -0.78),
    cloud: '#3a4a78', cloudShadow: '#0b1028', cloudCover: 0.3, stars: 1, fog: '#141d3a', fogDensity: 0.0005, sunIntensity: 0.9, ambient: 0.55, exposure: 1.15,
  },
  morning: {
    top: '#3f7fd0', horizon: '#cfe6ff', ground: '#6f8090', sun: '#fff6de', sunDir: new THREE.Vector3(0.45, 0.35, -0.82),
    cloud: '#ffffff', cloudShadow: '#93a3c6', cloudCover: 0.5, stars: 0, fog: '#c4d6ea', fogDensity: 0.00028, sunIntensity: 3.4, ambient: 1.1, exposure: 0.95,
  },
  overcast: {
    top: '#5d6f8a', horizon: '#c9cfd6', ground: '#535a66', sun: '#fff1d0', sunDir: new THREE.Vector3(-0.35, 0.4, -0.85),
    cloud: '#e6e9ee', cloudShadow: '#6a7488', cloudCover: 0.8, stars: 0, fog: '#a8b2c0', fogDensity: 0.00035, sunIntensity: 2.6, ambient: 1.15, exposure: 1.0,
  },
  interior: {
    top: '#1a1208', horizon: '#3a2610', ground: '#0d0904', sun: '#ffcf86', sunDir: new THREE.Vector3(0.2, 0.9, 0.2),
    cloud: '#3a2610', cloudShadow: '#100a04', cloudCover: 0, stars: 0, fog: '#2a1a0a', fogDensity: 0.004, sunIntensity: 2.2, ambient: 0.75, exposure: 1.1,
  },
  storm: {
    top: '#2a1e30', horizon: '#e0603a', ground: '#2b1a1a', sun: '#ff9a5a', sunDir: new THREE.Vector3(-0.6, 0.1, -0.79),
    cloud: '#d07050', cloudShadow: '#3a1e2e', cloudCover: 0.75, stars: 0, fog: '#8a4a3a', fogDensity: 0.00045, sunIntensity: 2.8, ambient: 0.9, exposure: 1.05,
  },
  dawn: {
    top: '#4c6aa8', horizon: '#ffc8a0', ground: '#6a5a5a', sun: '#ffe9c8', sunDir: new THREE.Vector3(0.3, 0.1, -0.95),
    cloud: '#ffe0cc', cloudShadow: '#9a7aa0', cloudCover: 0.4, stars: 0.05, fog: '#e0b8a8', fogDensity: 0.0003, sunIntensity: 3.0, ambient: 1.0, exposure: 1.0,
  },
  space: {
    top: '#020208', horizon: '#06061a', ground: '#020208', sun: '#6a5e4a', sunDir: new THREE.Vector3(0.6, 0.3, -0.7),
    cloud: '#000000', cloudShadow: '#000000', cloudCover: 0, stars: 1, fog: '#020208', fogDensity: 0.0, sunIntensity: 3.0, ambient: 0.5, exposure: 1.0,
  },
};

const vert = /* glsl */ `
  varying vec3 vDir;
  void main(){
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;

const frag = /* glsl */ `
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
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.07; a *= 0.5; }
    return v;
  }
  void main(){
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uGround, pow(clamp(-h * 4.0, 0.0, 1.0), 0.6));
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSun * (pow(sd, 900.0) * 6.0 + pow(sd, 12.0) * 0.35 + pow(sd, 3.0) * 0.12);
    // stars
    if (uStars > 0.0 && h > 0.0) {
      vec2 sp = d.xz / (d.y + 0.25) * 140.0;
      float s = step(0.996, hash(floor(sp)));
      float tw = 0.6 + 0.4 * sin(uTime * 2.0 + hash(floor(sp)) * 40.0);
      col += vec3(s * tw * uStars * smoothstep(0.0, 0.3, h));
    }
    // painterly cloud deck projected on a dome
    if (uCover > 0.0 && h > -0.02) {
      vec2 cp = d.xz / (h + 0.12) * 1.1 + vec2(uTime * 0.006, uTime * 0.002);
      float n = fbm(cp * 1.4);
      float n2 = fbm(cp * 3.1 + 7.0);
      float c = smoothstep(1.0 - uCover, 1.15 - uCover * 0.6, n * 0.75 + n2 * 0.35);
      float lit = smoothstep(0.2, 0.9, n2) * 0.6 + pow(sd, 4.0) * 0.8;
      vec3 cc = mix(uCloudShadow, uCloud, clamp(lit, 0.0, 1.0));
      float fade = smoothstep(-0.02, 0.18, h) * (1.0 - smoothstep(0.75, 1.0, h) * 0.5);
      col = mix(col, cc, c * fade * 0.92);
      // silver lining toward the sun
      col += uSun * c * fade * pow(sd, 18.0) * 0.6;
    }
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class Sky {
  readonly mesh: THREE.Mesh;
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

  constructor(scene: THREE.Scene) {
    const mat = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, depthTest: false });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    this.mesh.scale.setScalar(6000);
    scene.add(this.mesh);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 3);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const sc = this.sunLight.shadow.camera;
    sc.left = -45;
    sc.right = 45;
    sc.top = 45;
    sc.bottom = -45;
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
    this.apply(PALETTES.sunset);
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
    this.hemi.color.set(p.top).lerp(new THREE.Color(p.horizon), 0.5);
    this.hemi.groundColor.set(p.ground);
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
      sunIntensity: n(a.sunIntensity, b.sunIntensity), ambient: n(a.ambient, b.ambient), exposure: n(a.exposure, b.exposure),
    };
  }

  /** Keeps the shadow frustum centered on the action and the dome on the camera. */
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
    const dir = this.palette.sunDir;
    // keep light angle sensible even for very low suns so shadows stay readable
    const ld = new THREE.Vector3(dir.x, Math.max(dir.y, 0.35), dir.z).normalize();
    this.sunLight.target.position.copy(focus);
    this.sunLight.position.copy(focus).addScaledVector(ld, 1200);
    this.sunLight.target.updateMatrixWorld();
  }
}
