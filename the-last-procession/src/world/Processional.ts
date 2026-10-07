import * as THREE from 'three';
import { G, MeshBuilder, bellGeo, gearGeo, merge, xf } from '../render/Geo';
import { metalSet, type MetalSet } from '../render/Materials';
import { clamp, damp, easeInOut, lerp } from '../utils/math';

/**
 * The Processionals: colossal ancient walking machines. Each type builds a bone
 * hierarchy of merged meshes and walks with a planted-foot gait (stance phase
 * sweeps the leg back exactly as fast as the body advances), which keeps feet
 * from skating even in close shots. Footfalls fire `onStomp` for camera shake,
 * dust, audio and gameplay shockwaves.
 */

export interface Leg {
  hip: THREE.Object3D; // swings
  knee: THREE.Object3D; // bends
  foot: THREE.Object3D; // marker at sole
  offset: number; // phase offset 0..1
  axis: 'x' | 'y'; // swing axis on hip
  sign: number;
  u: number;
  lift: number; // 0..1 how high the foot is
}

const tmp = new THREE.Vector3();

export abstract class Processional {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly legs: Leg[] = [];
  readonly mats: MetalSet;
  readonly glowMat: THREE.MeshStandardMaterial;
  heading = 0;
  speed = 8; // m/s at full stride
  walk = 0; // current walk blend 0..1
  walkTarget = 0;
  phase = 0;
  amp = 0.3;
  legLen = 95;
  stride = 50;
  bellSwing: THREE.Object3D[] = [];
  spinners: { obj: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }[] = [];
  onStomp: ((pos: THREE.Vector3, leg: number) => void) | null = null;
  /** Freezes autonomous root translation (for scripted placement in cutscenes). */
  holdPosition = false;
  time = 0;

  constructor(kind: 'bronze' | 'verdigris' | 'ivory' | 'iron', readonly far = false) {
    this.mats = metalSet(kind);
    // per-instance glow so each giant can pulse independently
    this.glowMat = this.mats.glow.clone();
    this.root.add(this.body);
  }

  setGlow(color: THREE.ColorRepresentation, intensity: number): void {
    this.glowMat.emissive.set(color);
    this.glowMat.emissiveIntensity = intensity;
  }

  footWorld(i: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.legs[i].foot.getWorldPosition(out);
  }

  protected abstract pose(dt: number): void;

  /** Distant silhouettes don't need to render into the hero-centred shadow map. */
  protected finalizeMeshes(): void {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      if (this.far || m.material === this.glowMat) m.castShadow = false;
      m.receiveShadow = !this.far;
    });
  }

  /**
   * Where a swinging foot will come down (exact for the planted-foot gait):
   * root at landing time + hip offset + forward reach of the leg at full stride.
   */
  predictLanding(i: number, out = new THREE.Vector3()): { pos: THREE.Vector3; progress: number } | null {
    const l = this.legs[i];
    if (l.u < 0.5 || this.walk < 0.05 || l.axis !== 'x') return null;
    const rate = this.speed / (2 * this.stride);
    const tRem = (1 - l.u) / rate;
    const s = Math.sin(this.heading);
    const c = Math.cos(this.heading);
    const lx = l.hip.position.x;
    const lz = l.hip.position.z + this.legLen * Math.sin(this.amp * this.walk) + 3;
    const adv = this.holdPosition ? 0 : this.speed * this.walk * tRem;
    out.set(this.root.position.x + lx * c + lz * s + s * adv, 0, this.root.position.z - lx * s + lz * c + c * adv);
    return { pos: out, progress: (l.u - 0.5) / 0.5 };
  }

  update(dt: number, time: number): void {
    this.time = time;
    this.walk += (this.walkTarget - this.walk) * damp(0.8, dt);
    if (this.walk < 0.002 && this.walkTarget === 0) this.walk = 0;
    const rate = this.speed / (2 * this.stride);
    const prev = this.legs.map((l) => l.u);
    if (this.walk > 0.001) this.phase += dt * rate;
    this.root.rotation.y = this.heading;
    if (!this.holdPosition && this.walk > 0.001) {
      this.root.position.x += Math.sin(this.heading) * this.speed * this.walk * dt;
      this.root.position.z += Math.cos(this.heading) * this.speed * this.walk * dt;
    }
    this.legs.forEach((l, i) => {
      l.u = (((this.phase + l.offset) % 1) + 1) % 1;
      if (this.walk > 0.05 && prev[i] > 0.85 && l.u < 0.15) {
        this.root.updateMatrixWorld(true);
        this.onStomp?.(this.footWorld(i, tmp).clone().setY(0), i);
      }
    });
    for (const s of this.spinners) s.obj.rotation[s.axis] += s.speed * dt;
    this.bellSwing.forEach((b, i) => {
      b.rotation.z = Math.sin(time * 0.9 + i * 1.7) * (0.08 + this.walk * 0.25);
      b.rotation.x = Math.cos(time * 0.7 + i) * 0.05 * (0.5 + this.walk);
    });
    this.pose(dt);
  }

  /** Returns the swing angle (foot-forward positive) and knee bend for a leg. */
  protected gait(l: Leg): { a: number; knee: number; lift: number } {
    const amp = this.amp * this.walk;
    const u = l.u;
    if (u < 0.5) {
      const s = u / 0.5;
      l.lift = 0;
      return { a: amp * (1 - 2 * s), knee: 0.06 * this.walk, lift: 0 };
    }
    const s = (u - 0.5) / 0.5;
    const lift = Math.sin(s * Math.PI);
    l.lift = lift * this.walk;
    return { a: -amp + 2 * amp * easeInOut(s), knee: lift * 0.85 * this.walk, lift };
  }

  dispose(): void {
    this.root.removeFromParent();
    this.glowMat.dispose();
  }
}

