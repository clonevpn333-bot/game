/* Cloud decks you climb through, and the sea of cloud that sits below you once
 * you are high enough to look down on it. One instanced draw call per layer. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { cloudSprite } from './textures.js';
import { rng } from '../../shared/rng.js';

const VERT = `
attribute vec3 iOffset;
attribute vec2 iScale;
attribute float iSeed;
attribute float iAlpha;
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
uniform float uTime;
uniform vec3 uWind;
void main() {
  vUv = uv;
  vSeed = iSeed;
  vec3 world = iOffset + uWind * uTime * (0.6 + iSeed * 0.8);
  // wrap the drift so a layer never runs out of cloud
  world.x = mod(world.x + 6000.0, 12000.0) - 6000.0;
  world.z = mod(world.z + 6000.0, 12000.0) - 6000.0;
  world.y += sin(uTime * 0.09 + iSeed * 6.28) * 6.0;
  vec3 toCam = cameraPosition - world;
  float d = length(toCam);
  vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
  vec3 up = normalize(cross(toCam, right));
  vec3 pos = world + right * position.x * iScale.x + up * position.y * iScale.y;
  // fade out when the camera is inside the puff, fade in at the far edge
  vAlpha = iAlpha * smoothstep(6.0, 60.0, d) * (1.0 - smoothstep(3200.0, 5200.0, d));
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
}`;

const FRAG = `
varying vec2 vUv;
varying float vAlpha;
varying float vSeed;
uniform sampler2D uMap;
uniform vec3 uSunColor;
uniform vec3 uShadeColor;
uniform vec3 uSunDir;
void main() {
  vec4 t = texture2D(uMap, vUv);
  if (t.a * vAlpha < 0.004) discard;
  float lit = smoothstep(0.0, 1.0, vUv.y * 0.7 + 0.3 + uSunDir.y * 0.3);
  vec3 col = mix(uShadeColor, uSunColor, lit);
  gl_FragColor = vec4(col, t.a * vAlpha);
}`;

function layer(count, opts, seed) {
  const r = rng(seed);
  const geo = new THREE.InstancedBufferGeometry();
  const plane = new THREE.PlaneGeometry(1, 1);
  geo.index = plane.index;
  geo.attributes.position = plane.attributes.position;
  geo.attributes.uv = plane.attributes.uv;
  geo.instanceCount = count;

  const off = new Float32Array(count * 3), sc = new Float32Array(count * 2);
  const sd = new Float32Array(count), al = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const rad = opts.inner + Math.pow(r(), opts.pow ?? 0.6) * (opts.outer - opts.inner);
    off[i * 3] = Math.cos(a) * rad;
    off[i * 3 + 1] = opts.y + (r() - 0.5) * opts.spread;
    off[i * 3 + 2] = Math.sin(a) * rad;
    const s = opts.size * (0.55 + r() * 0.9);
    sc[i * 2] = s; sc[i * 2 + 1] = s * (0.42 + r() * 0.3);
    sd[i] = r();
    al[i] = opts.alpha * (0.6 + r() * 0.5);
  }
  geo.setAttribute('iOffset', new THREE.InstancedBufferAttribute(off, 3));
  geo.setAttribute('iScale', new THREE.InstancedBufferAttribute(sc, 2));
  geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(sd, 1));
  geo.setAttribute('iAlpha', new THREE.InstancedBufferAttribute(al, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, opts.y, 0), 9000);
  return geo;
}

export class Clouds {
  constructor(scene, seed = 7) {
    this.uniforms = {
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector3(2.1, 0, 0.9) },
      uMap: { value: cloudSprite(seed) },
      uSunColor: { value: new THREE.Color(1, 0.96, 0.9) },
      uShadeColor: { value: new THREE.Color(0.42, 0.48, 0.6) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
    });
    this.material = mat;

    const decks = [
      { count: 120, y: 265, spread: 70, inner: 700, outer: 5600, size: 760, alpha: 0.62, pow: 0.45 },  // the sea below
      { count: 64, y: 640, spread: 130, inner: 200, outer: 2600, size: 340, alpha: 0.5 },
      { count: 54, y: 1000, spread: 150, inner: 160, outer: 1900, size: 270, alpha: 0.42 },
      { count: 40, y: 1330, spread: 170, inner: 120, outer: 1300, size: 210, alpha: 0.34 },
    ];
    this.meshes = decks.map((d, i) => {
      const m = new THREE.Mesh(layer(d.count, d, seed + i * 31), mat);
      m.frustumCulled = false;
      m.renderOrder = 20 + i;
      m.userData.band = d;
      scene.add(m);
      return m;
    });
  }

  /** Returns how deep inside a cloud deck the camera is, 0..1 — used to thicken fog. */
  update(dt, camY, sky) {
    this.uniforms.uTime.value += dt;
    this.uniforms.uSunColor.value.copy(sky.sunColor).multiplyScalar(1.05);
    this.uniforms.uShadeColor.value.copy(sky.fogColor).multiplyScalar(0.85);
    this.uniforms.uSunDir.value.copy(sky.sunDir);
    let inside = 0;
    for (const m of this.meshes) {
      const b = m.userData.band;
      const d = Math.abs(camY - b.y) / (b.spread * 0.85 + 40);
      inside = Math.max(inside, 1 - Math.min(1, d));
    }
    return inside;
  }

  dispose() { for (const m of this.meshes) { m.geometry.dispose(); m.parent?.remove(m); } this.material.dispose(); }
}
