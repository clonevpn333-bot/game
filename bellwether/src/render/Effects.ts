import * as THREE from 'three';
import { G } from './Globals';
import { radial } from './Textures';

const MAX = 3000;

/** Pooled CPU particles rendered as one Points draw call. */
export class Effects {
  readonly group = new THREE.Group();
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private size = new Float32Array(MAX);
  private alpha = new Float32Array(MAX);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private drag = new Float32Array(MAX);
  private grow = new Float32Array(MAX);
  private cursor = 0;
  private points: THREE.Points;
  private geo: THREE.BufferGeometry;
  private tracers: { mesh: THREE.Mesh; life: number }[] = [];
  private decals: THREE.Mesh[] = [];
  private decalIdx = 0;
  readonly muzzleLight: THREE.PointLight;
  private muzzleT = 0;
  private flashSprite: THREE.Mesh;
  private motes: THREE.Points;
  private moteU = { uTime: G.uTime, uCenter: { value: new THREE.Vector3() }, uAmount: { value: 0 }, uColor: { value: new THREE.Color(0.9, 0.85, 0.75) }, uEcho: G.uEcho };

  constructor() {
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: radial() }, uScale: { value: 400 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      vertexShader: /* glsl */ `
        attribute float aSize; attribute float aAlpha; uniform float uScale;
        varying vec3 vC; varying float vA;
        void main(){
          vC = color; vA = aAlpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uScale / max(0.1, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; varying vec3 vC; varying float vA;
        void main(){ vec4 t = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(vC * t.a * vA, t.a * vA); }`,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);