// =====================================================================================
// THE PILGRIM — the humanoid that kneels. ~195 m tall.
// =====================================================================================
export class Pilgrim extends Processional {
  readonly pelvis = new THREE.Group();
  readonly torso = new THREE.Group();
  readonly head = new THREE.Group();
  readonly chestL = new THREE.Group();
  readonly chestR = new THREE.Group();
  readonly cradle: THREE.Mesh;
  readonly halo = new THREE.Group();
  readonly uArmL = new THREE.Group();
  readonly fArmL = new THREE.Group();
  readonly uArmR = new THREE.Group();
  readonly fArmR = new THREE.Group();
  readonly palmR = new THREE.Group();
  readonly cradleAnchor = new THREE.Object3D();
  kneel = 0;
  chestOpen = 0;
  headYaw = 0;
  headPitch = 0;
  reach = 0;
  raiseArms = 0;
  private cradleLight: THREE.PointLight;

  constructor(far = false) {
    super('ivory', far);
    this.amp = 0.3;
    this.legLen = 95;
    this.stride = 2 * this.legLen * Math.sin(this.amp);
    this.speed = 8;
    const M = this.mats;
    const glow = this.glowMat;
    const B = new MeshBuilder();
    const P = this.pelvis;
    P.position.y = 101;
    this.body.add(P);
    this.torso.position.y = 6;
    P.add(this.torso);
    this.head.position.y = 64;
    this.torso.add(this.head);

    // pelvis + plated skirt
    B.add(P, M.hull, xf(G.cyl(24, 20, 18, 10), [0, 0, 0]));
    B.add(P, M.trim, xf(G.cyl(25, 25, 3, 10), [0, 8, 0]));
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      if (Math.abs(Math.sin(a)) > 0.92) continue; // leave room for legs
      B.add(P, i % 2 ? M.hull : M.stone, xf(G.box(11, 30, 1.6), [Math.sin(a) * 24, -14, Math.cos(a) * 24], [Math.cos(a) * 0.22, a, -Math.sin(a) * 0.22]));
      B.add(P, M.trim, xf(G.box(11.4, 1.4, 2), [Math.sin(a) * 27.5, -28.5, Math.cos(a) * 27.5], [0, a, 0]));
    }
    if (!far) {
      // chains hanging from the belt
      for (let c = 0; c < 6; c++) {
        const a = (c / 6) * Math.PI * 2 + 0.3;
        for (let k = 0; k < 9; k++) {
          B.add(P, M.dark, xf(G.torus(1.6, 0.45, 4, 8), [Math.sin(a) * 26, -4 - k * 3.2, Math.cos(a) * 26], [0, a + (k % 2) * Math.PI / 2, 0]));
        }
      }
    }

