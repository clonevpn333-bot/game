import * as THREE from 'three';
import { createSeededRandom } from '../core/rng';
import { DREAM_FOG_PARS, dreamUniforms } from '../render/DreamShading';

const POINT_VERT = /* glsl */ `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
varying float vAlpha;
varying vec3 vColor;
varying vec3 vWorld;
uniform float uScale;
void main(){
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mv = viewMatrix * wp;
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const POINT_FRAG = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
varying vec3 vWorld;
uniform float uFogAffect;
${DREAM_FOG_PARS}
void main(){
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  if (a * vAlpha < 0.003) discard;
  float f = dreamFogAmount(vWorld) * uFogAffect;
  gl_FragColor = vec4(vColor * (1.0 - f), a * vAlpha);
}`;

function pointsMaterial(additive: boolean, fogAffect = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: {
      uScale: { value: 300 },
      uFogAffect: { value: fogAffect },
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
  });
}

export type MoteKind = 'pollen' | 'dust' | 'static' | 'bubbles' | 'petals' | 'embers' | 'snow' | 'none';

interface Ring {
  mesh: THREE.Mesh;
  t: number;
  dur: number;
  maxR: number;
  active: boolean;
}

export class Vfx {
  readonly group = new THREE.Group();
  private readonly N = 1500;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly size0: Float32Array;
  private readonly drag: Float32Array;
  private readonly grav: Float32Array;
  private readonly geo = new THREE.BufferGeometry();
  private readonly mat = pointsMaterial(true, 0.6);
  private next = 0;
  private readonly rnd = createSeededRandom(99);

  // ambient motes
  private readonly moteN = 420;
  private readonly moteGeo = new THREE.BufferGeometry();
  private readonly moteMat = pointsMaterial(false, 0.4);
  private readonly motes: THREE.Points;
  private moteKind: MoteKind = 'pollen';
  private readonly moteVel: Float32Array;
  private readonly moteBox = 22;

  private readonly rings: Ring[] = [];
  private readonly ringGeo = new THREE.RingGeometry(0.92, 1, 64);
  readonly beacons: THREE.Mesh[] = [];
  private readonly beaconMat: THREE.ShaderMaterial;

