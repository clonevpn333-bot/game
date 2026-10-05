import * as THREE from 'three';

export type SkyPalette = {
  top: THREE.ColorRepresentation;
  horizon: THREE.ColorRepresentation;
  glow: THREE.ColorRepresentation;
  cloud: THREE.ColorRepresentation;
  cloudLit: THREE.ColorRepresentation;
};

export const SKY_PALETTES: Record<'night' | 'city' | 'tremor' | 'eye' | 'wood' | 'drake', SkyPalette> = {
  night: { top: '#03050d', horizon: '#1b2347', glow: '#3a3f7a', cloud: '#0b0d18', cloudLit: '#5c6ba0' },
  city: { top: '#04040c', horizon: '#2a1c3a', glow: '#8a4a3a', cloud: '#0d0b16', cloudLit: '#6d5f94' },
  tremor: { top: '#0b0306', horizon: '#5a1a14', glow: '#d0502a', cloud: '#1a0806', cloudLit: '#b0503a' },
  eye: { top: '#0a0604', horizon: '#5a3a10', glow: '#ffb040', cloud: '#1a1006', cloudLit: '#d09a40' },
  wood: { top: '#02070a', horizon: '#123a30', glow: '#3a8a6a', cloud: '#06120e', cloudLit: '#5a8a7a' },
  drake: { top: '#0c0302', horizon: '#5a1a0a', glow: '#ff6a20', cloud: '#1a0604', cloudLit: '#c05a30' },
};

export class Sky {
  readonly mesh: THREE.Mesh;
  readonly uniforms = {
    uTime: { value: 0 },
    uLightning: { value: 0 },
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uCloud: { value: new THREE.Color() },
    uCloudLit: { value: new THREE.Color() },
    uMoonDir: { value: new THREE.Vector3(-0.35, 0.42, -0.84).normalize() },
    uGlowDir: { value: new THREE.Vector3(0, 0.05, -1).normalize() },
    uCloudCover: { value: 0.55 },
  };
  private target: SkyPalette = SKY_PALETTES.night;
  private readonly tmp = new THREE.Color();

  constructor() {
    this.applyPalette(SKY_PALETTES.night, 1);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: this.uniforms,
      vertexShader: `varying vec3 vDir;
        void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
      fragmentShader: `
        varying vec3 vDir;
        uniform float uTime, uLightning, uCloudCover;
        uniform vec3 uTop, uHorizon, uGlow, uCloud, uCloudLit, uMoonDir, uGlowDir;
        float hash(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
        float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
        float fbm(vec2 p){ float s=0.0; float a=0.5; for(int i=0;i<6;i++){ s+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5;} return s; }
        void main(){
          vec3 d = normalize(vDir);
          float h = clamp(d.y, -0.2, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(max(h,0.0), 0.45));
          float glowAmt = pow(max(dot(d, uGlowDir), 0.0), 6.0) * (1.0 - smoothstep(0.0, 0.5, h));
          col += uGlow * glowAmt * 0.9;
          // Stars, twinkling, thinner near the horizon.
          vec2 sp = d.xz / (abs(d.y) + 0.35) * 220.0;
          float st = hash(floor(sp));
          float star = step(0.9965, st) * smoothstep(0.05, 0.35, h);
          float tw = 0.6 + 0.4 * sin(uTime * 3.0 + st * 400.0);
          col += vec3(0.85, 0.9, 1.0) * star * tw * (0.6 + 2.0 * fract(st * 91.7));
          // Milky band.
          float band = exp(-pow(dot(d, normalize(vec3(0.6, 0.5, 0.2))) * 3.2, 2.0));
          col += vec3(0.25, 0.22, 0.4) * band * fbm(d.xz * 6.0) * 0.5 * smoothstep(0.1, 0.5, h);
          // Moon.
          float md = dot(d, normalize(uMoonDir));
          float disc = smoothstep(0.99935, 0.99955, md);
          vec2 mp = (d.xy - uMoonDir.xy) * 900.0;
          float maria = fbm(mp * 0.08 + 3.0);
          col += vec3(1.0, 0.96, 0.86) * disc * (1.3 - maria * 0.6) * 1.6;
          col += vec3(0.45, 0.5, 0.75) * pow(max(md, 0.0), 300.0) * 0.6;
          col += vec3(0.25, 0.3, 0.5) * pow(max(md, 0.0), 24.0) * 0.18;
          // Clouds: two layers projected on a dome.
          vec2 cuv = d.xz / (max(d.y, 0.0) + 0.12);
          float t = uTime * 0.012;
          float c1 = fbm(cuv * 0.9 + vec2(t, t * 0.4));
          float c2 = fbm(cuv * 2.4 - vec2(t * 1.8, 0.0) + c1);
          float dens = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.35, c1 * 0.7 + c2 * 0.45);
          dens *= smoothstep(-0.05, 0.12, d.y);
          float lit = pow(max(md, 0.0), 6.0) * (1.0 - c2) + glowAmt * 1.2;
          vec3 cc = mix(uCloud, uCloudLit, clamp(lit + c2 * 0.25, 0.0, 1.0));
          cc += vec3(0.7, 0.75, 1.0) * uLightning * (0.4 + c2) * 1.4;
          col = mix(col, cc, dens * 0.92);
          col += vec3(0.5, 0.55, 0.8) * uLightning * 0.25 * (1.0 - dens);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(9000, 48, 24), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
  }

  private applyPalette(p: SkyPalette, k: number): void {
    const u = this.uniforms;
    u.uTop.value.lerp(this.tmp.set(p.top), k);
    u.uHorizon.value.lerp(this.tmp.set(p.horizon), k);
    u.uGlow.value.lerp(this.tmp.set(p.glow), k);
    u.uCloud.value.lerp(this.tmp.set(p.cloud), k);
    u.uCloudLit.value.lerp(this.tmp.set(p.cloudLit), k);
  }

  setPalette(p: SkyPalette, instant = false): void {
    this.target = p;
    if (instant) this.applyPalette(p, 1);
  }

  update(dt: number, elapsed: number, cameraPos: THREE.Vector3): void {
    this.uniforms.uTime.value = elapsed;
    this.applyPalette(this.target, 1 - Math.exp(-dt * 0.8));
    this.mesh.position.copy(cameraPos);
  }
}