    this.muzzleLight = new THREE.PointLight(0xffb060, 0, 9, 2);
    this.group.add(this.muzzleLight);
    const fs = new THREE.PlaneGeometry(0.5, 0.5);
    this.flashSprite = new THREE.Mesh(fs, new THREE.MeshBasicMaterial({
      map: radial('flash', 'rgba(255,220,150,1)', 'rgba(255,120,30,0)'), color: new THREE.Color(4, 3, 2),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.flashSprite.visible = false;
    this.group.add(this.flashSprite);

    // tracers
    const tg = new THREE.PlaneGeometry(1, 0.025);
    tg.translate(0.5, 0, 0);
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.4, 1.4), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.visible = false;
      this.group.add(m);
      this.tracers.push({ mesh: m, life: 0 });
    }
    // decals
    const dg = new THREE.CircleGeometry(0.06, 8);
    const dm = new THREE.MeshBasicMaterial({ map: radial('hole', 'rgba(0,0,0,0.95)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(dg, dm);
      m.visible = false;
      this.group.add(m);
      this.decals.push(m);
    }

    // ambient dust motes around the camera
    const mc = 900;
    const mp = new Float32Array(mc * 3);
    for (let i = 0; i < mc * 3; i++) mp[i] = Math.random();
    const mg = new THREE.BufferGeometry();
    mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
    this.motes = new THREE.Points(mg, new THREE.ShaderMaterial({
      uniforms: { ...this.moteU, uMap: { value: radial() } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        uniform float uTime, uAmount, uEcho; uniform vec3 uCenter; varying float vA;
        void main(){
          vec3 box = vec3(14.0, 7.0, 14.0);
          vec3 p = (position - 0.5) * box * 2.0;
          p += vec3(sin(uTime * 0.13 + position.y * 20.0), sin(uTime * 0.07 + position.x * 30.0) * 0.5 - uTime * 0.03, cos(uTime * 0.11 + position.z * 25.0)) * 1.5;
          p = mod(p - uCenter + box, box * 2.0) - box + uCenter;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          float d = -mv.z;
          vA = uAmount * smoothstep(14.0, 3.0, d) * smoothstep(1.2, 3.0, d) * (0.5 + 0.5 * sin(uTime * 2.0 + position.x * 50.0));
          vA *= 1.0 + uEcho * 0.8;
          gl_PointSize = min((4.0 + uEcho * 2.0) * 60.0 / max(d, 0.1), 28.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap; uniform vec3 uColor; uniform float uEcho; varying float vA;
        void main(){ vec4 t = texture2D(uMap, gl_PointCoord); vec3 c = mix(uColor, vec3(0.5, 0.9, 1.0), uEcho); gl_FragColor = vec4(c * t.a * vA, t.a * vA); }`,
    }));
    this.motes.frustumCulled = false;
    this.group.add(this.motes);
  }

  setMotes(amount: number, color?: THREE.ColorRepresentation): void {
    this.moteU.uAmount.value = amount;
    if (color) this.moteU.uColor.value.set(color);
  }

  spawn(p: THREE.Vector3, v: THREE.Vector3, color: THREE.Color, size: number, life: number, gravity = 0, drag = 0, grow = 0): void {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    this.pos[i * 3] = p.x;
    this.pos[i * 3 + 1] = p.y;
    this.pos[i * 3 + 2] = p.z;
    this.vel[i * 3] = v.x;
    this.vel[i * 3 + 1] = v.y;
    this.vel[i * 3 + 2] = v.z;
    this.col[i * 3] = color.r;
    this.col[i * 3 + 1] = color.g;
    this.col[i * 3 + 2] = color.b;
    this.size[i] = size;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.grav[i] = gravity;
    this.drag[i] = drag;
    this.grow[i] = grow;
    this.alpha[i] = 1;
  }

  burst(kind: 'sparks' | 'dust' | 'shards' | 'echo' | 'glass' | 'blood' | 'embers' | 'smoke', p: THREE.Vector3, normal?: THREE.Vector3, count = 12): void {
    const v = new THREE.Vector3();
    const n = normal ?? new THREE.Vector3(0, 1, 0);
    const c = new THREE.Color();
    for (let k = 0; k < count; k++) {
      v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      if (v.dot(n) < 0) v.addScaledVector(n, -2 * v.dot(n));
      switch (kind) {
        case 'sparks':
          c.setRGB(4, 2.2, 0.8);
          v.multiplyScalar(3 + Math.random() * 5);
          this.spawn(p, v, c, 0.04, 0.2 + Math.random() * 0.3, 9.8, 1);
          break;
        case 'dust':
          c.setRGB(0.25, 0.23, 0.2);
          v.multiplyScalar(0.4 + Math.random());
          this.spawn(p, v, c, 0.25, 0.8 + Math.random(), -0.2, 2, 0.6);
          break;
        case 'smoke':
          c.setRGB(0.12, 0.12, 0.13);
          v.multiplyScalar(0.3 + Math.random() * 0.6);
          v.y = Math.abs(v.y) + 0.5;
          this.spawn(p, v, c, 0.8, 2 + Math.random() * 2, -0.5, 0.5, 1.5);
          break;
        case 'shards':
          c.setRGB(0.3 + Math.random() * 0.5, 1.4, 2.2);
          if (Math.random() < 0.4) c.setRGB(0.05, 0.05, 0.08);
          v.multiplyScalar(2 + Math.random() * 4);
          this.spawn(p, v, c, 0.07, 0.4 + Math.random() * 0.5, 2, 2);
          break;
        case 'echo':
          c.setRGB(0.6, 1.6, 2.4);
          v.multiplyScalar(0.3 + Math.random() * 1.2);
          this.spawn(p, v, c, 0.08, 1 + Math.random(), -0.5, 1);
          break;
        case 'glass':
          c.setRGB(1.2, 1.4, 1.6);
          v.multiplyScalar(2 + Math.random() * 4);
          this.spawn(p, v, c, 0.04, 0.6 + Math.random() * 0.6, 9.8, 0.3);
          break;
        case 'blood':
          c.setRGB(0.25, 0.02, 0.02);
          v.multiplyScalar(1 + Math.random() * 3);
          this.spawn(p, v, c, 0.06, 0.4, 9.8, 0.5);
          break;
        case 'embers':
          c.setRGB(4, 1.4, 0.3);
          v.multiplyScalar(0.5 + Math.random() * 1.5);
          v.y = Math.abs(v.y) + 1;
          this.spawn(p, v, c, 0.05, 1.5 + Math.random() * 2, -1, 0.3);
          break;
      }
    }
  }

  muzzle(p: THREE.Vector3, dir: THREE.Vector3, camera: THREE.Camera): void {
    this.muzzleLight.position.copy(p);
    this.muzzleLight.intensity = 30;
    this.muzzleT = 0.06;
    this.flashSprite.position.copy(p).addScaledVector(dir, 0.08);
    this.flashSprite.quaternion.copy(camera.quaternion);
    this.flashSprite.rotateZ(Math.random() * Math.PI);
    this.flashSprite.scale.setScalar(0.7 + Math.random() * 0.6);
    this.flashSprite.visible = true;
    this.burst('sparks', p, dir, 5);
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3, camera: THREE.Camera): void {
    const t = this.tracers.find((x) => x.life <= 0) ?? this.tracers[0];
    const d = to.clone().sub(from);
    const len = d.length();
    t.mesh.position.copy(from);
    t.mesh.scale.set(len, 1, 1);
    // orient along d, face camera
    const xAxis = d.normalize();
    const toCam = camera.position.clone().sub(from).normalize();
    const zAxis = toCam.sub(xAxis.clone().multiplyScalar(toCam.dot(xAxis))).normalize();
    const yAxis = zAxis.clone().cross(xAxis);
    t.mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
    t.mesh.visible = true;
    t.life = 0.07;
  }

  decal(p: THREE.Vector3, n: THREE.Vector3): void {
    const m = this.decals[this.decalIdx];
    this.decalIdx = (this.decalIdx + 1) % this.decals.length;
    m.position.copy(p).addScaledVector(n, 0.01);
    m.lookAt(p.clone().add(n));
    m.visible = true;
  }

  clearDecals(): void {
    for (const d of this.decals) d.visible = false;
  }

  update(dt: number, camera: THREE.Camera): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) {
        if (this.alpha[i] !== 0) this.alpha[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const k = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alpha[i] = k;
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= d;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] += this.grow[i] * dt;
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    if (this.muzzleT > 0) {
      this.muzzleT -= dt;
      this.muzzleLight.intensity = Math.max(0, this.muzzleT / 0.06) * 30;
      if (this.muzzleT <= 0) {
        this.flashSprite.visible = false;
        this.muzzleLight.intensity = 0;
      }
    }
    for (const t of this.tracers) {
      if (t.life > 0) {
        t.life -= dt;
        (t.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, t.life / 0.07);
        if (t.life <= 0) t.mesh.visible = false;
      }
    }
    this.moteU.uCenter.value.copy(camera.position);
  }
}
