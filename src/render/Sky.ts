import * as THREE from 'three';
import { DREAM_FOG_PARS, dreamUniforms } from './DreamShading';

const NOISE_GLSL = /* glsl */ `
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), u.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){ float a = 0.5; float s = 0.0; for (int i = 0; i < 5; i++){ s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }
`;

export interface SkyParams {
  top: THREE.ColorRepresentation;
  mid: THREE.ColorRepresentation;
  sun: THREE.ColorRepresentation;
  sunSize: number;
  cloudLit: THREE.ColorRepresentation;
  cloudShade: THREE.ColorRepresentation;
  cloudCover: number;
  cloudScale: number;
  seaLit: THREE.ColorRepresentation;
  seaShade: THREE.ColorRepresentation;
  seaAmount: number;
  stars: number;
  grid: number;
  /** 0..1 how much the sky band behind the horizon is replaced by ceiling darkness (interiors). */
  ceiling: number;
}

export const DEFAULT_SKY: SkyParams = {
  top: '#8fb4ff',
  mid: '#f4c6dc',
  sun: '#fff1cf',
  sunSize: 1,
  cloudLit: '#fff6f0',
  cloudShade: '#c9b3dc',
  cloudCover: 0.5,
  cloudScale: 1,
  seaLit: '#fff4ee',
  seaShade: '#b9a7d6',
  seaAmount: 1,
  stars: 0,
  grid: 0,
  ceiling: 0,
};

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly uniforms = {
    uTop: { value: new THREE.Color() },
    uMid: { value: new THREE.Color() },
    uSunColor: { value: new THREE.Color() },
    uSunSize: { value: 1 },
    uCloudLit: { value: new THREE.Color() },
    uCloudShade: { value: new THREE.Color() },
    uCloudCover: { value: 0.5 },
    uCloudScale: { value: 1 },
    uSeaLit: { value: new THREE.Color() },
    uSeaShade: { value: new THREE.Color() },
    uSeaAmount: { value: 1 },
    uStars: { value: 0 },
    uGrid: { value: 0 },
    uCeiling: { value: 0 },
  };

  constructor() {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        ...this.uniforms,
        uTime: dreamUniforms.uTime,
        uDread: dreamUniforms.uDread,
        uSunDir: dreamUniforms.uSunDir,
        uFogColor: dreamUniforms.uFogColor,
        uFogSunColor: dreamUniforms.uFogSunColor,
        uFogLowColor: dreamUniforms.uFogLowColor,
        uFogDensity: dreamUniforms.uFogDensity,
        uFogBase: dreamUniforms.uFogBase,
        uFogHeightFalloff: dreamUniforms.uFogHeightFalloff,
        uFogHeightMix: dreamUniforms.uFogHeightMix,
        uFogMax: dreamUniforms.uFogMax,
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main(){
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        uniform vec3 uTop, uMid, uSunColor, uCloudLit, uCloudShade, uSeaLit, uSeaShade;
        uniform float uSunSize, uCloudCover, uCloudScale, uSeaAmount, uStars, uGrid, uCeiling, uTime, uDread;
        ${DREAM_FOG_PARS}
        ${NOISE_GLSL}
        void main(){
          vec3 d = normalize(vDir);
          vec3 sd = normalize(uSunDir);
          vec3 horizon = dreamFogColor(d);
          float y = d.y;
          vec3 col;
          if (y >= 0.0) {
            float t = pow(clamp(y, 0.0, 1.0), 0.55);
            col = mix(horizon, uMid, smoothstep(0.0, 0.35, t));
            col = mix(col, uTop, smoothstep(0.3, 1.0, t));
            // high cloud layer
            vec2 cuv = d.xz / (y + 0.12) * 0.55 * uCloudScale + vec2(uTime * 0.004, uTime * 0.002);
            float n = fbm(cuv * 1.3);
            float n2 = fbm(cuv * 3.1 + 4.0);
            float c = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.32, n * 0.75 + n2 * 0.35);
            float sunSide = pow(max(dot(d, sd), 0.0), 3.0);
            vec3 cc = mix(uCloudShade, uCloudLit, clamp(n2 * 1.2 + sunSide * 0.6, 0.0, 1.0));
            col = mix(col, cc, c * smoothstep(0.0, 0.18, y) * 0.92);
            // stars
            if (uStars > 0.0) {
              vec2 sp = d.xz / (y + 0.3) * 60.0;
              float st = step(0.985, h21(floor(sp))) * smoothstep(0.5, 0.0, length(fract(sp) - 0.5));
              st *= 0.6 + 0.4 * sin(uTime * 2.0 + h21(floor(sp)) * 30.0);
              col += vec3(st) * uStars * smoothstep(0.05, 0.4, y) * (1.0 - c);
            }
          } else {
            // the cloud sea below
            vec2 suv = d.xz / (-y + 0.03) * 0.9 + vec2(uTime * 0.006, 0.0);
            float n = fbm(suv * 0.8);
            float n2 = fbm(suv * 2.4 + 7.0);
            float puff = smoothstep(0.35, 0.75, n * 0.8 + n2 * 0.3);
            float sunSide = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(sd.x, 0.0, sd.z))), 0.0), 2.0);
            vec3 sea = mix(uSeaShade, uSeaLit, clamp(puff * 0.9 + sunSide * 0.35, 0.0, 1.0));
            col = mix(horizon, sea, smoothstep(0.0, -0.22, y) * uSeaAmount);
            col = mix(col, horizon, (1.0 - uSeaAmount) * smoothstep(0.0, -0.6, y));
          }
          // sun disc + halo
          float sdot = max(dot(d, sd), 0.0);
          col += uSunColor * (pow(sdot, 900.0 / uSunSize) * 2.4 + pow(sdot, 12.0) * 0.32 + pow(sdot, 3.0) * 0.12) * (1.0 - uCeiling);
          // interior ceiling darkness
          col = mix(col, uTop * 0.35, uCeiling * smoothstep(0.05, 0.6, y));
          // wrongness: faint grid in the sky
          if (uGrid > 0.0) {
            vec2 g = abs(fract(d.xz / (abs(y) + 0.2) * 3.0) - 0.5);
            float line = smoothstep(0.48, 0.5, max(g.x, g.y));
            col = mix(col, col * 0.6 + vec3(0.05), line * uGrid * smoothstep(0.02, 0.3, abs(y)));
          }
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    this.mesh.scale.setScalar(900);
    this.apply(DEFAULT_SKY);
  }

  apply(p: SkyParams): void {
    const u = this.uniforms;
    u.uTop.value.set(p.top);
    u.uMid.value.set(p.mid);
    u.uSunColor.value.set(p.sun);
    u.uSunSize.value = p.sunSize;
    u.uCloudLit.value.set(p.cloudLit);
    u.uCloudShade.value.set(p.cloudShade);
    u.uCloudCover.value = p.cloudCover;
    u.uCloudScale.value = p.cloudScale;
    u.uSeaLit.value.set(p.seaLit);
    u.uSeaShade.value.set(p.seaShade);
    u.uSeaAmount.value = p.seaAmount;
    u.uStars.value = p.stars;
    u.uGrid.value = p.grid;
    u.uCeiling.value = p.ceiling;
  }

  follow(camera: THREE.Camera): void {
    this.mesh.position.copy(camera.position);
  }
}

