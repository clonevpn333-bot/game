import * as THREE from 'three';
import { Tex } from '../world/Textures';
import type { TorchSpot } from '../world/Terrain';

/**
 * Many torches, few real lights. All flames render in one Points draw call; a small pool of
 * PointLights is reassigned to the torches nearest the player so firelight stays local and cheap.
 */
export class LightPool {
  readonly group = new THREE.Group();
  private readonly lights: THREE.PointLight[] = [];
  private readonly flames: THREE.Points;
  private readonly halos: THREE.Points;
  private readonly uniforms = { uTime: { value: 0 }, uMap: { value: Tex.flame() as THREE.Texture }, uTint: { value: new THREE.Color(1, 1, 1) } };
  private timer = 0;
  private readonly spots: THREE.Vector3[];
  private readonly lit: Float32Array;

  constructor(spots: TorchSpot[], lanterns: THREE.Vector3[], count = 7, private readonly tint = '#ff9a48') {
    this.spots = spots.map((s) => s.pos);
    const all = [...this.spots, ...lanterns];
    const pos = new Float32Array(all.length * 3);
    const seed = new Float32Array(all.length);
    const kind = new Float32Array(all.length);
    this.lit = new Float32Array(all.length).fill(1);
    all.forEach((p, i) => {
      pos.set([p.x, p.y, p.z], i * 3);
      seed[i] = (i * 0.618) % 1;
      kind[i] = i >= this.spots.length ? 1 : 0;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    g.setAttribute('aKind', new THREE.BufferAttribute(kind, 1));
    g.setAttribute('aLit', new THREE.BufferAttribute(this.lit, 1));
    this.flames = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSeed; attribute float aKind; attribute float aLit; uniform float uTime; varying float vF; varying float vK;
          void main(){ vK = aKind; float fl = 0.8 + 0.2 * sin(uTime * 13.0 + aSeed * 60.0) * sin(uTime * 7.3 + aSeed * 20.0);
            vF = fl * aLit; vec4 mv = modelViewMatrix * vec4(position + vec3(0.0, 0.18, 0.0), 1.0);
            gl_PointSize = (aKind > 0.5 ? 0.5 : 1.1) * fl * (300.0 / -mv.z) * aLit; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D uMap; uniform vec3 uTint; varying float vF; varying float vK;
          void main(){ vec4 c = texture2D(uMap, vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y));
            if (vK > 0.5) { float d = length(gl_PointCoord - 0.5); c = vec4(vec3(1.0, 0.7, 0.35) * smoothstep(0.5, 0.0, d) * 1.6, 1.0); }
            gl_FragColor = vec4(c.rgb * uTint * c.a * vF * 1.8, 1.0); }`,
      }),
    );
    this.flames.frustumCulled = false;
    this.halos = new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        uniforms: this.uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSeed; attribute float aLit; uniform float uTime; varying float vF;
          void main(){ vF = (0.85 + 0.15 * sin(uTime * 9.0 + aSeed * 40.0)) * aLit; vec4 mv = modelViewMatrix * vec4(position,1.0);
            gl_PointSize = 5.0 * (300.0 / -mv.z) * aLit; gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `varying float vF; void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(smoothstep(0.5, 0.0, d), 2.5) * 0.22 * vF;
          gl_FragColor = vec4(vec3(1.0, 0.55, 0.22) * a, 1.0); }`,
      }),
    );
    this.halos.frustumCulled = false;
    this.group.add(this.halos, this.flames);
    if (this.tint !== '#ff9a48') this.uniforms.uTint.value.set(this.tint).multiplyScalar(1.4);
    for (let i = 0; i < count; i += 1) {
      const l = new THREE.PointLight(this.tint, 0, 16, 1.6);
      this.lights.push(l);
      this.group.add(l);
    }
  }

  setLit(index: number, on: boolean): void {
    if (index < 0 || index >= this.lit.length) return;
    this.lit[index] = on ? 1 : 0;
    (this.flames.geometry.attributes.aLit as THREE.BufferAttribute).needsUpdate = true;
  }

  update(dt: number, time: number, focus: THREE.Vector3, intensity = 1): void {
    this.uniforms.uTime.value = time;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = 0.3;
      const sorted = this.spots
        .map((p, i) => ({ i, d: p.distanceToSquared(focus) }))
        .filter((x) => this.lit[x.i] > 0.5)
        .sort((a, b) => a.d - b.d);
      this.lights.forEach((l, k) => {
        const s = sorted[k];
        if (s && s.d < 70 * 70) {
          l.position.copy(this.spots[s.i]);
          l.userData.on = true;
        } else l.userData.on = false;
      });
    }
    this.lights.forEach((l, k) => {
      const flick = 0.85 + 0.15 * Math.sin(time * 11 + k * 3) * Math.sin(time * 5.3 + k);
      const target = l.userData.on ? 26 * flick * intensity : 0;
      l.intensity += (target - l.intensity) * Math.min(1, dt * 6);
    });
  }
}
