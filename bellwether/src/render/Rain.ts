import * as THREE from 'three';
import { G } from './Globals';

/**
 * GPU rain: instanced streaks wrapped in a box that follows the camera.
 * G.uRainDir = 1 falls down, -1 falls up (final act).
 */
export class Rain {
  readonly group = new THREE.Group();
  private streaks: THREE.InstancedMesh;
  private splashes: THREE.InstancedMesh;
  private uniforms = {
    uTime: G.uTime,
    uDir: G.uRainDir,
    uCenter: { value: new THREE.Vector3() },
    uBox: { value: new THREE.Vector3(30, 18, 30) },
    uSpeed: { value: 16 },
    uWind: { value: new THREE.Vector2(1.2, 0.4) },
    uIntensity: { value: 1 },
    uColor: { value: new THREE.Color(0.55, 0.62, 0.72) },
    uGround: { value: 0 },
    uEcho: G.uEcho,
  };
  private splashU = {
    uTime: G.uTime,
    uCenter: { value: new THREE.Vector3() },
    uGround: { value: 0 },
    uIntensity: { value: 1 },
  };
  intensity = 1;
  groundY = 0;

  constructor(count = 9000) {
    const geo = new THREE.PlaneGeometry(0.018, 0.9);
    geo.translate(0, 0.45, 0);
    const offsets = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      offsets[i * 4] = Math.random();
      offsets[i * 4 + 1] = Math.random();
      offsets[i * 4 + 2] = Math.random();
      offsets[i * 4 + 3] = 0.6 + Math.random() * 0.8;
    }
    geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(offsets, 4));
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec4 aOff;
        uniform float uTime, uDir, uSpeed, uIntensity, uEcho;
        uniform vec3 uCenter, uBox;
        uniform vec2 uWind;
        varying float vA; varying float vY;
        void main(){
          float speed = uSpeed * aOff.w;
          vec3 base = (aOff.xyz - 0.5) * uBox * 2.0;
          float fall = uTime * speed * uDir * (1.0 - uEcho * 0.92);
          vec3 p = base;
          p.y -= fall;
          p.xz += uWind * (fall / uSpeed);
          // wrap into box around camera
          p = mod(p - uCenter + uBox, uBox * 2.0) - uBox + uCenter;
          // billboard around Y towards camera, stretched along velocity
          vec3 vel = normalize(vec3(uWind.x * uDir, -uSpeed * uDir, uWind.y * uDir));
          vec3 toCam = normalize(cameraPosition - p);
          vec3 side = normalize(cross(vel, toCam));
          vec3 wp = p + side * position.x - vel * position.y * (0.7 + aOff.w * 0.5);
          float d = distance(p, cameraPosition);
          vA = smoothstep(uBox.x, 2.0, d) * smoothstep(0.4, 2.0, d) * uIntensity * (0.25 + aOff.w * 0.25);
          vY = position.y / 0.9;
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vA; varying float vY;
        void main(){
          float a = vA * smoothstep(0.0, 0.5, vY) * smoothstep(1.0, 0.6, vY);
          gl_FragColor = vec4(uColor * a, a);
        }`,
    });
    this.streaks = new THREE.InstancedMesh(geo, mat, count);
    this.streaks.frustumCulled = false;
    const id = new THREE.Matrix4();
    for (let i = 0; i < count; i++) this.streaks.setMatrixAt(i, id);
    this.group.add(this.streaks);

    // splash rings on the ground
    const sc = 600;
    const sgeo = new THREE.RingGeometry(0.02, 0.06, 12);
    sgeo.rotateX(-Math.PI / 2);
    const soff = new Float32Array(sc * 3);
    for (let i = 0; i < sc; i++) {
      soff[i * 3] = Math.random();
      soff[i * 3 + 1] = Math.random();
      soff[i * 3 + 2] = Math.random();
    }
    sgeo.setAttribute('aOff', new THREE.InstancedBufferAttribute(soff, 3));
    const smat = new THREE.ShaderMaterial({
      uniforms: this.splashU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute vec3 aOff;
        uniform float uTime, uGround, uIntensity;
        uniform vec3 uCenter;
        varying float vA;
        void main(){
          float cycle = 0.55;
          float t = uTime / cycle + aOff.z * 10.0;
          float k = fract(t);
          float id = floor(t);
          vec2 rnd = fract(sin(vec2(id * 12.9898 + aOff.x * 78.2, id * 39.34 + aOff.y * 11.1)) * 43758.5453);
          vec3 p = vec3(uCenter.x + (rnd.x - 0.5) * 24.0, uGround + 0.015, uCenter.z + (rnd.y - 0.5) * 24.0);
          vec3 wp = p + position * (0.3 + k * 2.2);
          vA = (1.0 - k) * 0.35 * uIntensity;
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main(){ gl_FragColor = vec4(vec3(0.6, 0.68, 0.8) * vA, vA); }`,
    });
    this.splashes = new THREE.InstancedMesh(sgeo, smat, sc);
    this.splashes.frustumCulled = false;
    for (let i = 0; i < sc; i++) this.splashes.setMatrixAt(i, id);
    this.group.add(this.splashes);
  }

  setColor(c: THREE.ColorRepresentation): void {
    this.uniforms.uColor.value.set(c);
  }

  update(camera: THREE.Camera, indoorFactor = 0): void {
    this.uniforms.uCenter.value.copy(camera.position);
    this.splashU.uCenter.value.copy(camera.position);
    this.splashU.uGround.value = this.groundY;
    const k = this.intensity * (1 - indoorFactor);
    this.uniforms.uIntensity.value = k;
    this.splashU.uIntensity.value = G.uRainDir.value > 0 ? k : 0;
    this.group.visible = k > 0.01;
  }
}
