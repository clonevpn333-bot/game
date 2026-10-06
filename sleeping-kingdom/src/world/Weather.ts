import * as THREE from 'three';
import { createSeededRandom } from '../utils/random';

/** GPU-animated particle field wrapped around the camera (one draw call). */
class Field {
  readonly points: THREE.Points;
  readonly uniforms = {
    uCam: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uVel: { value: new THREE.Vector3() },
    uColor: { value: new THREE.Color() },
    uSize: { value: 1 },
    uBox: { value: 40 },
  };

  constructor(count: number, color: string, vel: THREE.Vector3, size: number, box: number, seed: number) {
    const rng = createSeededRandom(seed);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count * 4; i += 1) seeds[i] = rng();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    this.uniforms.uColor.value.set(color);
    this.uniforms.uVel.value.copy(vel);
    this.uniforms.uSize.value = size;
    this.uniforms.uBox.value = box;
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute vec4 aSeed; uniform vec3 uCam, uVel; uniform float uTime, uSize, uBox, uIntensity; varying float vA;
        void main(){
          vec3 p = aSeed.xyz * uBox + uVel * uTime * (0.7 + aSeed.w * 0.6);
          p.x += sin(uTime * 1.3 + aSeed.w * 30.0) * 0.6;
          p.z += cos(uTime * 1.1 + aSeed.w * 20.0) * 0.6;
          vec3 rel = mod(p - uCam + uBox * 0.5, uBox) - uBox * 0.5;
          vec3 world = uCam + rel;
          vec4 mv = modelViewMatrix * vec4(world, 1.0);
          float edge = 1.0 - smoothstep(uBox * 0.3, uBox * 0.5, length(rel));
          vA = edge * uIntensity * (0.5 + 0.5 * sin(uTime * 6.0 + aSeed.w * 50.0));
          gl_PointSize = min(uSize * (300.0 / -mv.z) * (0.5 + aSeed.w), 14.0);
          vA *= smoothstep(1.5, 4.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `uniform vec3 uColor; varying float vA;
        void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(uColor * a, 1.0); }`,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
  }

  update(time: number, cam: THREE.Vector3, intensity: number): void {
    this.uniforms.uTime.value = time;
    this.uniforms.uCam.value.copy(cam);
    this.uniforms.uIntensity.value = intensity;
    this.points.visible = intensity > 0.01;
  }
}

export class Weather {
  readonly group = new THREE.Group();
  private readonly rain: THREE.LineSegments;
  private readonly rainUniforms = {
    uCam: { value: new THREE.Vector3() },
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uWind: { value: new THREE.Vector3(2.5, 0, 1.2) },
    uFlash: { value: 0 },
  };
  private readonly embers = new Field(500, '#ff7a2a', new THREE.Vector3(0.6, 3.2, 0.2), 0.32, 46, 3);
  private readonly ash = new Field(500, '#8a8a96', new THREE.Vector3(0.4, -2.2, 0.3), 0.36, 40, 4);
  private readonly motes = new Field(300, '#ffd890', new THREE.Vector3(0.1, 0.25, 0.1), 0.18, 30, 5);
  private readonly bolt: THREE.Line;
  private readonly rng = createSeededRandom(808);
  rainLevel = 1;
  emberLevel = 0;
  ashLevel = 0;
  /** Ash field doubles as snowfall: white, slower, more of it. */
  setSnow(on: boolean): void {
    this.ash.uniforms.uColor.value.set(on ? '#c8d0e0' : '#8a8a96');
    this.ash.uniforms.uVel.value.set(on ? 1.4 : 0.4, on ? -1.6 : -2.2, on ? 0.6 : 0.3);
    this.ash.uniforms.uSize.value = on ? 0.5 : 0.36;
  }
  moteLevel = 0;
  lightningEnabled = true;
  lightning = 0;
  private nextStrike = 4;
  private strikeT = -1;
  onStrike: ((distance: number) => void) | null = null;