/**
 * Soft billboard cloud banks for the distant layer: one instanced draw call,
 * procedural soft edges, top-lit shading, dream fog.
 */
export class CloudBank {
  readonly mesh: THREE.Mesh;
  private readonly material: THREE.ShaderMaterial;

  constructor(
    puffs: Array<{ x: number; y: number; z: number; s: number }>,
    lit: THREE.ColorRepresentation = '#fff7f2',
    shade: THREE.ColorRepresentation = '#c7b2dd',
    opacity = 1,
  ) {
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute('position', base.getAttribute('position'));
    geo.setAttribute('uv', base.getAttribute('uv'));
    const offs = new Float32Array(puffs.length * 3);
    const sc = new Float32Array(puffs.length * 2);
    puffs.forEach((p, i) => {
      offs.set([p.x, p.y, p.z], i * 3);
      sc.set([p.s, (i * 0.618) % 1], i * 2);
    });
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offs, 3));
    geo.setAttribute('aScale', new THREE.InstancedBufferAttribute(sc, 2));
    geo.instanceCount = puffs.length;
    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uLit: { value: new THREE.Color(lit) },
        uShade: { value: new THREE.Color(shade) },
        uOpacity: { value: opacity },
        uTime: dreamUniforms.uTime,
        uSunDir: dreamUniforms.uSunDir,
        uFogColor: dreamUniforms.uFogColor,
        uFogSunColor: dreamUniforms.uFogSunColor,
        uFogLowColor: dreamUniforms.uFogLowColor,
        uFogDensity: dreamUniforms.uFogDensity,
        uFogBase: dreamUniforms.uFogBase,
        uFogHeightFalloff: dreamUniforms.uFogHeightFalloff,
        uFogHeightMix: dreamUniforms.uFogHeightMix,
        uFogMax: dreamUniforms.uFogMax,
      },
      vertexShader: /* glsl */ `
        attribute vec3 aOffset;
        attribute vec2 aScale;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying float vSeed;
        void main(){
          vUv = uv;
          vSeed = aScale.y;
          vec3 center = aOffset + vec3(sin(uTime * 0.05 + aScale.y * 20.0) * 2.0, sin(uTime * 0.07 + aScale.y * 9.0) * 0.6, 0.0);
          vec4 mv = viewMatrix * vec4(center, 1.0);
          mv.xy += position.xy * aScale.x;
          vWorld = center + (transpose(mat3(viewMatrix)) * vec3(position.xy * aScale.x, 0.0));
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uLit, uShade;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorld;
        varying float vSeed;
        ${DREAM_FOG_PARS}
        ${NOISE_GLSL}
        void main(){
          vec2 p = vUv - 0.5;
          float n = fbm(vUv * 3.0 + vSeed * 17.0);
          float r = length(p * vec2(1.0, 1.25)) * 2.0 + (n - 0.5) * 0.55;
          float a = smoothstep(1.0, 0.55, r);
          if (a < 0.01) discard;
          float lit = clamp(vUv.y * 0.9 + n * 0.5 + 0.1, 0.0, 1.0);
          vec3 c = mix(uShade, uLit, lit);
          vec3 dv = normalize(vWorld - cameraPosition);
          c = mix(c, dreamFogColor(dv), dreamFogAmount(vWorld) * 0.85);
          gl_FragColor = vec4(c, a * uOpacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
