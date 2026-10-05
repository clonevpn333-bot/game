import * as THREE from 'three';
import { Mats } from './Materials';
import { rockGeo, merge, place } from './geo';
import { damp } from '../utils/math';

/**
 * Osseran, the Founder beneath Velmour. For Chapter I it's mostly hidden; what we see is
 * the cliff splitting under the cathedral plaza and one vast eye opening in the rock.
 */
export class Founder {
  readonly group = new THREE.Group();
  private readonly eye: THREE.Mesh;
  private readonly upperLid = new THREE.Group();
  private readonly lowerLid = new THREE.Group();
  private readonly fissure: THREE.Mesh;
  readonly light = new THREE.PointLight('#ffb040', 0, 600, 1.2);
  readonly uniforms = {
    uTime: { value: 0 },
    uGlow: { value: 0 },
    uPupil: { value: 0.35 },
    uLook: { value: new THREE.Vector2() },
  };
  open = 0;
  private openTarget = 0;
  readonly eyeCenter = new THREE.Vector3();
  private readonly lookTarget = new THREE.Vector3();

  constructor(plaza: THREE.Vector3) {
    this.group.name = 'founder';
    const R = 26;
    this.eyeCenter.set(plaza.x - 96, plaza.y - 52, plaza.z + 6);
    this.group.position.copy(this.eyeCenter);
    this.group.rotation.y = Math.PI / 2; // local +Z looks east toward the plaza

    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
        void main(){ vP = normalize(position); vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float uTime, uGlow, uPupil; uniform vec2 uLook; varying vec3 vP; varying vec3 vN; varying vec3 vV;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
        float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y); }
        void main(){
          vec3 n = vP;
          vec3 fwd = normalize(vec3(uLook, 1.0));
          float ang = acos(clamp(dot(n, fwd), -1.0, 1.0));
          // Local frame around the look direction.
          vec3 side = normalize(cross(vec3(0.0,1.0,0.0), fwd));
          vec3 up = cross(fwd, side);
          vec2 q = vec2(dot(n, side), dot(n, up));
          float theta = atan(q.y, q.x);
          float iris = smoothstep(0.62, 0.58, ang);
          float ring = smoothstep(0.62, 0.5, ang) * (0.6 + 0.4 * noise(vec2(theta * 18.0, ang * 30.0 - uTime * 0.2)));
          float sw = uPupil * 0.25 * max(0.0, 1.0 - pow(abs(q.y) / 0.5, 2.0));
          float slit = smoothstep(sw + 0.015, sw, abs(q.x));
          vec3 sclera = mix(vec3(0.12, 0.05, 0.02), vec3(0.45, 0.26, 0.1), noise(n.xy * 9.0 + uTime * 0.05));
          float veins = smoothstep(0.85, 1.0, noise(vec2(theta * 9.0, ang * 14.0)));
          sclera += vec3(0.5, 0.08, 0.02) * veins * 0.6;
          vec3 irisCol = mix(vec3(1.0, 0.55, 0.1), vec3(1.0, 0.9, 0.5), ring) * (0.9 + uGlow * 0.6);
          irisCol *= 0.7 + 0.3 * sin(theta * 40.0 + ang * 20.0);
          vec3 col = mix(sclera * (0.6 + uGlow), irisCol, iris);
          col = mix(col, vec3(0.0), slit * iris);
          float fres = pow(1.0 - max(dot(vN, vV), 0.0), 2.0);
          col += vec3(1.0, 0.6, 0.2) * fres * 0.4 * uGlow;
          gl_FragColor = vec4(col * (0.12 + uGlow * 0.32), 1.0);
        }`,
    });
    this.eye = new THREE.Mesh(new THREE.SphereGeometry(R, 48, 32), mat);
    this.group.add(this.eye);

    // Lids: thick rock shells hinged at the eye's equator. Closed = they meet at the middle.
    const lidGeo = new THREE.SphereGeometry(R * 1.12, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const rock = Mats().rock;
    const lidColor = (g: THREE.BufferGeometry) => {
      const c = new Float32Array(g.attributes.position.count * 3).fill(0.55);
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      return g;
    };
    const upper = new THREE.Mesh(lidColor(lidGeo.clone()), rock);
    this.upperLid.add(upper);
    const lower = new THREE.Mesh(lidColor(lidGeo.clone()), rock);
    this.lowerLid.add(lower);
    this.group.add(this.upperLid, this.lowerLid);
    // Brow ridge and cheek boulders so the eye sits in a "face" of the cliff.
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      parts.push(place(rockGeo(i * 3.1, 1), Math.cos(a) * R * 1.35, Math.sin(a) * R * 1.0, -6, a, 9 + (i % 3) * 3, 8, 12));
    }
    const frame = new THREE.Mesh(merge(parts), rock);
    frame.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(frame.geometry.attributes.position.count * 3).fill(0.5), 3));
    this.group.add(frame);

    // The fissure: a glowing split running down the cliff face. It widens as the Founder stirs.
    const fg = new THREE.PlaneGeometry(8, 180, 1, 12);
    const fp = fg.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i += 1) fp.setX(i, fp.getX(i) * (0.4 + Math.abs(Math.sin(fp.getY(i) * 0.05)) * 0.8) + Math.sin(fp.getY(i) * 0.08) * 6);
    this.fissure = new THREE.Mesh(
      fg,
      new THREE.MeshBasicMaterial({ color: '#ff9a40', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }),
    );
    this.fissure.position.set(0, 20, R * 0.6);
    this.fissure.scale.x = 0.1;
    this.group.add(this.fissure);
    this.group.add(this.light);
    this.light.position.set(0, 0, R * 1.6);
    this.setOpen(0, true);
  }

  setOpen(v: number, instant = false): void {
    this.openTarget = v;
    if (instant) this.open = v;
  }

  lookAt(worldPoint: THREE.Vector3): void {
    this.lookTarget.copy(worldPoint);
  }

  update(dt: number, time: number, stir: number): void {
    this.open = damp(this.open, this.openTarget, 0.9, dt);
    const o = this.open;
    // Upper lid rotates up/back, lower lid down/back.
    // Lid caps point +Y at rotation 0; π/2 points them at +Z (closed over the eye).
    this.upperLid.rotation.x = Math.PI / 2 - o * 2.27;
    this.lowerLid.rotation.x = Math.PI / 2 + o * 2.27;
    this.uniforms.uTime.value = time;
    this.uniforms.uGlow.value = o * 1.2 + stir * 0.2;
    this.uniforms.uPupil.value = 0.25 + Math.sin(time * 0.6) * 0.05 + (1 - o) * 0.4;
    const local = this.group.worldToLocal(this.lookTarget.clone()).normalize();
    this.uniforms.uLook.value.set(local.x * 0.9, local.y * 0.9);
    this.light.intensity = o * 700;
    const fm = this.fissure.material as THREE.MeshBasicMaterial;
    fm.opacity = Math.min(1, stir * 1.2);
    this.fissure.scale.x = damp(this.fissure.scale.x, 0.1 + stir * 1.0, 1.5, dt);
    this.group.visible = stir > 0.001 || o > 0.001;
  }
}
