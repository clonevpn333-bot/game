/* Analytic scattering sky. One inverted sphere, one shader, and the colours the
 * rest of the game lights itself with. Drives the run's day cycle. */
import * as THREE from '../../../../vendor/three/three.module.js';

const VERT = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;

const FRAG = `
varying vec3 vDir;
uniform vec3 uSunDir;
uniform float uTurbidity;
uniform float uExposure;
uniform float uNight;
uniform float uStars;

const vec3 betaR = vec3(5.5e-6, 13.0e-6, 22.4e-6);
const vec3 betaM = vec3(21e-6);
const float g = 0.76;

float rayleighPhase(float c) { return (3.0 / (16.0 * 3.14159)) * (1.0 + c * c); }
float miePhase(float c) {
  float gg = g * g;
  return (1.0 / (4.0 * 3.14159)) * ((1.0 - gg) / pow(1.0 + gg - 2.0 * g * c, 1.5));
}
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }

void main() {
  vec3 dir = normalize(vDir);
  float up = max(dir.y, -0.08);
  float cosT = clamp(dot(dir, uSunDir), -1.0, 1.0);

  float zenith = acos(clamp(up, 0.0, 1.0));
  float sr = 1.0 / (cos(zenith) + 0.15 * pow(93.885 - degrees(zenith), -1.253));
  float sunZ = acos(clamp(uSunDir.y, 0.0, 1.0));
  float sm = 1.0 / (cos(sunZ) + 0.15 * pow(93.885 - degrees(sunZ), -1.253));

  vec3 extinction = exp(-(betaR * 8400.0 * sr + betaM * uTurbidity * 1200.0 * sm));
  vec3 scatter = (betaR * rayleighPhase(cosT) + betaM * uTurbidity * miePhase(cosT))
               / (betaR + betaM * uTurbidity);
  vec3 sky = scatter * (1.0 - extinction) * 12.0;

  // sun disc with a soft limb and a broad glow
  float d = 1.0 - cosT;
  float disc = smoothstep(0.00006, 0.00001, d);
  float glow = pow(max(cosT, 0.0), 900.0) * 0.8 + pow(max(cosT, 0.0), 44.0) * 0.16;
  vec3 sunCol = vec3(1.0, 0.86, 0.66);
  sky += sunCol * (disc * 24.0 + glow * 5.0) * smoothstep(-0.12, 0.06, uSunDir.y);

  // ground haze under the horizon so the world does not end in a hard line
  float below = smoothstep(0.02, -0.14, dir.y);
  sky = mix(sky, mix(sky, vec3(0.30, 0.32, 0.34), 0.72), below);

  // night sky
  float st = step(0.9975, hash(floor(dir * 620.0))) * uStars;
  vec3 night = vec3(0.012, 0.021, 0.05) + vec3(st) * 0.9;
  sky = mix(sky, night + sky * 0.25, uNight);

  gl_FragColor = vec4(sky * uExposure, 1.0);
}`;

export class Sky {
  constructor(scene) {
    this.uniforms = {
      uSunDir: { value: new THREE.Vector3(0.3, 0.4, 0.8).normalize() },
      uTurbidity: { value: 2.6 },
      uExposure: { value: 1.35 },
      uNight: { value: 0 },
      uStars: { value: 0 },
    };
    const geo = new THREE.SphereGeometry(1, 40, 24);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
    scene.add(this.mesh);

    this.sun = new THREE.DirectionalLight(0xffffff, 3.1);
    this.sun.castShadow = true;
    const s = this.sun.shadow;
    s.mapSize.set(2048, 2048);
    s.camera.near = 1; s.camera.far = 900;
    s.camera.left = -230; s.camera.right = 230; s.camera.top = 230; s.camera.bottom = -230;
    s.bias = -0.0009; s.normalBias = 0.42;
    scene.add(this.sun, this.sun.target);

    this.hemi = new THREE.HemisphereLight(0xbfd6ff, 0x6b5340, 1.1);
    scene.add(this.hemi);
    this.bounce = new THREE.DirectionalLight(0x8fb0d8, 0.35);
    scene.add(this.bounce);

    this.sunColor = new THREE.Color(1, 1, 1);
    this.fogColor = new THREE.Color(0.6, 0.7, 0.82);
    this.setTime(0.28);
  }

  /** t in 0..1 across a day. 0.25 = sunrise, 0.5 = noon, 0.78 = sunset. */
  setTime(t) {
    this.t = t;
    const a = (t - 0.25) * Math.PI * 2;
    const elev = Math.sin(a);
    const azi = t * Math.PI * 2 * 0.35 + 0.7;
    const dir = new THREE.Vector3(Math.cos(azi) * Math.cos(a * 0.0 + 0.0) * 0.9, elev, Math.sin(azi) * 0.9).normalize();
    this.uniforms.uSunDir.value.copy(dir);
    this.uniforms.uTurbidity.value = 2.2 + Math.max(0, 1 - Math.abs(elev)) * 3.4;

    const night = THREE.MathUtils.smoothstep(-elev, 0.02, 0.24);
    this.uniforms.uNight.value = night;
    this.uniforms.uStars.value = night;

    // warm at the horizon, neutral overhead
    const warm = Math.pow(Math.max(0, 1 - Math.max(elev, 0)), 2.2);
    this.sunColor.setRGB(1.0, 0.94 - warm * 0.30, 0.86 - warm * 0.56);
    this.sun.color.copy(this.sunColor);
    this.sun.intensity = Math.max(0, elev + 0.06) * 4.8;
    this.sun.position.copy(dir).multiplyScalar(180);

    this.hemi.intensity = 0.52 + Math.max(0, elev) * 0.92;
    this.hemi.color.setRGB(0.62 + warm * 0.28, 0.72 - warm * 0.06, 0.95 - warm * 0.2);
    this.hemi.groundColor.setRGB(0.28, 0.22, 0.18);
    this.bounce.position.set(-dir.x, 0.25, -dir.z).multiplyScalar(100);
    this.bounce.intensity = 0.26 + Math.max(0, elev) * 0.45;

    this.fogColor.setRGB(
      0.50 + warm * 0.34 - night * 0.44,
      0.60 + warm * 0.10 - night * 0.52,
      0.74 - warm * 0.16 - night * 0.60,
    );
    this.fogColor.r = Math.max(0.02, this.fogColor.r);
    this.fogColor.g = Math.max(0.03, this.fogColor.g);
    this.fogColor.b = Math.max(0.06, this.fogColor.b);
  }

  /** Keeps the shadow frustum wrapped tightly around the player. */
  follow(target) {
    const d = this.uniforms.uSunDir.value;
    this.sun.position.set(target.x + d.x * 320, target.y + d.y * 320, target.z + d.z * 320);
    this.sun.target.position.copy(target);
    this.sun.target.updateMatrixWorld();
    this.mesh.position.copy(target);
  }

  get sunDir() { return this.uniforms.uSunDir.value; }
}
