// Scene, camera, sky, sun/moon lighting, fog, bloom.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { AOPass, GradePass, patchHeightFog } from './post.js';
import { lerp, smoothstep } from '../core/math.js';

const SKY_VS = `
varying vec3 vDir;
void main(){
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  gl_Position = p.xyww;
}`;
const SKY_FS = `
uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGround; uniform vec3 uSunDir; uniform vec3 uSunColor;
uniform float uNight; uniform float uTime; uniform float uCloud; uniform vec3 uMoonDir; uniform float uFlash; uniform float uExe; uniform float uEnv;
varying vec3 vDir;
float hash(vec3 p){ p = fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  float a=hash(vec3(i,0.)), b=hash(vec3(i+vec2(1,0),0.)), c=hash(vec3(i+vec2(0,1),0.)), d=hash(vec3(i+vec2(1,1),0.));
  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }
float fbm(vec2 p){ float v=0., a=.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=.5;} return v; }
void main(){
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uTop, pow(clamp(h,0.0,1.0), 0.55));
  col = mix(col, uGround, smoothstep(0.0, -0.12, h));
  float sd = max(dot(d, normalize(uSunDir)), 0.0);
  col += uSunColor * (pow(sd, 900.0) * 18.0 + pow(sd, 12.0) * 0.35 + pow(sd,3.0)*0.12) * (1.0-uCloud*0.7);
  // stars
  if (uNight > 0.01 && h > 0.0 && uEnv < 0.5) {
    vec3 sp = floor(d * 420.0);
    float s = hash(sp);
    float tw = 0.6 + 0.4*sin(uTime*2.0 + s*50.0);
    col += vec3(step(0.9975, s) * tw * uNight * (1.0-uCloud) * 1.6);
  }
  // moon
  float md = max(dot(d, normalize(uMoonDir)), 0.0);
  col += vec3(0.85,0.9,1.0) * (smoothstep(0.9993,0.9996,md)*2.2 + pow(md,40.0)*0.06) * uNight;
  // clouds
  if (h > 0.0) {
    vec2 cp = d.xz / (h + 0.12) * 1.6 + vec2(uTime*0.004, uTime*0.002);
    float c = uEnv > 0.5 ? 0.5 : fbm(cp);
    float cov = mix(0.62, 0.30, uCloud);
    float cl = smoothstep(cov, cov + 0.25, c) * smoothstep(0.0, 0.18, h);
    vec3 cloudCol = mix(uHorizon*1.1 + uSunColor*0.15, vec3(0.55,0.57,0.6)*(1.0-uNight*0.85), uCloud);
    col = mix(col, cloudCol, cl * (0.55 + uCloud*0.4));
  }
  col += vec3(0.75,0.8,1.0) * uFlash;
  if (uExe > 0.0) { col.r += uExe * 0.15 * step(0.995, hash(floor(d*60.0) + floor(uTime*3.0))); }
  gl_FragColor = vec4(col, 1.0);
}`;

export class Renderer {
  constructor(canvas) {
    patchHeightFog();
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.r = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.5, 5000);
    this.camera.position.set(0, 300, 400);
    this.quality = 'high';