    // torso: tapered octagonal body with a cradle chest
    B.add(this.torso, M.hull, xf(G.cyl(31, 21, 52, 8), [0, 26, 0], [0, Math.PI / 8, 0]));
    B.add(this.torso, M.trim, xf(G.cyl(32, 32, 3, 8), [0, 52, 0], [0, Math.PI / 8, 0]));
    B.add(this.torso, M.trim, xf(G.cyl(23, 23, 2.4, 8), [0, 2, 0], [0, Math.PI / 8, 0]));
    B.add(this.torso, M.stone, xf(G.box(36, 8, 22), [0, 58, -4]));
    // ribs / rune strips
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) B.add(this.torso, M.trim, xf(G.box(1.4, 30, 3), [sx * (20 + i * 3), 26, 24 - i * 4], [0.2, sx * (0.5 + i * 0.12), 0]));
      B.add(this.torso, glow, xf(G.box(0.8, 34, 0.8), [sx * 12, 22, 23.5], [0.18, 0, 0]));
    }
    // back spires
    for (const [x, h] of [[-12, 34], [0, 48], [12, 34]] as const) {
      B.add(this.torso, M.stone, xf(G.box(6, h * 0.6, 6), [x, 50 + h * 0.3, -18]));
      B.add(this.torso, M.trim, xf(G.cone(4.8, h * 0.6, 4), [x, 50 + h * 0.6 + h * 0.3, -18], [0, Math.PI / 4, 0]));
      if (!far) B.add(this.torso, glow, xf(G.box(2, 6, 0.6), [x, 52 + h * 0.3, -14.8]));
    }
    // cradle cavity (glows when the chest opens)
    this.cradle = new THREE.Mesh(G.sph(9, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.35, 1.25, 1.5) }));
    this.cradle.position.set(0, 36, 14);
    this.torso.add(this.cradle);
    B.add(this.torso, M.dark, xf(G.cyl(14, 14, 8, 16), [0, 36, 16], [Math.PI / 2, 0, 0]));
    this.cradleAnchor.position.set(0, 33, 27);
    this.torso.add(this.cradleAnchor);
    this.cradleLight = new THREE.PointLight('#8ff7ff', 0, 140, 1.2);
    this.cradleLight.position.set(0, 36, 30);
    this.torso.add(this.cradleLight);
    // chest doors hinge on their outer edges
    this.chestL.position.set(15, 36, 24.5);
    this.chestR.position.set(-15, 36, 24.5);
    this.torso.add(this.chestL, this.chestR);
    for (const [door, sx] of [[this.chestL, -1], [this.chestR, 1]] as const) {
      B.add(door, M.hull, xf(G.box(15, 26, 3.2), [sx * 7.5, 0, 0]));
      B.add(door, M.trim, xf(G.box(15.4, 1.6, 3.6), [sx * 7.5, 12.6, 0]));
      B.add(door, M.trim, xf(G.box(15.4, 1.6, 3.6), [sx * 7.5, -12.6, 0]));
      B.add(door, M.trim, xf(G.torus(4.5, 0.7, 6, 18, Math.PI), [sx * 0.2, 0, 1.8], [0, 0, sx > 0 ? -Math.PI / 2 : Math.PI / 2]));
      B.add(door, glow, xf(G.box(0.8, 22, 0.8), [sx * 0.6, 0, 1.8]));
    }

    // shoulders + bell towers
    for (const sx of [-1, 1]) {
      B.add(this.torso, M.hull, xf(G.sph(15, 12, 10), [sx * 33, 52, 0]));
      B.add(this.torso, M.trim, xf(G.hemi(17, 12, 6), [sx * 33, 54, 0], [0, 0, sx * 0.35], [1, 0.55, 1]));
      // tower
      B.add(this.torso, M.stone, xf(G.box(10, 22, 10), [sx * 34, 76, 0]));
      B.add(this.torso, M.dark, xf(G.box(10.4, 9, 6), [sx * 34, 78, 0]));
      B.add(this.torso, M.dark, xf(G.box(6, 9, 10.4), [sx * 34, 78, 0]));
      B.add(this.torso, M.trim, xf(G.cone(8.2, 14, 4), [sx * 34, 94, 0], [0, Math.PI / 4, 0]));
      B.add(this.torso, M.trim, xf(G.box(11, 1.4, 11), [sx * 34, 87, 0]));
      if (!far) {
        const bell = new THREE.Group();
        bell.position.set(sx * 34, 82, 0);
        this.torso.add(bell);
        B.add(bell, M.trim, xf(bellGeo(3.2), [0, -5, 0]));
        this.bellSwing.push(bell);
      }
    }

    // head: hood + face recess + eye slit
    B.add(this.head, M.hull, xf(G.lathe([[0, 30], [8, 28], [14, 20], [16, 8], [17, -2], [18, -6]], 12), [0, 0, -2]));
    B.add(this.head, M.dark, xf(G.sph(11, 12, 10), [0, 9, 5.5], [0, 0, 0], [1, 1.2, 0.8]));
    B.add(this.head, glow, xf(G.box(13, 1.6, 2), [0, 12, 13.5]));
    B.add(this.head, M.trim, xf(G.box(3, 10, 2.5), [0, 3, 14.5]));
    B.add(this.head, M.trim, xf(G.torus(16, 1.2, 6, 24, Math.PI), [0, 4, -2], [0, 0, 0]));
    // halo gear behind the head
    this.halo.position.set(0, 16, -14);
    this.head.add(this.halo);
    B.add(this.halo, M.trim, gearGeo(26, 1.6, 28, 3));
    if (!far) B.add(this.halo, glow, G.torus(22, 0.5, 4, 48));
    this.spinners.push({ obj: this.halo, axis: 'z', speed: 0.08 });

    // arms
    const arm = (u: THREE.Group, f: THREE.Group, sx: number) => {
      u.position.set(sx * 36, 50, 0);
      this.torso.add(u);
      f.position.set(0, -44, 0);
      u.add(f);
      B.add(u, M.hull, xf(G.cyl(8, 7, 42, 10), [0, -21, 0]));
      B.add(u, M.trim, xf(G.cyl(9, 9, 2.5, 10), [0, -10, 0]));
      B.add(u, M.hull, xf(G.sph(8.6, 10, 8), [0, -44, 0]));
      B.add(f, M.hull, xf(G.cyl(7, 6, 38, 10), [0, -19, 0]));
      B.add(f, M.trim, xf(G.cyl(7.8, 7.8, 9, 10), [0, -30, 0]));
      if (!far) B.add(f, glow, xf(G.box(0.8, 26, 0.8), [0, -20, 6.8]));
    };
    arm(this.uArmL, this.fArmL, 1);
    arm(this.uArmR, this.fArmR, -1);
    // hands
    const hand = (f: THREE.Group, palm: THREE.Group) => {
      palm.position.set(0, -40, 0);
      f.add(palm);
      B.add(palm, M.hull, xf(G.box(15, 16, 5.5), [0, -8, 0]));
      for (let i = 0; i < 4; i++) B.add(palm, M.hull, xf(G.box(3, 13, 3.6), [-5.4 + i * 3.6, -21, 1], [0.25, 0, 0]));
      B.add(palm, M.hull, xf(G.box(3.4, 10, 3.6), [8.5, -8, 2], [0, 0, 0.5]));
    };
    hand(this.fArmL, new THREE.Group());
    hand(this.fArmR, this.palmR);

    // legs
    for (const sx of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(sx * 15, -6, 0);
      P.add(hip);
      const knee = new THREE.Group();
      knee.position.y = -48;
      hip.add(knee);
      const foot = new THREE.Object3D();
      foot.position.set(0, -47 + 0, 4);
      knee.add(foot);
      B.add(hip, M.hull, xf(G.cyl(12, 10, 48, 10), [0, -24, 0]));
      B.add(hip, M.trim, xf(G.cyl(12.6, 12.6, 3, 10), [0, -8, 0]));
      B.add(knee, M.trim, xf(G.sph(11, 10, 8), [0, 0, 1.5], [0, 0, 0], [1, 1, 1.15]));
      B.add(knee, M.hull, xf(G.cyl(9.5, 8, 44, 10), [0, -22, 0]));
      B.add(knee, M.stone, xf(G.box(13, 30, 4), [0, -20, 8.5], [-0.06, 0, 0]));
      B.add(knee, M.hull, xf(G.box(20, 8, 32), [0, -43, 6]));
      B.add(knee, M.trim, xf(G.box(21, 2, 33), [0, -39, 6]));
      for (let t = 0; t < 3; t++) B.add(knee, M.dark, xf(G.box(5, 6, 7), [-6.5 + t * 6.5, -44, 23]));
      if (!far) B.add(knee, glow, xf(G.box(0.8, 30, 0.8), [0, -20, 10.8]));
      this.legs.push({ hip, knee, foot, offset: sx > 0 ? 0 : 0.5, axis: 'x', sign: 1, u: 0, lift: 0 });
    }
    B.build();
    this.finalizeMeshes();
    this.cradle.castShadow = false;
  }

  protected pose(dt: number): void {
    const k = easeInOut(this.kneel);
    let stanceA = 0;
    this.legs.forEach((l, i) => {
      const g = this.gait(l);
      if (l.u < 0.5) stanceA = g.a;
      // kneel override: left leg plants foot forward, right knee drops to the ground
      const kneelHip = i === 1 ? -1.45 : 0.25;
      const kneelKnee = i === 1 ? 1.45 : 1.75;
      l.hip.rotation.x = lerp(-g.a, kneelHip, k);
      l.knee.rotation.x = lerp(g.knee, kneelKnee, k);
    });
    const walkBob = (Math.cos(stanceA) - 1) * this.legLen * this.walk;
    this.pelvis.position.y = 101 + walkBob - 46 * k;
    this.pelvis.rotation.z = Math.sin(this.phase * Math.PI * 2) * 0.03 * this.walk;
    this.torso.rotation.x = 0.06 * this.walk + 0.32 * k;
    this.torso.rotation.y = Math.sin(this.phase * Math.PI * 2) * 0.05 * this.walk;
    this.head.rotation.y = this.headYaw;
    this.head.rotation.x = this.headPitch + 0.22 * k;
    // arms: counter-swing while walking, reach / raise when scripted
    const swing = Math.sin(this.phase * Math.PI * 2) * 0.22 * this.walk;
    const r = easeInOut(this.reach);
    const up = easeInOut(this.raiseArms);
    this.uArmL.rotation.x = swing - 0.25 * k - 2.6 * up;
    this.uArmL.rotation.z = 0.12 + 0.3 * k + 0.4 * up;
    this.fArmL.rotation.x = -0.35 - 0.5 * k;
    this.uArmR.rotation.x = -swing - 0.25 * k + lerp(0, -0.25, r) - 2.6 * up;
    this.uArmR.rotation.z = -0.12 - 0.25 * k - 0.4 * up + 0.2 * r;
    this.fArmR.rotation.x = lerp(-0.35 - 0.5 * k, -0.6, r);
    this.palmR.rotation.x = lerp(0, -1.2, r);
    this.palmR.rotation.y = lerp(0, Math.PI, r);
    // chest cradle
    const c = easeInOut(this.chestOpen);
    this.chestL.rotation.y = c * 1.9;
    this.chestR.rotation.y = -c * 1.9;
    this.cradle.visible = c > 0.01;
    this.cradle.scale.setScalar(0.6 + c * 0.4 + Math.sin(this.time * 3) * 0.03 * c);
    this.cradleLight.intensity = c * 160;
    void dt;
  }
}

