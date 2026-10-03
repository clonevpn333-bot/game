import * as THREE from 'three';
import { G } from '../core/state.js';
import { GU, EU } from './materials.js';
import { ERA_DEF, paletteWeights, blendPalette, blendScalar } from './eras.js';
import { clamp, lerp } from '../core/mathx.js';

const SkyShader = {
  uniforms: {
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGround: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunCol: { value: new THREE.Color() },
    uMoonDir: { value: new THREE.Vector3(0, 1, 0) },
    uNight: { value: 0 },
    uTime: { value: 0 },
    uCloud: { value: 0.5 },
    uCloudCol: { value: new THREE.Color(1, 1, 1) },
    uSmog: { value: 0 },
    uAurora: { value: 0 },
    uStorm: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_Position = p.xyww;
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 uZenith, uHorizon, uGround, uSunDir, uSunCol, uMoonDir, uCloudCol;
    uniform float uNight, uTime, uCloud, uSmog, uAurora, uStorm;
    varying vec3 vDir;
    float h2(vec2 p){ p = fract(p * vec2(0.1031, 0.103)); p += dot(p, p.yx + 33.33); return fract((p.x + p.y) * p.x); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
      return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
    float fbm(vec2 p){ float s=0., a=0.5; for(int i=0;i<5;i++){ s+=a*n2(p); p=p*2.02+11.3; a*=0.5; } return s; }
    void main() {
      vec3 d = normalize(vDir);
      float y = d.y;
      float t = pow(clamp(y, 0.0, 1.0), 0.45);
      vec3 col = mix(uHorizon, uZenith, t);
      // below horizon fade to ground haze
      col = mix(col, uGround, smoothstep(0.0, -0.25, y));
      // sun
      float sd = max(dot(d, normalize(uSunDir)), 0.0);
      col += uSunCol * (pow(sd, 900.0) * 30.0 + pow(sd, 18.0) * 0.45 + pow(sd, 3.0) * 0.18) * (1.0 - uNight * 0.9);
      // moon
      float md = max(dot(d, normalize(uMoonDir)), 0.0);
      col += vec3(0.85, 0.9, 1.0) * (smoothstep(0.9993, 0.9996, md) * 3.5 + pow(md, 60.0) * 0.12) * uNight;
      // stars
      if (uNight > 0.01 && y > 0.0) {
        vec2 sp = d.xz / (d.y + 0.35) * 220.0;
        float s = h2(floor(sp));
        float tw = 0.6 + 0.4 * sin(uTime * 3.0 + s * 80.0);
        float star = step(0.9975, s) * smoothstep(0.5, 0.1, length(fract(sp) - 0.5)) * tw;
        col += vec3(0.9, 0.95, 1.0) * star * uNight * 2.2 * (1.0 - uSmog * 0.85) * smoothstep(0.0, 0.25, y);
      }
      // aurora (2189 nights)
      if (uAurora > 0.01 && y > 0.05) {
        vec2 ap = d.xz / (d.y + 0.2);
        float band = fbm(vec2(ap.x * 1.5 + uTime * 0.02, ap.y * 0.4));
        float a = smoothstep(0.45, 0.8, band) * smoothstep(0.05, 0.4, y) * (1.0 - smoothstep(0.5, 0.9, y));
        float wave = 0.5 + 0.5 * sin(ap.x * 6.0 + uTime * 0.3 + band * 8.0);
        col += mix(vec3(0.1, 1.0, 0.6), vec3(0.5, 0.3, 1.0), wave) * a * uAurora * 0.9;
      }
      // clouds
      if (y > 0.0) {
        vec2 cp = d.xz / (d.y + 0.08) * 1.6 + vec2(uTime * 0.006, uTime * 0.002);
        float c = fbm(cp);
        float cov = mix(0.62, 0.38, uCloud);
        float cl = smoothstep(cov, cov + 0.25, c) * smoothstep(0.0, 0.18, y);
        float lit = 0.6 + 0.4 * pow(sd, 4.0);
        vec3 cc = uCloudCol * lit;
        cc = mix(cc, uHorizon * 0.6, 0.3);
        col = mix(col, cc, cl * 0.85);
      }
      // smog band near horizon (2047)
      col = mix(col, uHorizon * vec3(1.05, 0.85, 1.1), uSmog * 0.5 * (1.0 - smoothstep(0.0, 0.3, y)));
      col = mix(col, col * 0.45 + vec3(0.12, 0.13, 0.15), uStorm * 0.7);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Sky {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    const geo = new THREE.SphereGeometry(3500, 48, 24);
    this.mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(SkyShader.uniforms),
      vertexShader: SkyShader.vertexShader,
      fragmentShader: SkyShader.fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -10;
    scene.add(this.mesh);

    this.sun = new THREE.DirectionalLight(0xffffff, 3);
    this.sun.castShadow = true;
    const sc = this.sun.shadow.camera;
    sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70;
    sc.near = 1; sc.far = 400;
    this.sun.shadow.mapSize.set(G.engine.shadowSize, G.engine.shadowSize);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.hemi = new THREE.HemisphereLight(0x9ab4d0, 0x4a4036, 0.8);
    scene.add(this.hemi);

    scene.fog = new THREE.FogExp2(0xbfcad6, 0.0016);

    this.eraFrom = 0;
    this.eraTo = 0;
    this.blend = 1;
    this.sunDir = new THREE.Vector3();
    this.weatherCloud = 0.4;
    this.weatherRain = 0;
    this.storm = 0;
    this.lightning = 0;

    // environment map for reflections
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(geo, this.mat);
    this.envScene.add(this.envSky);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = null;
    this.envTimer = 0;
    this.envDirty = true;

    this._a = new THREE.Color();
    this._b = new THREE.Color();
    this._c = new THREE.Color();
  }

  setEra(era, blendFrom = null) {
    if (blendFrom !== null) {
      this.eraFrom = blendFrom;
      this.eraTo = era;
      this.blend = 0;
    } else {
      this.eraFrom = this.eraTo = era;
      this.blend = 1;
    }
    this.envDirty = true;
  }

  _mixColor(key, w, out) {
    blendPalette(this.eraFrom, w, key, this._a);
    blendPalette(this.eraTo, w, key, this._b);
    return out.copy(this._a).lerp(this._b, this.blend);
  }
  _mixScalar(key, w) {
    return lerp(blendScalar(this.eraFrom, w, key), blendScalar(this.eraTo, w, key), this.blend);
  }

  update(dt, focus) {
    const t = G.dayTime;
    const ang = ((t - 6) / 24) * Math.PI * 2;
    const elev = Math.sin(ang) * 1.05;
    const az = ang * 0.9 + 0.6;
    this.sunElev = elev;
    this.sunDir.set(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev) * 0.7 + 0.35).normalize();
    const w = paletteWeights(elev);
    const night = w.night;
    this.night = night;

    const u = this.mat.uniforms;
    this._mixColor('zenith', w, u.uZenith.value);
    this._mixColor('horizon', w, u.uHorizon.value);
    this._mixColor('fog', w, u.uGround.value);
    this._mixColor('sun', w, u.uSunCol.value);
    u.uSunDir.value.copy(this.sunDir);
    u.uMoonDir.value.copy(this.sunDir).multiplyScalar(-1);
    u.uMoonDir.value.y = Math.abs(u.uMoonDir.value.y) * 0.8 + 0.25;
    u.uNight.value = night;
    u.uTime.value = G.time;
    u.uCloud.value = clamp(this.weatherCloud, 0, 1);
    u.uStorm.value = this.storm;
    const eraW = (e) => (this.eraFrom === e ? 1 - this.blend : 0) + (this.eraTo === e ? this.blend : 0);
    u.uSmog.value = eraW(1) * 0.8;
    u.uAurora.value = eraW(2) * night;
    u.uCloudCol.value.copy(u.uSunCol.value).lerp(new THREE.Color(1, 1, 1), 0.5).multiplyScalar(0.4 + 0.6 * (1 - night));

    // Lights
    const sunI = this._mixScalar('sunI', w) * (1 - this.storm * 0.55) * (1 - this.weatherCloud * 0.25);
    const lightDir = elev > -0.05 ? this.sunDir : u.uMoonDir.value;
    this.lightDir = lightDir;
    this.sun.color.copy(u.uSunCol.value);
    this.sun.intensity = Math.max(0.15, sunI) + this.lightning * 6;
    if (focus) {
      this.sun.position.copy(focus).addScaledVector(lightDir, 160);
      this.sun.target.position.copy(focus);
      // stabilise shadow map by snapping to texels
      const cam = this.sun.shadow.camera;
      const texel = (cam.right - cam.left) / this.sun.shadow.mapSize.x;
      this.sun.target.updateMatrixWorld();
      const m = new THREE.Matrix4().lookAt(this.sun.position, this.sun.target.position, new THREE.Vector3(0, 1, 0));
      const inv = m.clone().invert();
      const p = this.sun.target.position.clone().applyMatrix4(inv);
      p.x = Math.round(p.x / texel) * texel;
      p.y = Math.round(p.y / texel) * texel;
      p.applyMatrix4(m);
      const delta = p.sub(this.sun.target.position);
      this.sun.position.add(delta);
      this.sun.target.position.add(delta);
    }
    this._mixColor('amb', w, this.hemi.color);
    this.hemi.groundColor.copy(this.hemi.color).multiplyScalar(0.45).lerp(new THREE.Color(0.3, 0.25, 0.2), 0.3);
    this.hemi.intensity = this._mixScalar('ambI', w) * (1 + this.lightning * 2);

    // Fog
    const fog = this.scene.fog;
    this._mixColor('fog', w, fog.color);
    fog.color.lerp(new THREE.Color(0.4, 0.42, 0.45), this.storm * 0.4);
    fog.density = this._mixScalar('fogD', w) * (1 + this.weatherRain * 0.9 + this.storm * 0.6);
    GU.uFogSun.value.copy(u.uSunCol.value).multiplyScalar(0.8).lerp(fog.color, 0.35);

    GU.uSunDir.value.copy(lightDir);
    GU.uSunColor.value.copy(this.sun.color).multiplyScalar(Math.min(1, sunI / 3));
    GU.uNight.value = night;
    GU.uDaylight.value = 1 - night;
    GU.uSkyTop.value.copy(u.uZenith.value);
    GU.uSkyHorizon.value.copy(u.uHorizon.value);

    // Era colour grade (blended during shifts)
    const fin = G.engine.final;
    const ga = ERA_DEF[this.eraFrom].grade, gb = ERA_DEF[this.eraTo].grade, b = this.blend;
    const v3 = (u, a, c) => u.value.set(lerp(a[0], c[0], b), lerp(a[1], c[1], b), lerp(a[2], c[2], b));
    v3(fin.uLift, ga.lift, gb.lift); v3(fin.uGamma, ga.gamma, gb.gamma); v3(fin.uGain, ga.gain, gb.gain);
    v3(fin.uTint, ga.tint, gb.tint); v3(fin.uShadowTint, ga.shadowTint, gb.shadowTint);
    fin.uSat.value = lerp(ga.sat, gb.sat, b);
    fin.uContrast.value = lerp(ga.contrast, gb.contrast, b);
    fin.uVignette.value = lerp(ga.vignette, gb.vignette, b);
    fin.uGrain.value = lerp(ga.grain, gb.grain, b);
    fin.uExposure.value = lerp(ga.exposure, gb.exposure, b) * (1 + night * 0.25);
    // per-era window lighting / overgrowth
    for (let e = 0; e < 3; e++) {
      const w = ERA_DEF[e].window, U = EU[e];
      U.uLitA.value.copy(w.litA); U.uLitB.value.copy(w.litB);
      U.uLitFrac.value = w.litFrac * (0.25 + 0.75 * clamp(night * 1.3 + (1 - this.sunElev * 3) * 0.2, 0, 1));
      U.uOver.value = w.over; U.uGrime.value = w.grime; U.uBroken.value = w.broken; U.uGlass.value.copy(w.glass);
    }
    // Refresh env map periodically
    this.envTimer -= dt;
    if (this.envDirty || this.envTimer <= 0) {
      this.envTimer = 6;
      this.envDirty = false;
      this.refreshEnv();
    }
  }

  refreshEnv() {
    const old = this.envRT;
    this.envRT = this.pmrem.fromScene(this.envScene, 0, 1, 4000);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.75;
    if (old) old.dispose();
  }
}
