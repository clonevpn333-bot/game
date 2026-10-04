import * as THREE from 'three';
import { G } from './Globals';

export interface SkyPreset {
  top: THREE.ColorRepresentation;
  horizon: THREE.ColorRepresentation;
  glow: THREE.ColorRepresentation; // city light pollution from below
  cloud: number; // 0..1 coverage
  cloudColor: THREE.ColorRepresentation;
  sunDir?: [number, number, number];
  sunColor?: THREE.ColorRepresentation;
  sunSize?: number;
  stars?: number;
  /** surreal: draws faint impossible rings / inverted horizon */
  surreal?: number;
}

export const SKY = {
  storm: { top: '#05070c', horizon: '#1d2430', glow: '#6b4a32', cloud: 0.85, cloudColor: '#2a2f3a', stars: 0 } as SkyPreset,
  stormLight: { top: '#070a12', horizon: '#26303f', glow: '#7a5236', cloud: 0.75, cloudColor: '#343a47', stars: 0 } as SkyPreset,
  suburb: { top: '#04060b', horizon: '#141a26', glow: '#3d3044', cloud: 0.6, cloudColor: '#1f2430', stars: 0.4 } as SkyPreset,
  future: { top: '#1a0d08', horizon: '#5a2a14', glow: '#c85a20', cloud: 0.9, cloudColor: '#3a1d12', stars: 0 } as SkyPreset,
  other: { top: '#0b0420', horizon: '#3a1d5c', glow: '#b07ad8', cloud: 0.5, cloudColor: '#4a2f6e', stars: 0.8, surreal: 1 } as SkyPreset,
  otherPale: { top: '#c9c3d8', horizon: '#f0e8f2', glow: '#ffffff', cloud: 0.3, cloudColor: '#ffffff', stars: 0, surreal: 0.5 } as SkyPreset,
  sunrise: { top: '#2a3f66', horizon: '#f2a46a', glow: '#ffcf9a', cloud: 0.45, cloudColor: '#d98a6a', sunDir: [0.2, 0.06, -1], sunColor: '#fff0cc', sunSize: 1, stars: 0 } as SkyPreset,
  morning: { top: '#3f78c0', horizon: '#cfe0ee', glow: '#fff1d6', cloud: 0.32, cloudColor: '#f6f8fb', sunDir: [0.45, 0.55, -0.7], sunColor: '#fff6e2', sunSize: 0.7, stars: 0 } as SkyPreset,
  void: { top: '#000000', horizon: '#05050a', glow: '#120a1c', cloud: 0, cloudColor: '#000', stars: 0.2 } as SkyPreset,
};

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uCloud: { value: 0.8 },
    uCloudColor: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, -1, 0) },
    uSunColor: { value: new THREE.Color(0, 0, 0) },
    uSunSize: { value: 0 },
    uStars: { value: 0 },
    uSurreal: { value: 0 },
    uTime: G.uTime,
    uFlash: G.uFlash,
    uEcho: G.uEcho,
  };

  constructor() {
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop, uHorizon, uGlow, uCloudColor, uSunColor, uSunDir;
        uniform float uCloud, uTime, uFlash, uStars, uSurreal, uSunSize, uEcho;
        varying vec3 vDir;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
        float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          float hh = clamp(h, 0.0, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(hh, 0.55));
          // light pollution glow hugging horizon
          col += uGlow * exp(-abs(h) * 9.0) * 0.55;
          col += uGlow * exp(-abs(h) * 3.0) * 0.12;
          // clouds: project onto plane
          if (h > -0.05) {
            vec2 cp = d.xz / (h + 0.12) * 1.6;
            cp += vec2(uTime * 0.012, uTime * 0.004);
            float c = fbm(cp * 0.9);
            float c2 = fbm(cp * 2.3 + 7.0);
            float cov = smoothstep(1.0 - uCloud, 1.0 - uCloud + 0.45, c * 0.75 + c2 * 0.35);
            // underside lit by city glow, darker tops
            vec3 cc = mix(uCloudColor, uGlow * 0.9, smoothstep(0.35, 0.0, h) * 0.65);
            cc *= 0.6 + 0.5 * c2;
            float fl = uFlash * (0.6 + 0.8 * c2);
            cc += vec3(0.7, 0.75, 0.95) * fl;
            col = mix(col, cc, cov * smoothstep(-0.05, 0.12, h));
          }
          // stars
          if (uStars > 0.0 && h > 0.0) {
            vec2 sp = d.xz / (h + 0.3) * 60.0;
            float s = step(0.997, hash(floor(sp)));
            col += vec3(s) * uStars * hh * 0.8;
          }
          // sun
          if (uSunSize > 0.0) {
            float sd = max(dot(d, normalize(uSunDir)), 0.0);
            col += uSunColor * (pow(sd, 900.0) * 6.0 + pow(sd, 18.0) * 0.6 + pow(sd, 3.0) * 0.15) * uSunSize;
          }
          // surreal: concentric rings in the sky + mirrored city glow above
          if (uSurreal > 0.0) {
            float a = atan(d.z, d.x);
            float r = acos(clamp(d.y, -1.0, 1.0));
            float rings = smoothstep(0.02, 0.0, abs(fract(r * 6.0 - uTime * 0.05) - 0.5) - 0.47);
            col += vec3(0.6, 0.4, 1.0) * rings * 0.25 * uSurreal * hh;
            col += uGlow * exp(-abs(h - 0.9) * 6.0) * 0.4 * uSurreal;
            float cracks = smoothstep(0.995, 1.0, noise(vec2(a * 20.0, r * 30.0 + uTime * 0.1)));
            col += vec3(1.0, 0.9, 1.0) * cracks * uSurreal;
          }
          col *= 1.0 - uEcho * 0.25;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(800, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
  }

  set(p: SkyPreset): void {
    const u = this.uniforms;
    u.uTop.value.set(p.top);
    u.uHorizon.value.set(p.horizon);
    u.uGlow.value.set(p.glow);
    u.uCloud.value = p.cloud;
    u.uCloudColor.value.set(p.cloudColor);
    u.uStars.value = p.stars ?? 0;
    u.uSurreal.value = p.surreal ?? 0;
    if (p.sunDir) {
      u.uSunDir.value.set(...p.sunDir).normalize();
      u.uSunColor.value.set(p.sunColor ?? '#ffffff');
      u.uSunSize.value = p.sunSize ?? 1;
    } else {
      u.uSunSize.value = 0;
    }
  }

  /** Blend towards another preset (t 0..1) — used for the sunrise. */
  blend(a: SkyPreset, b: SkyPreset, t: number): void {
    const u = this.uniforms;
    const c = (x: THREE.ColorRepresentation, y: THREE.ColorRepresentation) => new THREE.Color(x).lerp(new THREE.Color(y), t);
    u.uTop.value.copy(c(a.top, b.top));
    u.uHorizon.value.copy(c(a.horizon, b.horizon));
    u.uGlow.value.copy(c(a.glow, b.glow));
    u.uCloudColor.value.copy(c(a.cloudColor, b.cloudColor));
    u.uCloud.value = THREE.MathUtils.lerp(a.cloud, b.cloud, t);
    u.uStars.value = THREE.MathUtils.lerp(a.stars ?? 0, b.stars ?? 0, t);
    if (b.sunDir) {
      u.uSunDir.value.set(...b.sunDir).normalize();
      u.uSunColor.value.set(b.sunColor ?? '#fff');
      u.uSunSize.value = t * (b.sunSize ?? 1);
    }
  }

  update(camera: THREE.Camera): void {
    this.mesh.position.copy(camera.position);
  }
}