    // sky dome
    this.skyU = {
      uTop: { value: new THREE.Color('#3a6fb0') }, uHorizon: { value: new THREE.Color('#bcd4e6') }, uGround: { value: new THREE.Color('#2a2e30') },
      uSunDir: { value: new THREE.Vector3(0.3, 0.6, 0.2) }, uSunColor: { value: new THREE.Color('#fff2d8') }, uNight: { value: 0 }, uTime: { value: 0 },
      uCloud: { value: 0.2 }, uMoonDir: { value: new THREE.Vector3(-0.3, 0.5, -0.4) }, uFlash: { value: 0 }, uExe: { value: 0 }, uEnv: { value: 0 },
    };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false }));
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    this.sky = sky;
    this.scene.add(sky);

    this.hemi = new THREE.HemisphereLight('#bcd8ff', '#4a4038', 0.7);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#fff2d8', 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -170; sc.right = 170; sc.top = 170; sc.bottom = -170; sc.near = 10; sc.far = 900;
    this.sun.shadow.bias = -0.0015;
    this.sun.shadow.normalBias = 1.2;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.scene.fog = new THREE.FogExp2('#bcd4e6', 0.0011);

    // environment map for reflections (regenerated as the sky changes)
    this.pmrem = new THREE.PMREMGenerator(r);
    this.envScene = new THREE.Scene();
    this.envU = { ...this.skyU, uEnv: { value: 1 } };
    this.envSky = new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: this.envU, side: THREE.BackSide, depthWrite: false }));
    this.envScene.add(this.envSky);
    this.envRT = null;
    this.envTimer = 0;

    // post
    const rt = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, { type: THREE.HalfFloatType });
    rt.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
    rt.depthTexture.type = THREE.UnsignedIntType;
    this.composer = new EffectComposer(r, rt);
    // the composer clones its target; a cloned DepthTexture shares the GPU texture, so give each its own
    this.composer.renderTarget2.depthTexture = new THREE.DepthTexture(window.innerWidth, window.innerHeight);
    this.composer.renderTarget2.depthTexture.type = THREE.UnsignedIntType;
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.ao = new AOPass(this.camera);
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.55, 0.5, 0.86);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new GradePass();
    this.composer.addPass(this.grade);

    // shared uniforms for city shaders
    this.U = {
      uNight: { value: 0 }, uTime: { value: 0 }, uWet: { value: 0 }, uSnow: { value: 0 }, uFlash: { value: 0 }, uExe: { value: 0 },
      uDay: { value: 1 },
    };
    this.env = { night: 0, sunUp: 1 };
    let saved = null;
    try { saved = localStorage.getItem('cityexe.quality'); } catch (e) { /* ignore */ }
    if (saved) { this.setQuality(saved); this.qualityChosen = true; }
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setQuality(q) {
    this.quality = q;
    this.r.setPixelRatio(q === 'low' ? 0.75 : Math.min(window.devicePixelRatio || 1, q === 'high' ? 1.5 : 1));
    this.r.shadowMap.enabled = q !== 'low';
    this.sun.castShadow = q !== 'low';
    const size = q === 'high' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.x !== size) { this.sun.shadow.mapSize.set(size, size); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    this.bloom.enabled = q !== 'low';
    this.ao.enabled = q === 'high';
    try { localStorage.setItem('cityexe.quality', q); } catch (e) { /* ignore */ }
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.r.setSize(w, h, false);
    this.composer.setSize(w, h);
    const pr = this.r.getPixelRatio();
    this.ao.setSize(w * pr, h * pr);
    this.grade.setSize(w * pr, h * pr);
    this.bloom.resolution.set(w / 2, h / 2);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Lighting from time of day (minutes 0..1440), season (0..3) and weather {cloud, fog, precip, flash}
  updateEnvironment(minuteOfDay, season, weather, focus, dt) {
    const dayLen = [13.5, 15, 12.5, 10][season] * 60;
    const noon = 13 * 60;
    const rise = noon - dayLen / 2, set = noon + dayLen / 2;
    const t = (minuteOfDay - rise) / (set - rise); // 0 sunrise, 1 sunset
    const ang = t * Math.PI;
    // continuous sun height: sin arc during the day, sinking below the horizon outside it
    const elev = t < 0 ? t * 2.2 : t > 1 ? -(t - 1) * 2.2 : Math.sin(ang);
    const sunDir = new THREE.Vector3(Math.cos(Math.min(Math.max(ang, -0.3), Math.PI + 0.3)) * 0.8, Math.max(-0.35, elev) * 0.95, 0.35).normalize();
    const dayF = smoothstep(-0.1, 0.22, elev);
    const goldenF = 1 - smoothstep(0.0, 0.35, Math.abs(elev));
    const night = 1 - dayF;
    this.env.night = night;
    this.env.dayF = dayF;
    this.env.golden = goldenF;
    const cloud = weather.cloud || 0;
    const U = this.skyU;
    const top = new THREE.Color('#2d64b8').lerp(new THREE.Color('#5a6a7a'), cloud * 0.8);
    const hor = new THREE.Color('#b8d4ea').lerp(new THREE.Color('#9aa4ac'), cloud * 0.8);
    const gold = new THREE.Color('#ff9a50');
    hor.lerp(gold, goldenF * 0.65 * (1 - cloud * 0.7));
    top.lerp(new THREE.Color('#4a5aa0'), goldenF * 0.35);
    const nTop = new THREE.Color('#03060f'), nHor = new THREE.Color('#2a2838');
    if (weather.heat) { hor.lerp(new THREE.Color('#e8c890'), 0.35 * dayF); }
    U.uTop.value.copy(top).lerp(nTop, night);
    U.uHorizon.value.copy(hor).lerp(nHor, night);
    U.uSunDir.value.copy(sunDir);
    U.uSunColor.value.set('#fff0d6').lerp(new THREE.Color('#ff8a40'), goldenF);
    U.uNight.value = night;
    U.uCloud.value = cloud;
    const moon = new THREE.Vector3(-Math.cos(ang) * 0.6, 0.55, -0.4).normalize();
    U.uMoonDir.value.copy(moon);
    U.uFlash.value = weather.flash || 0;
    // sun light
    const sunI = dayF * 3.1 * (1 - cloud * 0.62);
    this.sun.intensity = Math.max(sunI, night * 0.55 * (1 - cloud * 0.4));
    if (dayF > 0.02) this.sun.color.copy(U.uSunColor.value).lerp(new THREE.Color('#ff7a34'), goldenF * 0.35);
    else this.sun.color.set('#7a90d8');
    const lightDir = dayF > 0.02 ? sunDir : moon;
    this.sun.position.set(focus.x + lightDir.x * 400, Math.max(60, lightDir.y * 400), focus.z + lightDir.z * 400);
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.sun.castShadow = this.quality !== 'low' && (dayF > 0.05 || night > 0.95);
    this.hemi.intensity = lerp(0.42, 0.78, dayF) * (1 - cloud * 0.15) + weather.flash * 2;
    // cool sky fill in the shadows, warm bounce from the ground, violet dusk
    this.hemi.color.copy(new THREE.Color('#9cc2ff').lerp(new THREE.Color('#a08ac8'), goldenF * 0.5).lerp(new THREE.Color('#3a4a8a'), night));
    this.hemi.groundColor.copy(new THREE.Color('#6a5a46').lerp(new THREE.Color('#3a2a30'), goldenF * 0.4).lerp(new THREE.Color('#3a2a22'), night));
    // fog
    const fogBase = 0.0009 + cloud * 0.0006 + (weather.fog || 0) * 0.006 + (weather.precip || 0) * 0.0012;
    this.scene.fog.density = fogBase;
    this.scene.fog.color.copy(U.uHorizon.value).lerp(new THREE.Color('#8a9098'), (weather.fog || 0) * 0.5 * dayF);
    // sodium skyglow: at night the haze picks up the city's own light
    this.scene.fog.color.lerp(new THREE.Color('#3a2a26'), night * (0.55 + cloud * 0.3));
    this.r.toneMappingExposure = lerp(1.28, 0.98, dayF) + goldenF * 0.06;
    this.bloom.strength = lerp(0.28, 0.85, night);
    this.bloom.radius = lerp(0.45, 0.6, night);
    this.grade.setMood(this.env, weather);
    this.ao.mat.uniforms.uNight.value = night;
    this.U.uNight.value = night;
    this.U.uDay.value = dayF;
    // env map refresh
    this.envTimer -= dt;
    if (this.envTimer <= 0 || !this.envRT) {
      this.envTimer = 4;
      const old = this.envRT;
      this.envRT = this.pmrem.fromScene(this.envScene, 0, 0.1, 200);
      this.scene.environment = this.envRT.texture;
      if (old) old.dispose();
    }
    this.scene.environmentIntensity = lerp(0.15, 1.0, dayF);
  }

  // render an alternative scene (interiors) or the city (null)
  setScene(scene) {
    this.activeScene = scene;
    this.renderPass.scene = scene || this.scene;
  }

  render(dt) {
    // interiors are exposed on their own terms (no outdoor night boost, gentler bloom)
    if (this.activeScene) { this.r.toneMappingExposure = 1.0; this.bloom.strength = 0.22; this.bloom.threshold = 0.92; }
    else this.bloom.threshold = 0.86;
    this.U.uTime.value += dt;
    this.skyU.uTime.value = this.U.uTime.value;
    this.grade.mat.uniforms.uTime.value = this.U.uTime.value;
    if (this.bloom.enabled) this.composer.render(dt);
    else this.r.render(this.activeScene || this.scene, this.camera);
  }
}