// =====================================================================================
// THE ANTLERED — the stag whose antlers are towers. ~150 m to the antler tips.
// =====================================================================================
export class Antlered extends Processional {
  readonly hull = new THREE.Group();
  readonly neck = new THREE.Group();
  readonly head = new THREE.Group();
  headPitch = 0;
  rear = 0; // rearing pose for the battle

  constructor(far = false) {
    super('verdigris', far);
    this.amp = 0.27;
    this.legLen = 104;
    this.stride = 2 * this.legLen * Math.sin(this.amp);
    this.speed = 11;
    const M = this.mats;
    const glow = this.glowMat;
    const B = new MeshBuilder();
    const H = this.hull;
    H.position.y = 112;
    this.body.add(H);

    // barrel hull with ribs
    B.add(H, M.hull, xf(G.cyl(24, 24, 120, 14), [0, 0, 0], [Math.PI / 2, 0, 0], [1, 1, 0.95]));
    B.add(H, M.hull, xf(G.sph(24, 14, 10), [0, 0, 60], [0, 0, 0], [1, 0.95, 0.8]));
    B.add(H, M.hull, xf(G.sph(24, 14, 10), [0, 0, -60], [0, 0, 0], [1, 0.95, 0.6]));
    for (let i = 0; i < 9; i++) {
      B.add(H, M.trim, xf(G.torus(24.6, 1.1, 6, 24, Math.PI * 1.1), [0, 0, -48 + i * 12], [0, 0, -0.05 * Math.PI]));
    }
    B.add(H, M.trim, xf(G.box(4, 4, 130), [0, 24, 0]));
    if (!far) {
      // a ruined hill-village built on its back during the 300-year sleep
      const houses = [[-8, 10], [7, -6], [-4, -22], [9, 24], [-10, 36], [3, -40]];
      for (const [x, z] of houses) {
        B.add(H, M.stone, xf(G.box(7, 6, 8), [x, 27, z]));
        B.add(H, M.dark, xf(G.cone(6.2, 5, 4), [x, 32.5, z], [0, Math.PI / 4, 0], [1, 1, 1.15]));
      }
      for (let i = 0; i < 14; i++) {
        const x = Math.sin(i * 2.3) * 14;
        const z = -50 + i * 7.5;
        B.add(H, M.dark, xf(G.cone(3, 9, 5), [x, 30, z]));
      }
      B.add(H, M.stone, xf(G.box(5, 18, 5), [0, 33, 0]));
      B.add(H, M.trim, xf(G.cone(4, 8, 4), [0, 46, 0], [0, Math.PI / 4, 0]));
      // hanging chains + lanterns along the flanks
      for (const sx of [-1, 1]) {
        for (let c = 0; c < 5; c++) {
          const z = -40 + c * 20;
          for (let k = 0; k < 6; k++) B.add(H, M.dark, xf(G.torus(1.3, 0.4, 4, 8), [sx * 24.5, -4 - k * 2.6, z], [0, (k % 2) * Math.PI / 2, 0]));
          B.add(H, glow, xf(G.sph(1.6, 6, 5), [sx * 24.5, -20, z]));
        }
      }
    }
    // glow vents
    for (const sx of [-1, 1]) B.add(H, glow, xf(G.box(0.8, 3, 90), [sx * 23.6, 6, 0]));

    // neck + head + antlers
    this.neck.position.set(0, 10, 58);
    this.neck.rotation.x = -0.75;
    H.add(this.neck);
    B.add(this.neck, M.hull, xf(G.cyl(11, 15, 50, 12), [0, 25, 0]));
    for (let i = 0; i < 4; i++) B.add(this.neck, M.trim, xf(G.cyl(14 - i, 14 - i, 2, 12), [0, 8 + i * 11, 0]));
    this.head.position.set(0, 50, 0);
    this.neck.add(this.head);
    B.add(this.head, M.hull, xf(G.cyl(7, 12, 34, 10), [0, 2, 16], [Math.PI / 2 + 0.75, 0, 0]));
    B.add(this.head, M.hull, xf(G.sph(13, 12, 10), [0, 6, 0]));
    B.add(this.head, M.trim, xf(G.box(4, 3, 26), [0, 14, 10], [0.5, 0, 0]));
    for (const sx of [-1, 1]) {
      B.add(this.head, glow, xf(G.sph(2.2, 8, 6), [sx * 9, 8, 7]));
      B.add(this.head, M.hull, xf(G.cone(4, 14, 6), [sx * 13, 14, -2], [0.2, 0, -sx * 1.2], [1, 1, 0.4])); // ears
      // antler: main beam + tower tines with lanterns
      const branch = (p: THREE.Vector3, dir: THREE.Vector3, len: number, r: number, depth: number) => {
        const end = p.clone().addScaledVector(dir, len);
        const mid = p.clone().add(end).multiplyScalar(0.5);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        const e = new THREE.Euler().setFromQuaternion(q);
        B.add(this.head, M.trim, xf(G.cyl(r * 0.7, r, len, 7), [mid.x, mid.y, mid.z], [e.x, e.y, e.z]));
        if (depth === 0) {
          B.add(this.head, M.stone, xf(G.box(r * 2.4, r * 3.2, r * 2.4), [end.x, end.y + r, end.z]));
          B.add(this.head, M.trim, xf(G.cone(r * 2, r * 3, 4), [end.x, end.y + r * 3.9, end.z], [0, Math.PI / 4, 0]));
          if (!far) B.add(this.head, glow, xf(G.sph(r * 0.8, 6, 5), [end.x, end.y + r * 1.2, end.z + r * 1.25]));
          return;
        }
        const n = depth === 2 ? 3 : 2;
        for (let i = 0; i < n; i++) {
          const nd = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), sx * (0.35 + i * 0.25)).applyAxisAngle(new THREE.Vector3(1, 0, 0), -0.25 + i * 0.3).normalize();
          branch(i === 0 ? end : p.clone().lerp(end, 0.55 + i * 0.15), nd, len * 0.68, r * 0.68, depth - 1);
        }
      };
      branch(new THREE.Vector3(sx * 6, 16, -2), new THREE.Vector3(sx * 0.55, 1, -0.2).normalize(), 34, 3.4, 2);
    }

    // legs (LH, LF, RH, RF gait order)
    const legDefs: [number, number, number][] = [
      [1, -46, 0],
      [1, 46, 0.25],
      [-1, -46, 0.5],
      [-1, 46, 0.75],
    ];
    for (const [sx, z, off] of legDefs) {
      const hip = new THREE.Group();
      hip.position.set(sx * 17, -12, z);
      H.add(hip);
      const knee = new THREE.Group();
      knee.position.y = -50;
      hip.add(knee);
      const foot = new THREE.Object3D();
      foot.position.y = -50;
      knee.add(foot);
      B.add(hip, M.hull, xf(G.cyl(10, 7, 50, 10), [0, -25, 0]));
      B.add(hip, M.trim, xf(G.sph(11, 10, 8), [0, 0, 0]));
      B.add(knee, M.trim, xf(G.sph(7.5, 10, 8), [0, 0, 0]));
      B.add(knee, M.hull, xf(G.cyl(5.5, 4.5, 46, 10), [0, -23, 0]));
      B.add(knee, M.dark, xf(G.cyl(9, 11, 9, 10), [0, -46, 0]));
      B.add(knee, M.trim, xf(G.cyl(11.4, 11.4, 1.6, 10), [0, -50.4, 0]));
      if (!far) B.add(knee, glow, xf(G.box(0.6, 30, 0.6), [0, -22, 5]));
      this.legs.push({ hip, knee, foot, offset: off, axis: 'x', sign: z > 0 ? 1 : -1, u: 0, lift: 0 });
    }
    B.build();
    this.finalizeMeshes();
  }

  protected pose(): void {
    let bob = 0;
    this.legs.forEach((l) => {
      const g = this.gait(l);
      l.hip.rotation.x = -g.a;
      // front knees fold backward, hind hocks fold forward
      l.knee.rotation.x = l.sign > 0 ? g.knee : -g.knee * 0.8;
      if (l.u < 0.5) bob += (Math.cos(g.a) - 1) * this.legLen * 0.5;
    });
    const r = easeInOut(this.rear);
    this.hull.position.y = 112 + bob * this.walk + r * 30;
    this.hull.rotation.x = -r * 0.45 + Math.sin(this.phase * Math.PI * 4) * 0.01 * this.walk;
    this.hull.rotation.z = Math.sin(this.phase * Math.PI * 2) * 0.02 * this.walk;
    this.neck.rotation.x = -0.75 + Math.sin(this.phase * Math.PI * 4) * 0.04 * this.walk + this.headPitch;
    if (r > 0) {
      this.legs[1].hip.rotation.x = -0.9 * r;
      this.legs[3].hip.rotation.x = -0.7 * r;
      this.legs[1].knee.rotation.x = 1.3 * r;
      this.legs[3].knee.rotation.x = 1.1 * r;
    }
  }
}