  constructor() {
    const count = 3200;
    const seeds = new Float32Array(count * 2 * 4);
    const ends = new Float32Array(count * 2);
    for (let i = 0; i < count; i += 1) {
      const a = this.rng();
      const b = this.rng();
      const c = this.rng();
      const d = this.rng();
      for (let v = 0; v < 2; v += 1) {
        seeds.set([a, b, c, d], (i * 2 + v) * 4);
        ends[i * 2 + v] = v;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: this.rainUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute vec4 aSeed; attribute float aEnd; uniform vec3 uCam, uWind; uniform float uTime; varying float vEnd; varying float vFade;
        void main(){
          float box = 34.0;
          float h = 30.0;
          vec3 p = vec3(aSeed.x * box, 0.0, aSeed.y * box);
          vec3 rel = mod(p - uCam + box * 0.5 + uWind * uTime * 0.2, box) - box * 0.5;
          float fall = mod(uTime * (26.0 + aSeed.w * 8.0) + aSeed.z * h, h);
          vec3 world = uCam + vec3(rel.x, h * 0.5 - fall, rel.z);
          vec3 dir = normalize(vec3(uWind.x, -24.0, uWind.z));
          world -= dir * aEnd * (0.5 + aSeed.w * 0.4);
          vEnd = aEnd;
          vFade = 1.0 - smoothstep(10.0, 17.0, length(rel.xz));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
        }`,
      fragmentShader: `uniform float uIntensity, uFlash; varying float vEnd; varying float vFade;
        void main(){ float a = (1.0 - vEnd * 0.6) * 0.16 * uIntensity * vFade; gl_FragColor = vec4(vec3(0.62, 0.7, 0.9) * (1.0 + uFlash * 2.0), a); }`,
    });
    this.rain = new THREE.LineSegments(geo, mat);
    this.rain.frustumCulled = false;
    this.group.add(this.rain, this.embers.points, this.ash.points, this.motes.points);

    const boltGeo = new THREE.BufferGeometry();
    boltGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24 * 3), 3));
    this.bolt = new THREE.Line(boltGeo, new THREE.LineBasicMaterial({ color: '#dfe6ff', transparent: true, fog: false }));
    this.bolt.frustumCulled = false;
    this.bolt.visible = false;
    this.group.add(this.bolt);
  }

  /** Force a strike (used by the story at the reveal of the capital). */
  strike(): void {
    this.nextStrike = 0;
  }

  private placeBolt(cam: THREE.Vector3): void {
    const a = -Math.PI / 2 + (this.rng() - 0.5) * 1.8;
    const dist = 900 + this.rng() * 1400;
    const base = new THREE.Vector3(cam.x + Math.cos(a) * dist, 60, cam.z + Math.sin(a) * dist);
    const pos = this.bolt.geometry.attributes.position as THREE.BufferAttribute;
    let x = base.x;
    let z = base.z;
    for (let i = 0; i < 24; i += 1) {
      const y = 900 - (i / 23) * (900 - base.y);
      x += (this.rng() - 0.5) * 50;
      z += (this.rng() - 0.5) * 50;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    this.onStrike?.(dist);
  }

  update(dt: number, time: number, cam: THREE.Vector3): void {
    this.rainUniforms.uTime.value = time;
    this.rainUniforms.uCam.value.copy(cam);
    this.rainUniforms.uIntensity.value = this.rainLevel;
    this.rainUniforms.uFlash.value = this.lightning;
    this.rain.visible = this.rainLevel > 0.01;
    this.embers.update(time, cam, this.emberLevel);
    this.ash.update(time, cam, this.ashLevel);
    this.motes.update(time, cam, this.moteLevel);

    if (this.lightningEnabled) {
      this.nextStrike -= dt;
      if (this.nextStrike <= 0) {
        this.nextStrike = 7 + this.rng() * 9;
        this.strikeT = 0;
        this.placeBolt(cam);
      }
    }
    if (this.strikeT >= 0) {
      this.strikeT += dt;
      const t = this.strikeT;
      // Double-flicker envelope.
      this.lightning = t < 0.06 ? 1 : t < 0.14 ? 0.25 : t < 0.22 ? 0.85 : Math.max(0, 0.85 - (t - 0.22) * 2.2);
      this.bolt.visible = t < 0.3;
      (this.bolt.material as THREE.LineBasicMaterial).opacity = this.lightning;
      if (t > 0.8) {
        this.strikeT = -1;
        this.lightning = 0;
        this.bolt.visible = false;
      }
    }
  }
}
