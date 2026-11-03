// GETAWAY! — sky dome, sun/moon lighting, day-night cycle, weather (rain, storm, fog), environment reflections
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, lerp, smoothstep, rand } from '../core/utils.js';

const SKY_VS = `varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position,0.0)).xyz); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`;
const SKY_FS = `
uniform vec3 zenith; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunColor; uniform float stars; uniform float clouds; uniform float time; uniform float overcast; uniform vec3 moonDir;
varying vec3 vDir;
float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f); return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=0.5, s=0.0; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=0.5; } return s; }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 col = mix(horizon, zenith, pow(clamp(h,0.0,1.0), 0.55));
  col = mix(col, ground, smoothstep(0.0,-0.25,h));
  float sd = max(dot(d, sunDir), 0.0);
  col += sunColor * (pow(sd, 900.0)*25.0 + pow(sd, 12.0)*0.35 + pow(sd,3.0)*0.12) * (1.0-overcast*0.85);
  float md = max(dot(d, moonDir), 0.0); col += vec3(0.8,0.85,1.0) * pow(md, 1500.0) * 6.0 * stars;
  if (h > 0.0) {
    float st = step(0.9975, hash(floor(d*420.0))); col += vec3(st) * stars * smoothstep(0.0,0.3,h) * (1.0-overcast);
    vec2 uv = d.xz / (h + 0.18);
    float c = fbm(vec3(uv*1.6 + vec2(time*0.004, time*0.002), time*0.003));
    float cov = mix(0.55, 0.15, clouds); float cm = smoothstep(cov, cov+0.35, c) * smoothstep(0.0, 0.12, h);
    vec3 cc = mix(vec3(1.0), sunColor, 0.35) * (0.55 + 0.6*pow(sd,4.0)) ; cc = mix(cc, horizon*0.8, 0.3);
    cc = mix(cc, vec3(0.42,0.44,0.48)*(0.3+0.7*length(zenith)), overcast*0.8);
    col = mix(col, cc, cm * 0.9);
    col = mix(col, mix(horizon, vec3(0.5,0.52,0.55)*(0.25+length(zenith)*0.6), 0.6), overcast*0.75);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

const KEYS = [ // by sun elevation (degrees)
  { e: -18, zen: 0x03060f, hor: 0x0b1222, sun: 0x000000, si: 0, hemiS: 0x24325a, hemiG: 0x0a0b10, hi: 0.32, fog: 0x0d1424, exp: 1.15 },
  { e: -4, zen: 0x101a3a, hor: 0x3a3352, sun: 0xff6a3a, si: 0.05, hemiS: 0x3a4170, hemiG: 0x1a1414, hi: 0.4, fog: 0x2a2840, exp: 1.1 },
  { e: 3, zen: 0x2c3f7a, hor: 0xf5864c, sun: 0xff8c4a, si: 1.6, hemiS: 0x7a7ab0, hemiG: 0x40302a, hi: 0.55, fog: 0xc8846a, exp: 1.0 },
  { e: 12, zen: 0x3a64b8, hor: 0xf2c095, sun: 0xffc488, si: 2.6, hemiS: 0x9ab6e0, hemiG: 0x5a4a3a, hi: 0.7, fog: 0xd8c0a8, exp: 0.95 },
  { e: 35, zen: 0x2d68c9, hor: 0xa8cdea, sun: 0xfff2dc, si: 3.3, hemiS: 0xb8d4f0, hemiG: 0x6a5e50, hi: 0.85, fog: 0xb5cde0, exp: 0.9 },
  { e: 90, zen: 0x2563c7, hor: 0x9cc6ea, sun: 0xffffff, si: 3.5, hemiS: 0xc0daf4, hemiG: 0x6a6052, hi: 0.9, fog: 0xb0c8dc, exp: 0.88 },
];
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function lerpKey(e, field, out) { let i = 0; while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++; const a = KEYS[i], b = KEYS[i + 1]; const t = clamp((e - a.e) / (b.e - a.e), 0, 1); if (typeof a[field] === 'number' && out === undefined) return lerp(a[field], b[field], t); _c1.set(a[field]); _c2.set(b[field]); return out.copy(_c1).lerp(_c2, t); }

export const WEATHERS = ['clear', 'cloudy', 'rain', 'storm', 'fog'];

export class Sky {
  constructor(scene, renderer) {
    this.scene = scene; this.renderer = renderer; this.hour = 17.5; this.dayScale = 1 / 60 * 24 / 24; // game hours per real second
    this.running = true; this.weather = 'clear'; this.w = { clouds: 0.3, overcast: 0, rain: 0, fog: 0, wet: 0, lightning: 0 }; this.wTarget = { ...this.w };
    this.uniforms = { zenith: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, ground: { value: new THREE.Color(0x2a2a2e) }, sunDir: { value: new THREE.Vector3() }, moonDir: { value: new THREE.Vector3() }, sunColor: { value: new THREE.Color() }, stars: { value: 0 }, clouds: { value: 0.3 }, time: { value: 0 }, overcast: { value: 0 } };
    const mat = new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), mat); this.dome.renderOrder = -10; this.dome.frustumCulled = false; scene.add(this.dome);
    this.sun = new THREE.DirectionalLight(0xffffff, 3); this.sun.castShadow = true;
    const hq = G.settings && (G.settings.quality === 'high' || G.settings.quality === 'ultra'); this.sun.shadow.mapSize.set(hq ? 2048 : 1024, hq ? 2048 : 1024); const sc = this.sun.shadow.camera; sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; this.sun.shadow.radius = 3; sc.near = 10; sc.far = 600;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.6; scene.add(this.sun); scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbcd, 0x554, 0.8); scene.add(this.hemi);
    scene.fog = new THREE.Fog(0xb0c8dc, 200, 2200);
    this.night = 0; this.day = 1; this.flash = 0; this.lightningT = 5;
    // env map generation
    this.pmrem = new THREE.PMREMGenerator(renderer); this.envScene = new THREE.Scene();
    const envDome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), mat.clone()); envDome.material.uniforms = this.uniforms; this.envScene.add(envDome);
    this.envT = 0; this.envRT = null;
    // rain streaks around camera
    const N = 5000; const g = new THREE.BufferGeometry(); const p = new Float32Array(N * 6); this.rainV = new Float32Array(N);
    for (let i = 0; i < N; i++) { const x = rand(-40, 40), y = rand(-5, 35), z = rand(-40, 40); p.set([x, y, z, x, y - 0.6, z], i * 6); this.rainV[i] = rand(18, 26); }
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaab4c4, transparent: true, opacity: 0.35, depthWrite: false })); this.rain.frustumCulled = false; this.rain.visible = false; scene.add(this.rain);
    this.wetMats = []; this.nightMats = [];
    this.update(0, new THREE.Vector3(), new THREE.Vector3());
  }
  setTime(h) { this.hour = ((h % 24) + 24) % 24; this.envT = 0; this._envSig = -99; }
  setWeather(name, instant = false) {
    this.weather = name; const t = this.wTarget;
    Object.assign(t, { clear: { clouds: 0.25, overcast: 0, rain: 0, fog: 0, wet: 0, lightning: 0 }, cloudy: { clouds: 0.85, overcast: 0.35, rain: 0, fog: 0.1, wet: 0, lightning: 0 }, rain: { clouds: 1, overcast: 0.8, rain: 0.7, fog: 0.25, wet: 1, lightning: 0 }, storm: { clouds: 1, overcast: 1, rain: 1, fog: 0.35, wet: 1, lightning: 1 }, fog: { clouds: 0.6, overcast: 0.6, rain: 0, fog: 1, wet: 0.3, lightning: 0 } }[name] || {});
    if (instant) Object.assign(this.w, t);
    this.envT = 0;
  }
  registerWet(mats) { for (const m of mats) { m.userData.dryRough = m.roughness; m.userData.dryColor = m.color.clone(); this.wetMats.push(m); } }
  update(dt, focus, camPos, audio) {
    if (this.running) this.hour = (this.hour + dt * this.dayScale) % 24;
    const w = this.w, wt = this.wTarget; for (const k in w) w[k] = lerp(w[k], wt[k], 1 - Math.exp(-dt * 0.25));
    const ang = (this.hour - 6) / 24 * Math.PI * 2; // sunrise at 6, sunset at 18
    const elev = Math.sin(ang) * 72; const er = elev * Math.PI / 180; const az = ang * 0.9 + 0.6;
    const sd = this.uniforms.sunDir.value.set(Math.cos(az) * Math.cos(er), Math.sin(er), Math.sin(az) * Math.cos(er) * 0.6 + 0.35).normalize();
    const md = this.uniforms.moonDir.value.set(-sd.x, Math.max(0.25, -sd.y), -sd.z).normalize();
    this.elev = elev;
    lerpKey(elev, 'zen', this.uniforms.zenith.value); lerpKey(elev, 'hor', this.uniforms.horizon.value); lerpKey(elev, 'sun', this.uniforms.sunColor.value);
    const ovc = w.overcast; this.uniforms.zenith.value.multiplyScalar(1 - ovc * 0.45); this.uniforms.horizon.value.lerp(_c1.set(0x7d8590).multiplyScalar(0.25 + 0.75 * clamp((elev + 6) / 20, 0, 1)), ovc * 0.6);
    this.night = 1 - smoothstep(-8, 6, elev); this.day = 1 - this.night;
    this.uniforms.stars.value = this.night; this.uniforms.clouds.value = w.clouds; this.uniforms.overcast.value = ovc; this.uniforms.time.value += dt;
    const si = lerpKey(elev, 'si') * (1 - ovc * 0.7);
    // sun or moon light
    const useMoon = elev < -2; const ld = useMoon ? md : sd;
    this.sun.color.copy(useMoon ? _c2.set(0x8fa6d8) : this.uniforms.sunColor.value);
    this.sun.intensity = useMoon ? 0.35 * (1 - ovc * 0.6) : si; this.sun.intensity += this.flash * 6;
    this.sun.position.set(focus.x + ld.x * 300, focus.y + ld.y * 300, focus.z + ld.z * 300); this.sun.target.position.copy(focus);
    // snap shadow camera to texels to avoid shimmering
    this.sun.target.updateMatrixWorld();
    lerpKey(elev, 'hemiS', this.hemi.color); lerpKey(elev, 'hemiG', this.hemi.groundColor); this.hemi.intensity = lerpKey(elev, 'hi') * (1 - ovc * 0.25) + this.flash * 2;
    const fog = this.scene.fog; lerpKey(elev, 'fog', fog.color); fog.color.lerp(_c1.set(0x8a9098).multiplyScalar(0.3 + 0.7 * this.day), ovc * 0.6);
    fog.near = lerp(220, 15, w.fog); fog.far = lerp(2600, 260, w.fog) * (1 - w.rain * 0.4);
    this.uniforms.ground.value.copy(fog.color).multiplyScalar(0.6);
    this.renderer.toneMappingExposure = lerpKey(elev, 'exp') * (1 + this.flash * 0.6);
    // emissive night materials
    const ni = this.night * 0.95 + ovc * 0.25 * this.day;
    for (const m of this.nightMats) m.emissiveIntensity = (m.userData.day || 0) + ni * (m.userData.night || 1);
    // wet surfaces
    for (const m of this.wetMats) { m.roughness = lerp(m.userData.dryRough, 0.22, w.wet); m.color.copy(m.userData.dryColor).multiplyScalar(1 - w.wet * 0.35); }
    // lightning
    this.flash = Math.max(0, this.flash - dt * 4);
    if (w.lightning > 0.5) { this.lightningT -= dt; if (this.lightningT < 0) { this.lightningT = rand(4, 14); this.flash = 1; if (audio) audio.thunder(rand(0.4, 2.5)); } }
    // rain
    this.rain.visible = w.rain > 0.05; if (this.rain.visible) {
      this.rain.position.set(camPos.x, camPos.y, camPos.z); this.rain.material.opacity = 0.35 * w.rain;
      const p = this.rain.geometry.attributes.position.array; const n = this.rainV.length; const lim = Math.floor(n * w.rain);
      for (let i = 0; i < n; i++) { const o = i * 6; if (i > lim) { p[o + 1] = p[o + 4] = -100; continue; } let y = p[o + 1] - this.rainV[i] * dt; if (y < -5) { y += 40; p[o] = p[o + 3] = rand(-40, 40); p[o + 2] = p[o + 5] = rand(-40, 40); } p[o + 1] = y; p[o + 4] = y - 0.7; p[o + 3] = p[o] - 0.05; }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    // environment map refresh
    this.envT -= dt; const sig = this.hour * 4 + this.w.overcast * 10 + this.w.rain * 10; if (this.envT <= 0 && Math.abs(sig - (this._envSig ?? -99)) > 1) { this.envT = 2; this._envSig = sig; this.refreshEnv(); }
    return this;
  }
  refreshEnv() {
    const rt = this.pmrem.fromScene(this.envScene, 0, 0.1, 200);
    if (this.envRT) this.envRT.dispose(); this.envRT = rt; this.scene.environment = rt.texture;
    this.scene.environmentIntensity = 0.35 + this.day * 0.65;
  }
  get isNight() { return this.night > 0.5; }
}