// =====================================================================================
// THE CARILLON — a walking temple of bells on six legs. ~240 m tall.
// =====================================================================================
export class Carillon extends Processional {
  readonly platform = new THREE.Group();
  readonly hatch = new THREE.Object3D();
  readonly underBells: THREE.Group[] = [];

  constructor(far = false) {
    super('iron', far);
    this.amp = 0.22;
    this.legLen = 140;
    this.stride = 2 * 95 * Math.sin(this.amp);
    this.speed = 7;
    const M = this.mats;
    const bronze = metalSet('bronze');
    const glow = this.glowMat;
    const B = new MeshBuilder();
    const Pl = this.platform;
    Pl.position.y = 166;
    this.body.add(Pl);

    // platform
    B.add(Pl, M.stone, xf(G.cyl(72, 60, 22, 12), [0, 0, 0]));
    B.add(Pl, bronze.trim, xf(G.cyl(74, 74, 3.5, 12), [0, 11, 0]));
    B.add(Pl, M.hull, xf(G.cyl(58, 30, 24, 12), [0, -22, 0]));
    B.add(Pl, M.dark, xf(G.cone(30, 30, 12), [0, -48, 0], [Math.PI, 0, 0]));
    // underside gears
    if (!far) {
      for (let i = 0; i < 3; i++) {
        const gear = new THREE.Group();
        const a = (i / 3) * Math.PI * 2;
        gear.position.set(Math.cos(a) * 30, -20, Math.sin(a) * 30);
        gear.rotation.y = -a;
        Pl.add(gear);
        B.add(gear, bronze.trim, gearGeo(13, 1.4, 16, 2.4));
        this.spinners.push({ obj: gear, axis: 'z', speed: 0.3 * (i % 2 ? 1 : -1) });
      }
    }
    // colonnade ring
    const cols = far ? 16 : 32;
    for (let i = 0; i < cols; i++) {
      const a = (i / cols) * Math.PI * 2;
      B.add(Pl, M.stone, xf(G.cyl(1.6, 1.9, 16, 6), [Math.cos(a) * 64, 19, Math.sin(a) * 64]));
    }
    B.add(Pl, M.stone, xf(G.cyl(67, 67, 3, 24, true), [0, 28.5, 0]));
    B.add(Pl, bronze.trim, xf(G.torus(66, 1.2, 4, 48), [0, 27, 0], [Math.PI / 2, 0, 0]));
    // drum + dome + lantern
    B.add(Pl, M.stone, xf(G.cyl(34, 36, 34, 16), [0, 28, 0]));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      B.add(Pl, glow, xf(G.box(3.4, 14, 1), [Math.cos(a) * 34.6, 30, Math.sin(a) * 34.6], [0, -a + Math.PI / 2, 0]));
      B.add(Pl, M.stone, xf(G.box(3, 32, 3), [Math.cos(a + 0.26) * 35.5, 28, Math.sin(a + 0.26) * 35.5]));
    }
    B.add(Pl, bronze.hull, xf(G.hemi(36, 20, 10), [0, 45, 0]));
    for (let i = 0; i < 8; i++) B.add(Pl, bronze.trim, xf(G.torus(36, 0.8, 4, 24, Math.PI / 2), [0, 45, 0], [0, (i / 8) * Math.PI * 2, Math.PI / 2]));
    B.add(Pl, M.stone, xf(G.cyl(7, 8, 14, 8), [0, 86, 0]));
    B.add(Pl, glow, xf(G.cyl(5, 5, 8, 8), [0, 87, 0]));
    B.add(Pl, bronze.trim, xf(G.cone(8, 26, 8), [0, 106, 0]));
    // corner bell towers
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const x = Math.cos(a) * 50;
      const z = Math.sin(a) * 50;
      B.add(Pl, M.stone, xf(G.box(16, 50, 16), [x, 36, z]));
      B.add(Pl, M.dark, xf(G.box(16.6, 14, 9), [x, 54, z]));
      B.add(Pl, M.dark, xf(G.box(9, 14, 16.6), [x, 54, z]));
      B.add(Pl, bronze.trim, xf(G.box(18, 2, 18), [x, 62, z]));
      B.add(Pl, M.stone, xf(G.cone(12, 30, 4), [x, 78, z], [0, Math.PI / 4, 0]));
      B.add(Pl, glow, xf(G.sph(1.6, 6, 5), [x, 94, z]));
      // flying buttress toward the drum
      const mx = Math.cos(a) * 41;
      const mz = Math.sin(a) * 41;
      B.add(Pl, M.stone, xf(G.box(3, 3, 16), [mx, 48, mz], [0.5, -a + Math.PI / 2, 0]));
      if (!far) {
        const bell = new THREE.Group();
        bell.position.set(x, 60, z);
        Pl.add(bell);
        B.add(bell, bronze.trim, xf(bellGeo(4.5), [0, -7, 0]));
        this.bellSwing.push(bell);
      }
    }
    // giant under-bells (hazards in the climb)
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + Math.PI / 3;
      const bell = new THREE.Group();
      bell.position.set(Math.cos(a) * 46, -16, Math.sin(a) * 46);
      Pl.add(bell);
      B.add(bell, M.dark, xf(G.cyl(0.8, 0.8, 20, 5), [0, -10, 0]));
      B.add(bell, bronze.trim, xf(bellGeo(11), [0, -38, 0]));
      this.underBells.push(bell);
      this.bellSwing.push(bell);
    }
    this.hatch.position.set(0, -14, 58);
    Pl.add(this.hatch);

    // six legs, tripod gait
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const hip = new THREE.Group();
      hip.position.set(Math.sin(a) * 56, -6, Math.cos(a) * 56);
      hip.rotation.y = a;
      Pl.add(hip);
      const knee = new THREE.Group();
      knee.position.set(0, 34, 40);
      hip.add(knee);
      const foot = new THREE.Object3D();
      foot.position.set(0, -194, 0);
      knee.add(foot);
      // femur rising outward
      B.add(hip, M.hull, xf(G.cyl(6, 8, 54, 8), [0, 17, 20], [1.0, 0, 0]));
      B.add(hip, bronze.trim, xf(G.sph(9, 10, 8), [0, 0, 0]));
      B.add(knee, bronze.trim, xf(G.sph(8, 10, 8), [0, 0, 0]));
      // tibia: a tapering tower down to the ground with ledges (the climbable leg)
      B.add(knee, M.hull, xf(G.cyl(7, 9, 186, 10), [0, -94, 0]));
      for (let k = 0; k < 7; k++) B.add(knee, bronze.trim, xf(G.cyl(9.6, 9.6, 2, 10), [0, -20 - k * 24, 0]));
      B.add(knee, M.dark, xf(G.cyl(12, 16, 10, 10), [0, -189, 0]));
      if (!far) B.add(knee, glow, xf(G.box(0.8, 150, 0.8), [0, -100, 8.4]));
      this.legs.push({ hip, knee, foot, offset: i % 2 ? 0.5 : 0, axis: 'y', sign: 1, u: 0, lift: 0 });
    }
    B.build();
    this.finalizeMeshes();
  }

  protected pose(): void {
    let bob = 0;
    this.legs.forEach((l, i) => {
      const g = this.gait(l);
      const a0 = (i / 6) * Math.PI * 2 + Math.PI / 6;
      // yaw swing moves the foot tangentially; pick the sign that carries it toward +z
      l.hip.rotation.y = a0 - g.a * Math.sign(Math.sin(a0));
      l.hip.position.y = -6 + g.lift * 14 * this.walk;
      if (l.u < 0.5) bob += Math.sin(l.u * Math.PI * 2) * 0.6;
    });
    this.platform.position.y = 166 + bob * this.walk;
    this.platform.rotation.z = Math.sin(this.phase * Math.PI * 2) * 0.012 * this.walk;
    this.platform.rotation.x = Math.cos(this.phase * Math.PI * 4) * 0.006 * this.walk;
  }
}

/** Lerp helper exported for cutscene scripting. */
export function setPilgrimPose(p: Pilgrim, k: Partial<Pick<Pilgrim, 'kneel' | 'chestOpen' | 'headYaw' | 'headPitch' | 'reach' | 'raiseArms'>>, t = 1): void {
  for (const [key, v] of Object.entries(k) as [keyof typeof k, number][]) {
    (p as unknown as Record<string, number>)[key] = lerp((p as unknown as Record<string, number>)[key], v, clamp(t, 0, 1));
  }
}

export { merge };