  constructor() {
    this.pos = new Float32Array(this.N * 3);
    this.vel = new Float32Array(this.N * 3);
    this.life = new Float32Array(this.N);
    this.maxLife = new Float32Array(this.N);
    this.size0 = new Float32Array(this.N);
    this.drag = new Float32Array(this.N);
    this.grav = new Float32Array(this.N);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(this.N), 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(this.N), 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(this.N * 3), 3).setUsage(THREE.DynamicDrawUsage));
    const pts = new THREE.Points(this.geo, this.mat);
    pts.frustumCulled = false;
    pts.renderOrder = 5;
    this.group.add(pts);

    const mp = new Float32Array(this.moteN * 3);
    this.moteVel = new Float32Array(this.moteN * 3);
    for (let i = 0; i < this.moteN; i++) {
      mp.set([(this.rnd() - 0.5) * this.moteBox, (this.rnd() - 0.5) * this.moteBox * 0.6, (this.rnd() - 0.5) * this.moteBox], i * 3);
    }
    this.moteGeo.setAttribute('position', new THREE.BufferAttribute(mp, 3).setUsage(THREE.DynamicDrawUsage));
    this.moteGeo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(this.moteN), 1));
    this.moteGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(this.moteN), 1));
    this.moteGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(this.moteN * 3), 3));
    this.motes = new THREE.Points(this.moteGeo, this.moteMat);
    this.motes.frustumCulled = false;
    this.group.add(this.motes);

    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      m.visible = false;
      m.rotation.x = -Math.PI / 2;
      this.group.add(m);
      this.rings.push({ mesh: m, t: 0, dur: 1, maxR: 6, active: false });
    }

    this.beaconMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: { uTime: dreamUniforms.uTime, uColor: { value: new THREE.Color('#ffe2a8') } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float uTime; uniform vec3 uColor;
        void main(){
          float edge = sin(vUv.x * 3.14159);
          float fade = pow(1.0 - vUv.y, 1.6);
          float band = 0.75 + 0.25 * sin(vUv.y * 30.0 - uTime * 3.0);
          gl_FragColor = vec4(uColor * 1.6, edge * edge * fade * band * 0.55);
        }`,
    });
  }

  /** Light pillar visible through fog; used for waypoints and anchors. */
  beacon(color: THREE.ColorRepresentation, height = 40, radius = 0.6): THREE.Mesh {
    const mat = this.beaconMat.clone();
    mat.uniforms.uTime = dreamUniforms.uTime;
    mat.uniforms.uColor.value = new THREE.Color(color);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.4, height, 24, 1, true), mat);
    m.geometry.translate(0, height / 2, 0);
    m.renderOrder = 6;
    this.group.add(m);
    this.beacons.push(m);
    return m;
  }

  clearBeacons(): void {
    for (const b of this.beacons) {
      b.removeFromParent();
      b.geometry.dispose();
      (b.material as THREE.Material).dispose();
    }
    this.beacons.length = 0;
  }

  emit(
    origin: THREE.Vector3, count: number,
    o: { color?: THREE.ColorRepresentation; color2?: THREE.ColorRepresentation; speed?: number; up?: number; life?: number; size?: number; spread?: number; gravity?: number; drag?: number; dir?: THREE.Vector3 } = {},
  ): void {
    const c1 = new THREE.Color(o.color ?? '#fff1c8');
    const c2 = new THREE.Color(o.color2 ?? o.color ?? '#ffc8e8');
    const col = this.geo.getAttribute('aColor') as THREE.BufferAttribute;
    const tmp = new THREE.Color();
    for (let n = 0; n < count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % this.N;
      const sp = (o.speed ?? 3) * (0.4 + this.rnd() * 0.8);
      let dx = this.rnd() - 0.5, dy = this.rnd() - 0.5, dz = this.rnd() - 0.5;
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l; dy /= l; dz /= l;
      if (o.dir) {
        const s = o.spread ?? 0.4;
        dx = o.dir.x + dx * s; dy = o.dir.y + dy * s; dz = o.dir.z + dz * s;
      }
      this.pos[i * 3] = origin.x + (this.rnd() - 0.5) * 0.2;
      this.pos[i * 3 + 1] = origin.y + (this.rnd() - 0.5) * 0.2;
      this.pos[i * 3 + 2] = origin.z + (this.rnd() - 0.5) * 0.2;
      this.vel[i * 3] = dx * sp;
      this.vel[i * 3 + 1] = dy * sp + (o.up ?? 1);
      this.vel[i * 3 + 2] = dz * sp;
      this.maxLife[i] = (o.life ?? 1) * (0.6 + this.rnd() * 0.6);
      this.life[i] = this.maxLife[i];
      this.size0[i] = (o.size ?? 0.25) * (0.6 + this.rnd() * 0.8);
      this.drag[i] = o.drag ?? 1.5;
      this.grav[i] = o.gravity ?? 0;
      tmp.copy(c1).lerp(c2, this.rnd());
      col.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }
    col.needsUpdate = true;
  }

  ring(center: THREE.Vector3, color: THREE.ColorRepresentation, maxR = 7, dur = 0.9, vertical = false): void {
    const r = this.rings.find((x) => !x.active) ?? this.rings[0];
    r.active = true;
    r.t = 0;
    r.dur = dur;
    r.maxR = maxR;
    r.mesh.visible = true;
    r.mesh.position.copy(center);
    r.mesh.rotation.set(vertical ? 0 : -Math.PI / 2, 0, 0);
    (r.mesh.material as THREE.MeshBasicMaterial).color.set(color).multiplyScalar(2);
  }

  setMotes(kind: MoteKind, color: THREE.ColorRepresentation = '#ffffff', density = 1): void {
    this.moteKind = kind;
    this.motes.visible = kind !== 'none';
    const size = this.moteGeo.getAttribute('aSize') as THREE.BufferAttribute;
    const alpha = this.moteGeo.getAttribute('aAlpha') as THREE.BufferAttribute;
    const col = this.moteGeo.getAttribute('aColor') as THREE.BufferAttribute;
    const c = new THREE.Color(color);
    const base = { pollen: 0.09, dust: 0.05, static: 0.07, bubbles: 0.08, petals: 0.12, embers: 0.08, snow: 0.08, none: 0 }[kind];
    for (let i = 0; i < this.moteN; i++) {
      const on = this.rnd() < density;
      size.setX(i, on ? base * (0.5 + this.rnd()) : 0);
      alpha.setX(i, on ? 0.35 + this.rnd() * 0.5 : 0);
      const k = 0.8 + this.rnd() * 0.4;
      col.setXYZ(i, c.r * k, c.g * k, c.b * k);
      const v = kind === 'bubbles' ? [0, 0.4, 0] : kind === 'petals' || kind === 'snow' ? [0.2, -0.35, 0.1] : kind === 'embers' ? [0, 0.6, 0] : [0.08, 0.03, 0.05];
      this.moteVel.set([v[0] + (this.rnd() - 0.5) * 0.2, v[1] + (this.rnd() - 0.5) * 0.12, v[2] + (this.rnd() - 0.5) * 0.2], i * 3);
    }
    size.needsUpdate = alpha.needsUpdate = col.needsUpdate = true;
  }

  update(dt: number, time: number, camera: THREE.Camera, height: number): void {
    const s = this.geo.getAttribute('aSize') as THREE.BufferAttribute;
    const a = this.geo.getAttribute('aAlpha') as THREE.BufferAttribute;
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) {
        if (a.getX(i) !== 0) a.setX(i, 0);
        continue;
      }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      const dr = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= dr;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * dr - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= dr;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      s.setX(i, this.size0[i] * (0.4 + k * 0.6));
      a.setX(i, Math.min(1, k * 1.6));
    }
    (this.geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    s.needsUpdate = true;
    a.needsUpdate = true;
    const fovScale = height / (2 * Math.tan(((camera as THREE.PerspectiveCamera).fov ?? 58) * Math.PI / 360));
    this.mat.uniforms.uScale.value = fovScale * (window.devicePixelRatio || 1);
    this.moteMat.uniforms.uScale.value = fovScale * (window.devicePixelRatio || 1);

    // motes wrap around camera
    if (this.motes.visible) {
      const mp = this.moteGeo.getAttribute('position') as THREE.BufferAttribute;
      const B = this.moteBox;
      const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
      const wob = this.moteKind === 'static' ? 4 : 1;
      for (let i = 0; i < this.moteN; i++) {
        let x = mp.getX(i) + (this.moteVel[i * 3] + Math.sin(time * 0.7 + i) * 0.06 * wob) * dt;
        let y = mp.getY(i) + (this.moteVel[i * 3 + 1] + Math.cos(time * 0.5 + i * 1.3) * 0.04) * dt;
        let z = mp.getZ(i) + this.moteVel[i * 3 + 2] * dt;
        if (this.moteKind === 'static' && (i + Math.floor(time * 12)) % 37 === 0) {
          x += (this.rnd() - 0.5) * 0.8;
          y += (this.rnd() - 0.5) * 0.8;
        }
        x = cx + ((((x - cx) % B) + B * 1.5) % B) - B / 2;
        y = cy + ((((y - cy) % (B * 0.6)) + B * 0.9) % (B * 0.6)) - B * 0.3;
        z = cz + ((((z - cz) % B) + B * 1.5) % B) - B / 2;
        mp.setXYZ(i, x, y, z);
      }
      mp.needsUpdate = true;
    }

    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt;
      const k = r.t / r.dur;
      if (k >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const e = 1 - Math.pow(1 - k, 3);
      r.mesh.scale.setScalar(0.3 + e * r.maxR);
      (r.mesh.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.85;
    }
  }

  reset(): void {
    this.life.fill(0);
    for (const r of this.rings) {
      r.active = false;
      r.mesh.visible = false;
    }
    this.clearBeacons();
  }
}
