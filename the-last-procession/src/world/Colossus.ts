import * as THREE from 'three';
import { colossusMaterial, glowMaterial } from '../gfx/Materials';
import { addOutline } from '../gfx/Toon';
import { box, bell, blade, cyl, lathe, merge, rng, sph, span, tint, torus, tube, xf } from './Kit';
import { clamp, damp, easeInOut, lerp } from '../util/math';

/**
 * The Processionals. Each colossus is a hierarchy of separated, panel-plated
 * segments floating around glowing joints. Legs are true two-bone IK chains:
 * every foot is planted in world space during stance and travels on an arc to
 * a landing point computed when the swing starts, so feet never skate and the
 * landing spot is known in advance (gameplay telegraphs read it).
 */

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpM = new THREE.Matrix4();

export interface CLeg {
  /** hip anchor inside the body hierarchy */
  hip: THREE.Object3D;
  upper: THREE.Object3D;
  lower: THREE.Object3D;
  knee: THREE.Object3D;
  foot: THREE.Object3D;
  L1: number;
  L2: number;
  /** knee pole direction in root space */
  pole: THREE.Vector3;
  /** stance foot position in root space */
  rest: THREE.Vector3;
  offset: number;
  plant: THREE.Vector3;
  from: THREE.Vector3;
  to: THREE.Vector3;
  swinging: boolean;
  u: number;
  lift: number;
  /** optional override target (root space) blended by overrideW */
  override: THREE.Vector3 | null;
  overrideW: number;
  /** current foot position in root space after IK */
  readonly local: THREE.Vector3;
}

export abstract class Colossus {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly legs: CLeg[] = [];
  readonly hull: ReturnType<typeof colossusMaterial>;
  readonly glowMat: THREE.MeshBasicMaterial;
  heading = 0;
  speed = 8;
  walk = 0;
  walkTarget = 0;
  phase = 0;
  stride = 50;
  duty = 0.55;
  stepHeight = 12;
  holdPosition = false;
  time = 0;
  onStomp: ((pos: THREE.Vector3, leg: number) => void) | null = null;
  protected readonly spinners: { obj: THREE.Object3D; axis: 'x' | 'y' | 'z'; speed: number }[] = [];
  private rate = 0;

  constructor(
    o: { panel: number; glow: string; metal?: number; rough?: number; grime?: string; moss?: number; haze?: number },
    readonly far = false,
  ) {
    this.hull = colossusMaterial({ panel: o.panel, glow: new THREE.Color(o.glow), metal: o.metal, rough: o.rough, grime: o.grime, moss: o.moss, haze: o.haze });
    this.glowMat = glowMaterial(o.glow, 3);
    this.root.add(this.body);
  }

  setGlow(color: THREE.ColorRepresentation, intensity: number): void {
    const c = new THREE.Color(color);
    this.glowMat.color.copy(c).multiplyScalar(intensity);
    this.hull.userData.glowColor.value.copy(c);
    this.hull.userData.glow.value = intensity / 3;
  }

  // -------------------------------------------------------------- building helpers
  protected part(geos: THREE.BufferGeometry[], parent: THREE.Object3D, glow = false): THREE.Mesh {
    const m = new THREE.Mesh(merge(geos), glow ? this.glowMat : this.hull);
    m.castShadow = !glow && !this.far;
    m.receiveShadow = !this.far;
    parent.add(m);
    if (!glow) addOutline(m, this.far ? 0.5 : 0.35, 1.2);
    return m;
  }

  protected addLeg(o: { hip: THREE.Object3D; L1: number; L2: number; pole: THREE.Vector3; rest: THREE.Vector3; offset: number }): CLeg {
    const mk = () => {
      const g = new THREE.Group();
      this.root.add(g);
      return g;
    };
    const leg: CLeg = {
      hip: o.hip,
      upper: mk(),
      lower: mk(),
      knee: mk(),
      foot: mk(),
      L1: o.L1,
      L2: o.L2,
      pole: o.pole.clone().normalize(),
      rest: o.rest.clone(),
      offset: o.offset,
      plant: new THREE.Vector3(),
      from: new THREE.Vector3(),
      to: new THREE.Vector3(),
      swinging: false,
      u: 0,
      lift: 0,
      override: null,
      overrideW: 0,
      local: new THREE.Vector3(),
    };
    this.legs.push(leg);
    return leg;
  }

  /** Call after placing the root: plants every foot at its rest spot. */
  settle(): void {
    this.root.position.y = this.root.position.y || 0;
    this.root.rotation.y = this.heading;
    this.root.updateMatrixWorld(true);
    for (const l of this.legs) {
      l.plant.copy(l.rest).applyMatrix4(this.root.matrixWorld).setY(this.root.position.y);
      l.swinging = false;
    }
    this.update(0, this.time);
  }

  footWorld(i: number, out = new THREE.Vector3()): THREE.Vector3 {
    return this.legs[i].foot.getWorldPosition(out);
  }

  /** Where a swinging foot will land (exact) and how far through the swing it is. */
  predictLanding(i: number, out = new THREE.Vector3()): { pos: THREE.Vector3; progress: number } | null {
    const l = this.legs[i];
    if (!l.swinging) return null;
    return { pos: out.copy(l.to), progress: (l.u - this.duty) / (1 - this.duty) };
  }

  // -------------------------------------------------------------- simulation
  private readonly lastRoot = new THREE.Vector3(1e9, 0, 0);
  private lastHeading = 0;

  update(dt: number, time: number): void {
    this.time = time;
    // scripted teleports (cuts): re-plant every foot instead of stretching legs
    if (this.legs.length && (this.root.position.distanceTo(this.lastRoot) > this.stride * 0.8 || Math.abs(this.heading - this.lastHeading) > 0.6)) {
      this.root.rotation.y = this.heading;
      this.root.updateMatrixWorld(true);
      for (const l of this.legs) {
        l.plant.copy(l.rest).applyMatrix4(this.root.matrixWorld).setY(this.root.position.y);
        l.swinging = false;
      }
    }
    this.walk += (this.walkTarget - this.walk) * damp(0.8, dt);
    if (this.walk < 0.003 && this.walkTarget === 0) this.walk = 0;
    const v = this.speed * this.walk;
    const anySwing = this.legs.some((l) => l.swinging);
    const minRate = anySwing ? (0.45 * this.speed) / this.stride : 0;
    this.rate = Math.max(v / this.stride, minRate);
    const prevPhase = this.phase;
    this.phase += dt * this.rate;
    this.root.rotation.y = this.heading;
    if (!this.holdPosition && v > 0) {
      this.root.position.x += Math.sin(this.heading) * v * dt;
      this.root.position.z += Math.cos(this.heading) * v * dt;
    }
    this.root.updateMatrixWorld(true);
    const fwdW = tmpA.set(Math.sin(this.heading), 0, Math.cos(this.heading));
    for (let i = 0; i < this.legs.length; i++) {
      const l = this.legs[i];
      const u0 = (((prevPhase + l.offset) % 1) + 1) % 1;
      const u = (((this.phase + l.offset) % 1) + 1) % 1;
      l.u = u;
      const enteringSwing = this.rate > 0 && ((u0 < this.duty && u >= this.duty) || (u < u0 && u >= this.duty));
      const landed = l.swinging && (u < u0 || u < this.duty);
      if (landed) {
        l.swinging = false;
        l.plant.copy(l.to);
        if (this.walk > 0.04) this.onStomp?.(l.plant.clone(), i);
      }
      if (enteringSwing && !l.swinging && (this.walk > 0.01 || this.needsStep(l))) {
        l.swinging = true;
        l.from.copy(l.plant);
        const tRem = (1 - u) / Math.max(1e-4, this.rate);
        const adv = this.holdPosition ? 0 : v * tRem;
        const reach = (v / Math.max(1e-4, this.rate)) * this.duty * 0.5;
        tmpB.copy(l.rest).applyAxisAngle(Y, this.heading);
        l.to.copy(this.root.position).addScaledVector(fwdW, adv + reach).add(tmpB);
        l.to.y = this.root.position.y;
      }
    }
    for (const s of this.spinners) s.obj.rotation[s.axis] += s.speed * dt;
    this.pose(dt);
    this.root.updateMatrixWorld(true);
    this.solveLegs();
    this.lastRoot.copy(this.root.position);
    this.lastHeading = this.heading;
  }

  private needsStep(l: CLeg): boolean {
    tmpB.copy(l.rest).applyMatrix4(this.root.matrixWorld);
    return tmpB.distanceTo(l.plant) > this.stride * 0.15;
  }

  /** Swing amount (0..1 arc height) for a leg, for body bob. */
  protected liftOf(l: CLeg): number {
    if (!l.swinging) return 0;
    const s = (l.u - this.duty) / (1 - this.duty);
    return Math.sin(clamp(s, 0, 1) * Math.PI);
  }

  protected abstract pose(dt: number): void;

  private solveLegs(): void {
    const inv = tmpM.copy(this.root.matrixWorld).invert();
    for (const l of this.legs) {
      // foot target (world → root space)
      const F = new THREE.Vector3();
      if (l.swinging) {
        const s = clamp((l.u - this.duty) / (1 - this.duty), 0, 1);
        F.lerpVectors(l.from, l.to, easeInOut(s));
        l.lift = Math.sin(s * Math.PI);
        F.y += l.lift * this.stepHeight * Math.max(0.35, this.walk);
      } else {
        F.copy(l.plant);
        l.lift = 0;
      }
      F.applyMatrix4(inv);
      if (l.override && l.overrideW > 0) F.lerp(l.override, l.overrideW);
      l.local.copy(F);
      const H = l.hip.getWorldPosition(new THREE.Vector3()).applyMatrix4(inv);
      // two-bone IK with a pole
      const d = F.clone().sub(H);
      let len = d.length();
      const dir = d.divideScalar(Math.max(1e-6, len));
      len = clamp(len, Math.abs(l.L1 - l.L2) + 0.01, l.L1 + l.L2 - 0.01);
      const a = (l.L1 * l.L1 + len * len - l.L2 * l.L2) / (2 * len);
      const h = Math.sqrt(Math.max(0, l.L1 * l.L1 - a * a));
      const pole = l.pole.clone().addScaledVector(dir, -l.pole.dot(dir)).normalize();
      const K = H.clone().addScaledVector(dir, a).addScaledVector(pole, h);
      const Fc = H.clone().addScaledVector(dir, len);
      orient(l.upper, H, K, pole);
      orient(l.lower, K, Fc, pole);
      l.knee.position.copy(K);
      l.foot.position.copy(Fc);
      l.foot.rotation.set(-l.lift * 0.25, 0, 0);
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
    this.hull.dispose();
    this.glowMat.dispose();
  }
}

/** Place a segment whose geometry runs along −Y from its origin. */
function orient(o: THREE.Object3D, from: THREE.Vector3, to: THREE.Vector3, pole: THREE.Vector3): void {
  const y = from.clone().sub(to).normalize();
  const z = pole.clone().addScaledVector(y, -pole.dot(y)).normalize();
  const x = new THREE.Vector3().crossVectors(y, z);
  o.position.copy(from);
  o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// palette
const C = {
  ivory: '#d9cfbd',
  ivoryDark: '#a89c88',
  bone: '#c8bba2',
  gold: '#c9a050',
  goldDark: '#8a6a30',
  dark: '#26222a',
  slate: '#5c6470',
  verd: '#5d8a7a',
  verdDark: '#3a5a52',
  bronze: '#9a6a3a',
  iron: '#4a4c54',
};

/** A floating joint: dark ball + glowing equator ring. */
function jointGeo(r: number, seg: number): { hull: THREE.BufferGeometry[]; glow: THREE.BufferGeometry[] } {
  return {
    hull: [tint(sph(r, seg, Math.round(seg * 0.6)), C.dark)],
    glow: [tint(torus(r * 1.04, r * 0.07, 6, seg), '#fff')],
  };
}

// =====================================================================================
// THE PILGRIM — a hooded, faceless monk ~200 m tall: robe of hanging blades,
// petal doors over a cradle of light, a triple halo of turning glyph rings.
// =====================================================================================
export class Pilgrim extends Colossus {
  readonly pelvis = new THREE.Group();
  readonly torso = new THREE.Group();
  readonly neck = new THREE.Group();
  readonly head = new THREE.Group();
  readonly halo = new THREE.Group();
  readonly cradleAnchor = new THREE.Object3D();
  readonly palmR: THREE.Group;
  readonly palmL: THREE.Group;
  private readonly doorL = new THREE.Group();
  private readonly doorR = new THREE.Group();
  private readonly arms: { shoulder: THREE.Group; elbow: THREE.Group; wrist: THREE.Group; fingers: THREE.Group[]; side: number }[] = [];
  private readonly robe: THREE.InstancedMesh;
  private readonly robeAz: number[] = [];
  private readonly robeLen: number[] = [];
  private readonly sats: { o: THREE.Object3D; r: number; tilt: number; sp: number; ph: number }[] = [];
  kneel = 0;
  chestOpen = 0;
  headYaw = 0;
  headPitch = 0;
  reach = 0;
  raiseArms = 0;
  private readonly H0 = 86;

  constructor(far = false) {
    super({ panel: 9, glow: '#9ff7ff', grime: '#6a5a44', moss: 0.45 }, far);
    this.speed = 8;
    this.stride = 64;
    this.duty = 0.56;
    this.stepHeight = 16;
    const seg = far ? 20 : 44;
    this.body.add(this.pelvis);
    this.pelvis.position.y = this.H0;

    // ---- pelvis girdle + robe of blades
    this.part([tint(lathe([[17, -6], [21, -3], [22, 2], [19, 6]], seg), C.ivoryDark), tint(xf(torus(21.6, 1.1, 8, seg), [0, -2.5, 0], [Math.PI / 2, 0, 0]), C.gold), tint(xf(torus(19.5, 0.8, 8, seg), [0, 5, 0], [Math.PI / 2, 0, 0]), C.gold)], this.pelvis);
    const nBlades = far ? 48 : 110;
    const bladeGeo = merge([tint(blade(1, 0.7, 1, 0.6, 3), C.ivory), tint(xf(blade(0.25, 0.2, 1.15, 0.7, 1), [0, 0, 0.02]), C.gold)]);
    bladeGeo.translate(0, -1, 0); // hang down from the pivot
    this.robe = new THREE.InstancedMesh(bladeGeo, this.hull, nBlades);
    this.robe.castShadow = !far;
    this.robe.receiveShadow = !far;
    this.pelvis.add(this.robe);
    addOutline(this.robe, 0.3, 1.2);
    const r = rng(7);
    for (let i = 0; i < nBlades; i++) {
      const a = (i / nBlades) * Math.PI * 2 + (r() - 0.5) * 0.02;
      this.robeAz.push(a);
      // longer at the back, shorter at the front so the stride reads
      this.robeLen.push(52 + (1 - Math.cos(a)) * 6 + r() * 6);
    }

    // ---- torso: bell-shaped chest with a window and petal doors
    this.torso.position.y = 4;
    this.pelvis.add(this.torso);
    const prof: [number, number][] = [[16, 0], [17.5, 8], [22, 20], [25.5, 32], [26, 40], [23, 48], [15, 54], [9, 57]];
    const W = 0.62; // half-width of the window (radians)
    this.part(
      [
        tint(lathe(prof, seg, W, Math.PI * 2 - 2 * W), C.ivory),
        // recess behind the doors
        tint(lathe(prof.map(([rr, y]) => [rr * 0.82, y]), seg, -W, 2 * W), C.dark),
        // vertical rib bands
        ...Array.from({ length: 10 }, (_, k) => {
          const a = W + 0.1 + (k / 10) * (Math.PI * 2 - 2 * W - 0.2);
          return tint(tube(prof.map(([rr, y]) => new THREE.Vector3(Math.sin(a) * (rr + 0.5), y, Math.cos(a) * (rr + 0.5))), prof.map(() => 0.6), 6), C.gold);
        }),
        tint(xf(torus(26.3, 1, 8, seg), [0, 38, 0], [Math.PI / 2, 0, 0]), C.gold),
        tint(xf(torus(17.8, 1.2, 8, seg), [0, 8, 0], [Math.PI / 2, 0, 0]), C.gold),
        // collar
        tint(xf(lathe([[10, 0], [13, 3], [12, 7], [8.5, 8]], seg), [0, 52, 0]), C.goldDark),
      ],
      this.torso,
    );
    // doors (hinged at the window edges)
    const rm = 23;
    for (const [door, sgn] of [[this.doorL, 1], [this.doorR, -1]] as const) {
      const g = lathe(prof.map(([rr, y]) => [rr + 0.6, y]), Math.round(seg / 6), sgn > 0 ? 0 : -W, W);
      const hinge = new THREE.Vector3(Math.sin(W * sgn) * rm, 0, Math.cos(W) * rm);
      g.translate(-hinge.x, 0, -hinge.z);
      const trim = tube(prof.map(([rr, y]) => new THREE.Vector3(Math.sin(W * 0.5 * sgn) * (rr + 1.2) - hinge.x, y, Math.cos(W * 0.5) * (rr + 1.2) - hinge.z)), prof.map(() => 0.5), 6);
      door.position.copy(hinge);
      this.part([tint(g, C.ivory), tint(trim, C.gold)], door);
      this.torso.add(door);
    }
    // cradle of light
    const cradle = new THREE.Group();
    cradle.position.set(0, 30, 6);
    this.torso.add(cradle);
    this.part([tint(sph(5.2, 24, 16), '#fff')], cradle, true);
    this.part([tint(torus(7.5, 0.35, 6, 40), C.gold), tint(xf(torus(8.5, 0.3, 6, 40), [0, 0, 0], [Math.PI / 2, 0, 0]), C.gold)], cradle);
    this.spinners.push({ obj: cradle, axis: 'y', speed: 0.25 });
    this.cradleAnchor.position.set(0, 30, 14);
    this.torso.add(this.cradleAnchor);

    // ---- shoulders + arms (FK)
    for (const side of [1, -1]) {
      const sh = new THREE.Group();
      sh.position.set(side * 31, 45, -1);
      this.torso.add(sh);
      // floating pauldron above the joint
      const j = jointGeo(8, seg);
      this.part(j.hull, sh);
      this.part(j.glow, sh, true);
      this.part([tint(xf(lathe([[14, 0], [13, 4], [9, 9], [0.1, 11]], seg), [side * 2, 4, 0], [0, 0, side * -0.35]), C.ivory), tint(xf(torus(13.6, 0.7, 6, seg), [side * 2, 4.4, 0], [Math.PI / 2, 0, side * -0.35]), C.gold)], sh);
      // upper arm with a hanging bell sleeve
      this.part(
        [
          tint(xf(lathe([[5.5, -44], [6.5, -30], [7, -12], [6, -2]], seg), [0, 0, 0]), C.slate),
          tint(lathe([[16, -50], [15, -40], [12, -26], [9.5, -10], [9, -3], [0.1, -1]], seg), C.ivory),
          tint(xf(torus(15.8, 0.8, 6, seg), [0, -49, 0], [Math.PI / 2, 0, 0]), C.gold),
        ],
        sh,
      );
      const el = new THREE.Group();
      el.position.y = -46;
      sh.add(el);
      const je = jointGeo(5, seg);
      this.part(je.hull, el);
      this.part(je.glow, el, true);
      this.part([tint(lathe([[3.6, -40], [5.5, -30], [6, -12], [5, -5]], seg), C.ivory), tint(xf(cyl(6.3, 6.3, 3, seg), [0, -14, 0]), C.gold), tint(xf(cyl(4.6, 4.6, 2, seg), [0, -36, 0]), C.goldDark)], el);
      const wr = new THREE.Group();
      wr.position.y = -42;
      el.add(wr);
      // palm + long jointed fingers
      this.part([tint(xf(box(9, 11, 3.2), [0, -6, 0]), C.ivory), tint(xf(sph(3, 16, 10), [0, 0, 0]), C.dark)], wr);
      const fingers: THREE.Group[] = [];
      for (let f = 0; f < 4; f++) {
        const fg = new THREE.Group();
        fg.position.set((f - 1.5) * 2.2 * side, -11.5, 0);
        wr.add(fg);
        let parent: THREE.Object3D = fg;
        const lens = [6, 5, 4].map((v) => v * (f === 0 || f === 3 ? 0.85 : 1));
        for (let k = 0; k < 3; k++) {
          const seg2 = new THREE.Group();
          if (k > 0) seg2.position.y = -lens[k - 1] - 0.4;
          parent.add(seg2);
          this.part([tint(xf(cyl(0.85 - k * 0.15, 0.95 - k * 0.15, lens[k], 8), [0, -lens[k] / 2, 0]), k === 2 ? C.gold : C.ivory)], seg2);
          parent = seg2;
          if (k === 0) fingers.push(seg2);
        }
      }
      const thumb = new THREE.Group();
      thumb.position.set(side * 5, -3, 1.5);
      thumb.rotation.z = side * 0.6;
      wr.add(thumb);
      this.part([tint(xf(cyl(0.9, 1.1, 7, 8), [0, -3.5, 0]), C.ivory)], thumb);
      this.arms.push({ shoulder: sh, elbow: el, wrist: wr, fingers, side });
    }
    this.palmL = this.arms[0].wrist;
    this.palmR = this.arms[1].wrist;

    // ---- neck: floating vertebrae
    this.neck.position.set(0, 57, -1);
    this.torso.add(this.neck);
    const nk: THREE.BufferGeometry[] = [];
    const nkg: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 4; k++) {
      nk.push(tint(xf(cyl(6.2 - k * 0.4, 6 - k * 0.4, 2.4, seg), [0, 1.6 + k * 3.4, 0]), k % 2 ? C.ivory : C.ivoryDark));
      nkg.push(tint(xf(cyl(4.4, 4.4, 1, seg), [0, 3.3 + k * 3.4, 0]), '#fff'));
    }
    this.part(nk, this.neck);
    this.part(nkg, this.neck, true);

    // ---- head: hood + faceless mask with a single glowing slit
    this.head.position.y = 14;
    this.neck.add(this.head);
    this.part(
      [
        // the mask (egg)
        tint(lathe([[0.1, -2], [6, 0], [8.4, 6], [8.6, 13], [7.4, 19], [4.5, 23], [0.1, 24.5]], seg), C.ivory),
        // hood shell, open at the front
        tint(lathe([[12.5, -3], [13.2, 4], [13.6, 12], [12.4, 20], [9, 27], [3, 31], [0.2, 32]], seg, 1.0, Math.PI * 2 - 2.0), C.ivoryDark),
        tint(lathe([[12.0, -3], [12.7, 4], [13.1, 12], [11.9, 20], [8.6, 27], [2.8, 31], [0.2, 31.6]], seg, 1.0, Math.PI * 2 - 2.0).scale(0.97, 1, 0.97), C.dark),
        tint(xf(torus(13, 0.7, 6, seg, Math.PI * 2 - 2.0), [0, -3, 0], [Math.PI / 2, 0, Math.PI / 2 + 1.0]), C.gold),
      ],
      this.head,
    );
    this.part([tint(xf(box(0.9, 13, 1.2), [0, 10, 8.2]), '#fff'), tint(xf(box(5, 0.5, 1), [0, 15.5, 7.9]), '#fff')], this.head, true);
    // the halo: three counter-rotating glyph rings + orbiting satellites
    this.halo.position.set(0, 12, -14);
    this.head.add(this.halo);
    const radii = [21, 27.5, 34];
    radii.forEach((R, k) => {
      const ring = new THREE.Group();
      this.halo.add(ring);
      const g: THREE.BufferGeometry[] = [tint(torus(R, 0.55 + k * 0.15, 6, far ? 48 : 96), k === 1 ? C.gold : C.ivory)];
      const glyphs = 12 + k * 8;
      for (let n = 0; n < glyphs; n++) {
        const a = (n / glyphs) * Math.PI * 2;
        const L = n % 3 === 0 ? 3.6 : 1.8;
        g.push(tint(xf(box(0.7, L, 0.8), [Math.cos(a) * (R + L / 2 + 0.4), Math.sin(a) * (R + L / 2 + 0.4), 0], [0, 0, a - Math.PI / 2]), k === 1 ? C.goldDark : C.gold));
      }
      this.part(g, ring);
      this.spinners.push({ obj: ring, axis: 'z', speed: (k % 2 ? -1 : 1) * (0.05 + k * 0.025) });
    });
    const haloGlow = new THREE.Group();
    this.halo.add(haloGlow);
    this.part([tint(torus(24.2, 0.22, 4, far ? 48 : 96), '#fff'), tint(torus(31, 0.22, 4, far ? 48 : 96), '#fff')], haloGlow, true);
    for (let k = 0; k < 6; k++) {
      const o = new THREE.Group();
      this.part([tint(sph(1.4, 12, 8), '#fff')], o, true);
      this.part([tint(torus(2.4, 0.25, 5, 20), C.gold)], o);
      this.head.add(o);
      this.sats.push({ o, r: 22 + (k % 3) * 5, tilt: 0.4 + k * 0.33, sp: 0.18 + (k % 2) * 0.1, ph: k * 1.7 });
    }

    // ---- legs: pillar thighs + long greaved shins, joints floating in light
    for (const side of [1, -1]) {
      const hip = new THREE.Group();
      hip.position.set(side * 15, -4, 0);
      this.pelvis.add(hip);
      const leg = this.addLeg({ hip, L1: 46, L2: 46, pole: new THREE.Vector3(0, 0, 1), rest: new THREE.Vector3(side * 17, 0, 0), offset: side > 0 ? 0 : 0.5 });
      const jh = jointGeo(7.5, seg);
      this.part(jh.hull, leg.upper);
      this.part([tint(lathe([[7, -42], [9.5, -32], [10.5, -18], [9.5, -6]], seg), C.slate), ...[-12, -22, -32].map((y) => tint(xf(cyl(10.6, 10.9, 2.2, seg), [0, y, 0]), C.ivoryDark))], leg.upper);
      const jk = jointGeo(6.5, seg);
      this.part(jk.hull, leg.knee);
      this.part(jk.glow, leg.knee, true);
      this.part(
        [
          tint(lathe([[4.5, -44], [6, -38], [7.5, -22], [7.8, -8], [6, -3]], seg), C.ivory),
          // greave fin down the front
          tint(xf(blade(4, 2, 2.4, 1.2, 1), [0, -40, 6.4], [0, 0, 0], [1, 34, 1]), C.ivory),
          tint(xf(blade(1.2, 0.6, 2.8, 1.6, 1), [0, -40, 6.6], [0, 0, 0], [1, 34, 1]), C.gold),
          tint(xf(cyl(8, 8.2, 2, seg), [0, -10, 0]), C.gold),
          tint(xf(cyl(6.2, 6.4, 2, seg), [0, -38, 0]), C.gold),
        ],
        leg.lower,
      );
      // foot: tapered wedge with toe plates
      this.part(
        [
          tint(xf(blade(14, 10, 26, 18, 1), [0, 0, 2], [0, 0, 0], [1, 6, 1]), C.ivoryDark),
          tint(xf(box(12, 3, 6), [0, 1.5, 15]), C.ivory),
          tint(xf(box(10, 2.4, 4), [0, 1.2, 19.5]), C.gold),
          tint(xf(cyl(6, 7, 4, seg), [0, 6, -1]), C.ivory),
        ],
        leg.foot,
      );
    }
    this.root.add(this.body);
    this.settle();
  }

  protected pose(dt: number): void {
    const [lL, lR] = this.legs;
    const w = this.walk;
    const k = this.kneel;
    const t = this.time;
    const bob = (this.liftOf(lL) + this.liftOf(lR)) * 2.2 * w;
    const sway = Math.sin(this.phase * Math.PI * 2) * 2.4 * w;
    this.pelvis.position.set(sway * (1 - k), lerp(this.H0 - bob, 50, easeInOut(k)), lerp(0, -4, k));
    this.pelvis.rotation.set(0, Math.sin(this.phase * Math.PI * 2) * 0.05 * w, -sway * 0.006);
    // kneel: right knee to the ground, left foot forward (one-knee, like a knight)
    const kk = easeInOut(clamp(k * 1.2, 0, 1));
    lR.override = new THREE.Vector3(-17, 0, -44);
    lR.overrideW = kk;
    lL.override = new THREE.Vector3(17, 0, 24);
    lL.overrideW = kk;
    if (lR.overrideW > 0 && lR.overrideW < 1) lR.override.y += Math.sin(kk * Math.PI) * 10;
    this.torso.rotation.set(0.04 * w + 0.22 * k + this.reach * 0.18, -Math.sin(this.phase * Math.PI * 2) * 0.06 * w, sway * 0.004);
    // breathing
    this.torso.scale.setScalar(1 + Math.sin(t * 0.5) * 0.004);
    // doors
    const o = easeInOut(this.chestOpen);
    this.doorL.rotation.y = o * 1.75;
    this.doorR.rotation.y = -o * 1.75;
    // head
    this.neck.rotation.x = 0.1 * k - 0.04 * this.raiseArms;
    this.head.rotation.set(this.headPitch + 0.25 * k + Math.sin(t * 0.21) * 0.015, this.headYaw + Math.sin(t * 0.13) * 0.03, 0);
    this.halo.rotation.z = Math.sin(t * 0.1) * 0.05;
    // satellites
    for (const s of this.sats) {
      const a = t * s.sp + s.ph;
      s.o.position.set(Math.cos(a) * s.r, 12 + Math.sin(a) * s.r * Math.sin(s.tilt), Math.sin(a) * s.r * Math.cos(s.tilt) - 4);
    }
    // arms
    const swing = (l: typeof lL) => {
      const d = l.knee.position.clone().sub(l.hip.getWorldPosition(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().copy(this.root.matrixWorld).invert()));
      return Math.atan2(d.z, -d.y);
    };
    const sL = swing(lL);
    const sR = swing(lR);
    for (const a of this.arms) {
      const legSwing = a.side > 0 ? sL : sR;
      let sx = legSwing * 0.55 * w * (1 - k);
      let sz = a.side * (0.1 + 0.05 * Math.sin(t * 0.4));
      let ex = -0.25 - 0.1 * w;
      // kneel: hands come forward onto the raised knee
      sx = lerp(sx, a.side > 0 ? -0.75 : -0.35, k);
      sz = lerp(sz, a.side * 0.05, k);
      ex = lerp(ex, a.side > 0 ? -0.9 : -1.2, k);
      if (a.side < 0 && this.reach > 0) {
        sx = lerp(sx, -1.35, easeInOut(this.reach));
        sz = lerp(sz, -0.12, this.reach);
        ex = lerp(ex, -0.12, this.reach);
      }
      sx = lerp(sx, -2.75, this.raiseArms);
      sz = lerp(sz, a.side * 0.35, this.raiseArms);
      ex = lerp(ex, -0.2, this.raiseArms);
      a.shoulder.rotation.set(sx, 0, sz);
      a.elbow.rotation.set(ex, 0, 0);
      const palmUp = a.side < 0 ? this.reach : 0;
      a.wrist.rotation.set(lerp(-0.2, 0.25, palmUp), lerp(0, -Math.PI / 2, palmUp), 0);
      a.fingers.forEach((f, i) => (f.rotation.x = lerp(-0.25 - i * 0.05 - Math.sin(t * 0.3 + i) * 0.04, 0.15, palmUp)));
    }
    // robe blades follow the thighs, flare when kneeling
    const q = new THREE.Quaternion();
    const qa = new THREE.Quaternion();
    const qf = new THREE.Quaternion();
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const R0 = 20.6;
    for (let i = 0; i < this.robeAz.length; i++) {
      const a = this.robeAz[i];
      const sa = Math.sin(a);
      const ca = Math.cos(a);
      const wL = THREE.MathUtils.smoothstep(sa, -0.35, 0.8);
      const wR = THREE.MathUtils.smoothstep(-sa, -0.35, 0.8);
      const s = (sL * wL + sR * wR) / Math.max(1, wL + wR);
      const flare = 0.07 + Math.max(0, ca) * 0.04 + k * (0.35 + Math.max(0, ca) * 0.5) + Math.sin(t * 0.7 + i * 0.9) * 0.012;
      q.setFromAxisAngle(X, -s * 0.85);
      qa.setFromAxisAngle(Y, a);
      qf.setFromAxisAngle(X, -flare);
      q.multiply(qa).multiply(qf);
      p.set(sa * R0, -3, ca * R0);
      const len = this.robeLen[i] * (1 - k * 0.12);
      sc.set(2.6, len, 0.7);
      m.compose(p, q, sc);
      this.robe.setMatrixAt(i, m);
    }
    this.robe.instanceMatrix.needsUpdate = true;
    void dt;
  }
}

// =====================================================================================
// THE ANTLERED — a stag of floating ribs around a lantern-heart, a hill-village
// on its back, antlers branching into hanging lights.
// =====================================================================================
export class Antlered extends Colossus {
  readonly spine = new THREE.Group();
  readonly head = new THREE.Group();
  readonly neck = new THREE.Group();
  readonly village = new THREE.Group();
  headPitch = 0;
  rear = 0;
  private readonly core = new THREE.Group();
  private readonly lanterns: THREE.Object3D[] = [];

  constructor(far = false) {
    super({ panel: 7, glow: '#ffc46a', grime: '#4a4a32', moss: 0.9 }, far);
    this.speed = 9;
    this.stride = 46;
    this.duty = 0.62;
    this.stepHeight = 9;
    const seg = far ? 16 : 32;
    this.body.add(this.spine);
    this.spine.position.set(0, 68, 0);
    // vertebrae arc
    const vg: THREE.BufferGeometry[] = [];
    const vglow: THREE.BufferGeometry[] = [];
    for (let i = 0; i <= 14; i++) {
      const z = -52 + i * 7.6;
      const y = 4 + Math.sin((i / 14) * Math.PI) * 5;
      vg.push(tint(xf(cyl(3.6, 3.6, 4.2, seg), [0, y, z], [Math.PI / 2, 0, 0]), C.verd));
      vg.push(tint(xf(blade(2.2, 0.6, 3, 1.4, 1), [0, y + 2, z], [0, 0, 0], [1, 6 + Math.sin((i / 14) * Math.PI) * 4, 1]), C.verdDark));
      vglow.push(tint(xf(cyl(2.4, 2.4, 1, seg), [0, y, z + 3.4], [Math.PI / 2, 0, 0]), '#fff'));
    }
    this.part(vg, this.spine);
    this.part(vglow, this.spine, true);
    // ribs: hanging half-hoops
    const ribs: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 9; i++) {
      const z = -34 + i * 8.6;
      const R = 13 + Math.sin(((i + 0.5) / 9) * Math.PI) * 9;
      const arc = tint(xf(torus(R, 1.3, 6, seg, Math.PI * 1.1), [0, 5 - R * 0.15, z], [0, 0, Math.PI + (-0.05 * Math.PI)]), i % 2 ? C.verd : C.bronze);
      ribs.push(arc);
    }
    ribs.push(tint(tube(Array.from({ length: 10 }, (_, i) => new THREE.Vector3(0, -15 - Math.sin((i / 9) * Math.PI) * 5, -34 + i * 7.7)), Array(10).fill(1.6), 8), C.bronze));
    this.part(ribs, this.spine);
    // the lantern heart
    this.core.position.set(0, -6, 2);
    this.spine.add(this.core);
    this.part([tint(sph(7.5, 24, 16), '#fff')], this.core, true);
    const cr1 = new THREE.Group();
    const cr2 = new THREE.Group();
    this.core.add(cr1, cr2);
    this.part([tint(torus(10.5, 0.5, 6, 48), C.gold)], cr1);
    this.part([tint(xf(torus(12.5, 0.4, 6, 48), [0, 0, 0], [Math.PI / 2, 0, 0]), C.gold)], cr2);
    this.spinners.push({ obj: cr1, axis: 'y', speed: 0.3 }, { obj: cr2, axis: 'x', speed: -0.22 });
    // shoulder + haunch masses (plated shells)
    for (const [z, s] of [[44, 1], [-46, 1.1]] as const) {
      this.part(
        [
          tint(xf(sph(15 * s, seg, 16), [0, 0, z], [0, 0, 0], [1, 0.85, 1.05]), C.verd),
          tint(xf(torus(15.2 * s, 0.8, 6, seg), [0, 0, z], [Math.PI / 2, 0, 0], [1, 1, 1]), C.gold),
          tint(xf(sph(15.6 * s, seg, 8, ), [0, 1.5, z], [0, 0, 0], [0.96, 0.4, 1.0]), C.verdDark),
        ],
        this.spine,
      );
    }
    // village on its back
    this.village.position.set(0, 12, -4);
    this.spine.add(this.village);
    this.buildVillage(far);
    // tail
    this.part([tint(tube([0, 1, 2, 3, 4, 5].map((i) => new THREE.Vector3(0, 2 - i * 3 - i * i * 0.4, -60 - i * 3)), [3, 2.6, 2.2, 1.8, 1.4, 0.6], 8), C.verd)], this.spine);

    // neck + head
    this.neck.position.set(0, 6, 52);
    this.spine.add(this.neck);
    const nk: THREE.BufferGeometry[] = [];
    const nkg: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 7; i++) {
      const p = new THREE.Vector3(0, i * 3.4 + Math.sin(i * 0.4) * 1.5, i * 4.2);
      nk.push(tint(xf(cyl(5.4 - i * 0.3, 5.4 - i * 0.3, 3.2, seg), [p.x, p.y, p.z], [0.9, 0, 0]), i % 2 ? C.verd : C.verdDark));
      nkg.push(tint(xf(torus(4.2, 0.22, 4, seg), [p.x, p.y + 1.4, p.z + 2.0], [0.9 + Math.PI / 2, 0, 0]), '#fff'));
    }
    this.part(nk, this.neck);
    this.part(nkg, this.neck, true);
    this.head.position.set(0, 26, 30);
    this.neck.add(this.head);
    this.part(
      [
        // long skull pointing forward-down
        tint(xf(lathe([[0.2, 0], [5, 3], [7.5, 9], [8, 16], [6.5, 22], [3.5, 26], [0.2, 28]], seg), [0, 0, -4], [Math.PI / 2 + 0.35, 0, 0]), C.bone),
        tint(xf(box(9, 2, 18), [0, -5, 8], [0.35, 0, 0]), C.verdDark),
        tint(xf(torus(7.6, 0.5, 6, seg), [0, 2, 2], [0.35, 0, 0]), C.gold),
      ],
      this.head,
    );
    this.part([tint(xf(box(1, 1, 6), [4.6, 4, 8], [0.35, 0.2, 0]), '#fff'), tint(xf(box(1, 1, 6), [-4.6, 4, 8], [0.35, -0.2, 0]), '#fff')], this.head, true);
    // antlers: fractal branches with hanging lanterns
    const ant: THREE.BufferGeometry[] = [];
    const lanternGlow: THREE.BufferGeometry[] = [];
    const chains: THREE.BufferGeometry[] = [];
    const r = rng(11);
    const grow = (p: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
      const pts: THREE.Vector3[] = [];
      const radii: number[] = [];
      const n = 5;
      const bend = new THREE.Vector3((r() - 0.5) * 0.3, 0.12, -0.1);
      let d = dir.clone();
      let q = p.clone();
      for (let i = 0; i <= n; i++) {
        pts.push(q.clone());
        radii.push(rad * (1 - (i / n) * 0.45));
        d = d.clone().add(bend.clone().multiplyScalar(0.25)).normalize();
        q = q.clone().addScaledVector(d, len / n);
      }
      ant.push(tint(tube(pts, radii, far ? 5 : 7), depth > 2 ? C.bone : C.ivoryDark));
      const tip = pts[n];
      if (depth === 0) {
        // lantern hanging from the tip
        const hang = 4 + r() * 4;
        chains.push(tint(span(cyl(0.12, 0.12, 1, 4), tip, tip.clone().add(new THREE.Vector3(0, -hang, 0))), C.dark));
        lanternGlow.push(tint(xf(sph(1.1, 10, 8), [tip.x, tip.y - hang - 1, tip.z]), '#fff'));
        chains.push(tint(xf(cyl(1.3, 1.3, 0.5, 8), [tip.x, tip.y - hang, tip.z]), C.gold));
        return;
      }
      const kids = depth > 2 ? 2 : 3;
      for (let k = 0; k < kids; k++) {
        const nd = d.clone().applyAxisAngle(new THREE.Vector3(r() - 0.5, r() * 0.2, r() - 0.5).normalize(), 0.5 + r() * 0.5);
        nd.y = Math.abs(nd.y) + 0.2;
        grow(pts[Math.max(2, n - 1 - k)], nd.normalize(), len * (0.6 + r() * 0.1), rad * 0.62, depth - 1);
      }
    };
    for (const side of [1, -1]) grow(new THREE.Vector3(side * 4, 6, 0), new THREE.Vector3(side * 0.7, 0.8, -0.3).normalize(), 26, 1.8, far ? 2 : 3);
    this.part(ant, this.head);
    this.part(chains, this.head);
    this.part(lanternGlow, this.head, true);

    // legs: front knees forward, hind hocks back
    const legs: [number, number, number, number, number][] = [
      // side, z, L1, L2, offset
      [-1, -44, 36, 38, 0],
      [-1, 42, 34, 36, 0.25],
      [1, -44, 36, 38, 0.5],
      [1, 42, 34, 36, 0.75],
    ];
    for (const [side, z, L1, L2, off] of legs) {
      const hip = new THREE.Group();
      hip.position.set(side * 11, -6, z);
      this.spine.add(hip);
      const front = z > 0;
      const leg = this.addLeg({ hip, L1, L2, pole: new THREE.Vector3(side * 0.1, 0, front ? 1 : -1), rest: new THREE.Vector3(side * 15, 0, z + (front ? 4 : -2)), offset: off });
      const j = jointGeo(5.5, seg);
      this.part(j.hull, leg.upper);
      this.part([tint(lathe([[3.4, -L1 + 2], [5.4, -L1 * 0.6], [6.4, -L1 * 0.25], [5.5, -4]], seg), C.verd), tint(xf(cyl(6.6, 6.6, 1.6, seg), [0, -L1 * 0.3, 0]), C.gold)], leg.upper);
      const jk = jointGeo(4, seg);
      this.part(jk.hull, leg.knee);
      this.part(jk.glow, leg.knee, true);
      this.part([tint(lathe([[2.4, -L2 + 3], [2.8, -L2 * 0.6], [3.6, -L2 * 0.2], [3.4, -3]], seg), C.bone), ...[0.35, 0.55, 0.75].map((f) => tint(xf(cyl(3.4, 3.2, 1.2, seg), [0, -L2 * f, 0]), C.verdDark))], leg.lower);
      this.part([tint(xf(lathe([[6, 0], [6.4, 1], [5, 4], [3, 6]], seg), [0, 0, 0]), C.verdDark), tint(xf(torus(6.1, 0.5, 5, seg), [0, 0.8, 0], [Math.PI / 2, 0, 0]), C.gold)], leg.foot);
    }
    this.settle();
  }

  private buildVillage(far: boolean): void {
    const r = rng(23);
    const deck: THREE.BufferGeometry[] = [];
    const houses: THREE.BufferGeometry[] = [];
    const lights: THREE.BufferGeometry[] = [];
    // terraced decks following the spine
    for (let i = 0; i < 6; i++) {
      const z = -38 + i * 15;
      const y = Math.sin(((i + 0.5) / 6) * Math.PI) * 3;
      deck.push(tint(xf(box(24 - Math.abs(i - 2.5) * 2, 2, 15), [0, y, z]), '#7a6a52'));
      deck.push(tint(xf(box(25 - Math.abs(i - 2.5) * 2, 0.6, 15.6), [0, y - 1.2, z]), C.goldDark));
    }
    if (far) {
      this.part(deck, this.village);
      return;
    }
    const walls = ['#e6dcc6', '#d9c7a4', '#c8b8a0', '#e8d8b8'];
    const roofs = ['#8a3a2a', '#6a4a3a', '#3a5a6a', '#9a5a3a'];
    for (let i = 0; i < 22; i++) {
      const z = -42 + r() * 82;
      const x = (r() - 0.5) * 18;
      const y = Math.sin(((z + 42) / 90) * Math.PI) * 3 + 1;
      const w = 3 + r() * 3;
      const d = 3 + r() * 3;
      const h = 3 + r() * 4;
      const rot = (r() - 0.5) * 0.4;
      houses.push(tint(xf(box(w, h, d), [x, y + h / 2, z], [0, rot, 0]), walls[i % 4]));
      const roof = new THREE.ConeGeometry(Math.max(w, d) * 0.78, 2.5 + r() * 2, 4);
      houses.push(tint(xf(roof, [x, y + h + 1.4, z], [0, rot + Math.PI / 4, 0]), roofs[i % 4]));
      if (r() > 0.4) lights.push(tint(xf(box(0.9, 1.1, 0.2), [x + Math.cos(rot) * 0.6, y + h * 0.5, z + d / 2 + 0.05]), '#fff'));
    }
    // bell tower
    houses.push(tint(xf(box(4, 16, 4), [0, 11, 6]), '#d6c8a8'));
    houses.push(tint(xf(new THREE.ConeGeometry(3.6, 6, 4), [0, 22, 6], [0, Math.PI / 4, 0]), '#3a5a6a'));
    houses.push(tint(xf(bell(1.3, 12), [0, 15.4, 6]), C.gold));
    for (let i = 0; i < 14; i++) {
      const z = -40 + i * 6;
      for (const s of [1, -1]) lights.push(tint(xf(sph(0.45, 8, 6), [s * (10 - Math.abs(z) * 0.05), 4, z]), '#fff'));
    }
    this.part(deck, this.village);
    this.part(houses, this.village);
    const lm = this.part(lights, this.village, true);
    this.lanterns.push(lm);
  }

  protected pose(dt: number): void {
    const w = this.walk;
    let lift = 0;
    for (const l of this.legs) lift += this.liftOf(l);
    this.spine.position.y = 68 - lift * 1.2 * w + this.rear * 6;
    this.spine.rotation.set(-this.rear * 0.42 + Math.sin(this.phase * Math.PI * 4) * 0.008 * w, 0, Math.sin(this.phase * Math.PI * 2) * 0.02 * w);
    this.spine.position.z = this.rear * -10;
    this.neck.rotation.x = -0.1 + Math.sin(this.phase * Math.PI * 4 + 0.6) * 0.03 * w + this.rear * 0.3;
    this.head.rotation.set(this.headPitch + Math.sin(this.time * 0.3) * 0.02, Math.sin(this.time * 0.17) * 0.05, 0);
    this.core.scale.setScalar(1 + Math.sin(this.time * 1.6) * 0.04);
    // rearing: front hooves leave the ground and paw the air
    for (const l of this.legs) {
      const front = l.rest.z > 0;
      if (!front) continue;
      const H = l.hip.getWorldPosition(new THREE.Vector3()).applyMatrix4(new THREE.Matrix4().copy(this.root.matrixWorld).invert());
      l.override = H.clone().add(new THREE.Vector3(0, -30, 18 + Math.sin(this.time * 3 + l.rest.x) * 6));
      l.overrideW = easeInOut(this.rear);
    }
    void dt;
  }
}

// =====================================================================================
// THE CARILLON — a domed temple on a ring, walking on six needle legs; concentric
// rings of bells hang beneath and toll as it walks.
// =====================================================================================
export class Carillon extends Colossus {
  readonly platform = new THREE.Group();
  readonly hatch = new THREE.Object3D();
  readonly underBells: THREE.Object3D[] = [];
  private readonly bellRings: THREE.Group[] = [];
  private readonly H0 = 74;

  constructor(far = false) {
    super({ panel: 6, glow: '#ff9a4a', grime: '#3a3026', moss: 0.35 }, far);
    this.speed = 6;
    this.stride = 40;
    this.duty = 0.6;
    this.stepHeight = 14;
    const seg = far ? 24 : 56;
    this.body.add(this.platform);
    this.platform.position.y = this.H0;
    // ring deck
    this.part(
      [
        tint(xf(cyl(36, 33, 5, seg), [0, 0, 0]), C.iron),
        tint(xf(torus(36, 2.2, 8, seg), [0, 2, 0], [Math.PI / 2, 0, 0]), C.bronze),
        tint(xf(torus(33.5, 1.4, 8, seg), [0, -2.6, 0], [Math.PI / 2, 0, 0]), C.bronze),
        // underside cone
        tint(xf(lathe([[0.2, -26], [8, -22], [22, -10], [32, -3]], seg), [0, 0, 0]), C.iron),
      ],
      this.platform,
    );
    // temple: columns + dome with ribs + cupola
    const temple: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      temple.push(tint(xf(cyl(1.2, 1.2, 14, 10), [Math.sin(a) * 26, 9.5, Math.cos(a) * 26]), C.bronze));
    }
    temple.push(tint(xf(cyl(28, 28, 1.6, seg), [0, 17, 0]), C.bronze));
    temple.push(tint(lathe([[24, 17.5], [24, 22], [22, 30], [17, 38], [9, 43], [0.2, 44.5]], seg), C.verd));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const prof: [number, number][] = [[24.4, 18], [24.4, 22], [22.4, 30], [17.4, 38], [9.4, 43], [1, 44.7]];
      temple.push(tint(tube(prof.map(([rr, y]) => new THREE.Vector3(Math.sin(a) * rr, y, Math.cos(a) * rr)), prof.map(() => 0.55), 6), C.gold));
    }
    temple.push(tint(xf(cyl(4, 4, 6, 16), [0, 47, 0]), C.bronze));
    temple.push(tint(xf(new THREE.ConeGeometry(5, 7, 16), [0, 53.5, 0]), C.verd));
    temple.push(tint(xf(sph(1.2, 10, 8), [0, 57.6, 0]), C.gold));
    temple.push(tint(xf(cyl(23, 23, 3, seg), [0, 2.5, 0]), C.iron));
    this.part(temple, this.platform);
    const tGlow: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const a = ((i + 0.5) / 16) * Math.PI * 2;
      tGlow.push(tint(xf(box(3.2, 9, 0.4), [Math.sin(a) * 23.2, 9, Math.cos(a) * 23.2], [0, a, 0]), '#fff'));
    }
    tGlow.push(tint(xf(bell(2.2, 14), [0, 47, 0]), '#fff'));
    this.part(tGlow, this.platform, true);
    // hatch on the deck by leg 0
    this.hatch.position.set(Math.sin(Math.PI / 6) * 30, 3, Math.cos(Math.PI / 6) * 30);
    this.platform.add(this.hatch);
    this.part([tint(xf(cyl(3, 3, 0.8, 16), [this.hatch.position.x, 2.8, this.hatch.position.z]), C.bronze), tint(xf(torus(3, 0.3, 6, 24), [this.hatch.position.x, 3.2, this.hatch.position.z], [Math.PI / 2, 0, 0]), C.gold)], this.platform);
    // concentric bell rings beneath (they counter-rotate)
    [[12, 6, 3.6], [22, 10, 3.0], [30, 14, 2.4]].forEach(([R, n, br], k) => {
      const ring = new THREE.Group();
      ring.position.y = -6 - k * 2;
      this.platform.add(ring);
      this.bellRings.push(ring);
      this.part([tint(xf(torus(R, 0.6, 6, seg), [0, 0, 0], [Math.PI / 2, 0, 0]), C.bronze)], ring);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const b = new THREE.Group();
        b.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
        b.rotation.y = a;
        ring.add(b);
        this.part([tint(xf(cyl(0.3, 0.3, 4, 6), [0, -2, 0]), C.dark), tint(xf(bell(br, 16), [0, -4 - br * 1.3, 0], [Math.PI, 0, 0]), k === 1 ? C.gold : C.bronze)], b);
        this.underBells.push(b);
      }
      this.spinners.push({ obj: ring, axis: 'y', speed: (k % 2 ? -1 : 1) * 0.04 });
    });
    // six needle legs
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i / 6) * Math.PI * 2;
      const hip = new THREE.Group();
      hip.position.set(Math.sin(a) * 33, -1, Math.cos(a) * 33);
      this.platform.add(hip);
      const out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const leg = this.addLeg({ hip, L1: 62, L2: 96, pole: out.clone().multiplyScalar(0.5).add(new THREE.Vector3(0, 1, 0)), rest: out.clone().multiplyScalar(112), offset: i % 2 ? 0.5 : 0 });
      const j = jointGeo(5, seg);
      this.part(j.hull, leg.upper);
      this.part(j.glow, leg.upper, true);
      this.part([tint(lathe([[2.6, -60], [4.6, -48], [5.4, -30], [4.6, -10], [3.6, -4]], seg), C.iron), ...[-14, -30, -46].map((y) => tint(xf(cyl(5.6, 5.4, 2.4, seg), [0, y, 0]), C.bronze))], leg.upper);
      const jk = jointGeo(4.4, seg);
      this.part(jk.hull, leg.knee);
      this.part(jk.glow, leg.knee, true);
      // needle with floating sleeves
      const ng: THREE.BufferGeometry[] = [tint(lathe([[0.2, -96], [1.0, -90], [2.2, -60], [3, -20], [3.2, -4]], seg), C.iron)];
      for (const [y0, len] of [[-12, 16], [-34, 14], [-54, 12]] as const) ng.push(tint(xf(lathe([[3.4, -len], [4.6, -len + 2], [4.8, -2], [3.6, 0]], seg), [0, y0, 0]), C.verd));
      for (const y of [-29, -49]) ng.push(tint(xf(torus(3.6, 0.35, 6, 24), [0, y, 0], [Math.PI / 2, 0, 0]), C.gold));
      this.part(ng, leg.lower);
      this.part([tint(xf(cyl(0.4, 2.4, 6, 10), [0, 3, 0]), C.dark)], leg.foot);
    }
    this.settle();
  }

  protected pose(dt: number): void {
    const w = this.walk;
    let lift = 0;
    for (const l of this.legs) lift += this.liftOf(l);
    this.platform.position.y = this.H0 - lift * 0.8 * w + Math.sin(this.time * 0.4) * 0.6;
    this.platform.rotation.x = Math.sin(this.phase * Math.PI * 4) * 0.012 * w;
    this.underBells.forEach((b, i) => {
      if ((b.userData.scripted as boolean) === true) return;
      b.rotation.x = Math.sin(this.time * 1.1 + i * 1.3) * (0.05 + w * 0.22);
    });
    void dt;
  }
}



// =====================================================================================
// THE SERAPH — a flying gyroscope of rings around a single eye, with feathered
// blade-wings and a trailing tail of floating plates. ~300 m wingspan.
// =====================================================================================
export class Seraph extends Colossus {
  readonly core = new THREE.Group();
  private readonly rings: THREE.Group[] = [];
  private readonly wings: { g: THREE.Group; side: number; k: number }[] = [];
  private readonly tail: THREE.Group[] = [];
  altitude = 260;
  bobPhase = Math.random() * 10;
  userData: { circle?: boolean } = {};

  constructor(far = false) {
    super({ panel: 10, glow: '#bff4ff', grime: '#9aa0b0', moss: 0 }, far);
    this.speed = 14;
    const seg = far ? 24 : 48;
    this.body.add(this.core);
    // eye: dark iris shell around a glowing pupil
    this.part([tint(lathe([[0.1, -16], [12, -12], [16, 0], [12, 12], [0.1, 16]], seg, 0.6, Math.PI * 2 - 1.2), C.ivory), tint(xf(torus(13.2, 1.4, 8, seg), [0, 0, 2], [0, 0, 0]), C.gold)], this.core);
    this.part([tint(xf(sph(8, 24, 16), [0, 0, 3]), '#fff')], this.core, true);
    this.part([tint(xf(lathe([[2, 0], [9.5, 1.5], [11, 3]], seg), [0, 0, 6], [Math.PI / 2, 0, 0]), C.dark)], this.core);
    // gyroscope rings
    const R = [36, 48, 60];
    R.forEach((r, k) => {
      const g = new THREE.Group();
      this.core.add(g);
      const geos: THREE.BufferGeometry[] = [tint(torus(r, 1.4 + k * 0.3, 8, far ? 64 : 120), k === 1 ? C.gold : C.ivory)];
      const n = 10 + k * 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        geos.push(tint(xf(box(2.2, i % 2 ? 7 : 4, 3), [Math.cos(a) * r, Math.sin(a) * r, 0], [0, 0, a]), C.ivoryDark));
      }
      this.part(geos, g);
      const gl = new THREE.Group();
      g.add(gl);
      this.part([tint(torus(r - 2.6, 0.3, 4, far ? 64 : 120), '#fff')], gl, true);
      g.rotation.set(k * 0.9, k * 0.6, 0);
      this.rings.push(g);
      this.spinners.push({ obj: g, axis: (['x', 'y', 'z'] as const)[k], speed: 0.06 + k * 0.03 });
    });
    // wings: fans of long blades
    for (const side of [1, -1]) {
      for (let w = 0; w < 2; w++) {
        const g = new THREE.Group();
        g.position.set(side * 14, w ? -6 : 8, -4);
        this.body.add(g);
        const geos: THREE.BufferGeometry[] = [];
        const n = 7;
        for (let i = 0; i < n; i++) {
          const L = (w ? 70 : 110) * (1 - i * 0.09);
          const a = (w ? -0.5 : 0.35) + i * (w ? -0.13 : 0.15);
          const b = blade(11 - i * 0.6, 1.2, 1.4, 0.4, 2);
          b.scale(1, L, 1);
          b.rotateZ(-side * (Math.PI / 2 - a));
          geos.push(tint(b, i % 3 === 0 ? C.gold : C.ivory));
          const edge = blade(0.8, 0.1, 1.6, 0.4, 1);
          edge.scale(1, L * 0.96, 1);
          edge.translate(0, 0, 0.6);
          edge.rotateZ(-side * (Math.PI / 2 - a));
          geos.push(tint(edge, C.goldDark));
        }
        this.part(geos, g);
        this.wings.push({ g, side, k: w });
      }
    }
    // trailing tail of floating plates
    let parent: THREE.Object3D = this.body;
    for (let i = 0; i < 12; i++) {
      const g = new THREE.Group();
      g.position.set(0, i === 0 ? -20 : -9 + i * 0.2, i === 0 ? -6 : -2);
      parent.add(g);
      const r = 9 - i * 0.6;
      this.part([tint(xf(cyl(r, r * 0.8, 2.4, 8), [0, -3, 0]), i % 2 ? C.ivory : C.ivoryDark), tint(xf(blade(r * 1.4, 0.2, 0.8, 0.3, 1), [0, -4, 0], [Math.PI, 0, 0], [1, 6, 1]), C.gold)], g);
      this.part([tint(xf(cyl(r * 0.5, r * 0.5, 0.5, 8), [0, -0.6, 0]), '#fff')], g, true);
      this.tail.push(g);
      parent = g;
    }
    this.root.position.y = this.altitude;
    this.settle();
  }

  protected pose(dt: number): void {
    const t = this.time + this.bobPhase;
    this.root.position.y += (this.altitude + Math.sin(t * 0.25) * 12 - this.root.position.y) * damp(0.5, dt);
    this.body.rotation.set(Math.sin(t * 0.2) * 0.05, 0, Math.sin(t * 0.15) * 0.08);
    for (const w of this.wings) {
      const f = Math.sin(t * 0.5 + w.k * 0.8) * (0.12 + this.walk * 0.1);
      w.g.rotation.set(0, w.side * 0.25, w.side * f);
    }
    this.tail.forEach((g, i) => {
      g.rotation.x = Math.sin(t * 0.6 - i * 0.5) * 0.12 - this.walk * 0.08;
      g.rotation.z = Math.sin(t * 0.4 - i * 0.6) * 0.1;
    });
  }
}

// =====================================================================================
// THE LEVIATHAN — a sky-serpent of hull rings and fin-blades, swimming in long
// loops through the clouds. ~600 m long.
// =====================================================================================
export class Leviathan extends Colossus {
  private readonly segs: THREE.Group[] = [];
  readonly orbit = { center: new THREE.Vector3(0, 0, 0), radius: 900, altitude: 340, speed: 0.025, wave: 60, phase: 0 };
  readonly spacing = 24;

  constructor(far = true) {
    super({ panel: 12, glow: '#ffcf8a', grime: '#6a7a8a', moss: 0.2 }, far);
    const seg = far ? 20 : 36;
    const N = 26;
    for (let i = 0; i < N; i++) {
      const g = new THREE.Group();
      this.root.add(g);
      const r = i === 0 ? 20 : 22 * Math.sin(Math.min(1, (i + 2) / 8) * Math.PI * 0.5) * (1 - Math.max(0, i - 14) / 14) + 3;
      const geos: THREE.BufferGeometry[] = [];
      if (i === 0) {
        // head: long mask with a crest
        geos.push(tint(xf(lathe([[0.1, -8], [14, 0], [16, 16], [10, 34], [0.1, 46]], seg), [0, 0, 0], [Math.PI / 2, 0, 0]), C.ivory));
        geos.push(tint(xf(blade(4, 0.4, 20, 4, 1), [0, 12, 8], [-0.3, 0, 0], [1, 22, 1]), C.gold));
      } else {
        geos.push(tint(xf(lathe([[r * 0.85, -this.spacing * 0.45], [r, -this.spacing * 0.2], [r, this.spacing * 0.2], [r * 0.85, this.spacing * 0.45]], seg), [0, 0, 0], [Math.PI / 2, 0, 0]), i % 2 ? C.slate : C.ivoryDark));
        geos.push(tint(xf(torus(r + 0.6, 0.9, 6, seg), [0, 0, 0], [0, 0, 0]), C.gold));
        if (i % 2 === 1 && i < 22) {
          for (const sd of [1, -1]) geos.push(tint(xf(blade(10, 1, 8, 2, 1), [sd * r, 0, 0], [0, 0, -sd * (Math.PI / 2 - 0.3)], [1, r * 2.2, 1]), C.ivory));
          geos.push(tint(xf(blade(3, 0.5, 10, 2, 1), [0, r, 0], [0.4, 0, 0], [1, r * 0.9, 1]), C.ivoryDark));
        }
      }
      this.part(geos, g);
      if (i === 0) this.part([tint(xf(box(16, 1.2, 1.2), [0, 4, 30]), '#fff'), tint(xf(box(1, 1, 30), [0, -6, 22]), '#fff')], g, true);
      else this.part([tint(xf(torus(r * 0.6, 0.4, 4, seg), [0, 0, this.spacing * 0.46]), '#fff')], g, true);
      this.segs.push(g);
    }
    this.update(0, 0);
  }

  private pathAt(t: number, out: THREE.Vector3): THREE.Vector3 {
    const o = this.orbit;
    const a = t * o.speed + o.phase;
    return out.set(o.center.x + Math.cos(a) * o.radius, o.altitude + Math.sin(a * 3.1) * o.wave, o.center.z + Math.sin(a) * o.radius * 0.8);
  }

  update(dt: number, time: number): void {
    this.time = time;
    for (const s of this.spinners) s.obj.rotation[s.axis] += s.speed * dt;
    // each segment rides the same path, a fixed arc-distance behind the head
    const ds = this.spacing / (this.orbit.radius * this.orbit.speed);
    const p = new THREE.Vector3();
    const q = new THREE.Vector3();
    this.segs.forEach((g, i) => {
      const t = time - i * ds;
      this.pathAt(t, p);
      this.pathAt(t + ds * 0.5, q);
      g.position.copy(p);
      g.lookAt(q);
      g.rotateZ(Math.sin(time * 0.6 - i * 0.4) * 0.15);
    });
  }

  protected pose(): void {}

  get head(): THREE.Object3D {
    return this.segs[0];
  }
}

// =====================================================================================
// THE BEHEMOTH — a machine the size of a moon, hanging in the sky: rotating
// latitude bands, meridian trenches of light, a ring of broken plates and a
// single vast iris. It is what the Procession walks to.
// =====================================================================================
export class Behemoth extends Colossus {
  readonly iris = new THREE.Group();
  private readonly bands: THREE.Group[] = [];
  private readonly ring = new THREE.Group();
  /** 0 = sleeping, 1 = waking */
  wake = 0;

  constructor(radius = 2400) {
    super({ panel: radius * 0.17, glow: '#ffb070', grime: '#8a8aa0', moss: 0, haze: 0.3 }, true);
    this.hull.fog = false;
    this.glowMat.fog = false;
    const R = radius;
    const seg = 96;
    // core sphere (darker), then plated latitude bands that turn independently
    this.part([tint(sph(R * 0.97, seg, 64), C.slate)], this.body);
    for (let b = 0; b < 7; b++) {
      const g = new THREE.Group();
      this.body.add(g);
      const lat0 = -1.25 + b * 0.36;
      const lat1 = lat0 + 0.3;
      const prof: [number, number][] = [];
      for (let k = 0; k <= 6; k++) {
        const lat = lat0 + ((lat1 - lat0) * k) / 6;
        prof.push([Math.cos(lat) * R, Math.sin(lat) * R]);
      }
      const geos: THREE.BufferGeometry[] = [tint(lathe(prof, seg), b % 2 ? C.ivory : C.ivoryDark)];
      // trench teeth along the band edge
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const rr = Math.cos(lat1) * R * 1.004;
        geos.push(tint(xf(box(R * 0.02, R * 0.012, R * 0.06), [Math.sin(a) * rr, Math.sin(lat1) * R, Math.cos(a) * rr], [0, a, 0]), C.gold));
      }
      this.part(geos, g);
      const gl = new THREE.Group();
      g.add(gl);
      this.part([tint(xf(torus(Math.cos(lat0) * R * 1.001, R * 0.004, 4, seg), [0, Math.sin(lat0) * R, 0], [Math.PI / 2, 0, 0]), '#fff')], gl, true);
      this.bands.push(g);
      this.spinners.push({ obj: g, axis: 'y', speed: (b % 2 ? -1 : 1) * (0.004 + b * 0.0015) });
    }
    // the iris, facing +Z
    this.iris.position.z = R * 0.95;
    this.body.add(this.iris);
    const iz: THREE.BufferGeometry[] = [];
    for (let k = 0; k < 5; k++) iz.push(tint(xf(torus(R * (0.12 + k * 0.07), R * 0.008, 6, seg), [0, 0, R * 0.02 - k * R * 0.004]), k % 2 ? C.gold : C.ivory));
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      iz.push(tint(xf(blade(R * 0.03, R * 0.004, R * 0.01, R * 0.004, 1), [Math.cos(a) * R * 0.12, Math.sin(a) * R * 0.12, R * 0.02], [0, 0, a - Math.PI / 2], [1, R * 0.28, 1]), C.ivoryDark));
    }
    this.part(iz, this.iris);
    this.part([tint(xf(sph(R * 0.11, 32, 24), [0, 0, -R * 0.02]), '#fff'), tint(xf(torus(R * 0.16, R * 0.006, 4, 96), [0, 0, R * 0.025]), '#fff')], this.iris, true);
    // broken plate ring
    this.body.add(this.ring);
    const rg: THREE.BufferGeometry[] = [];
    const r = rng(9);
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * Math.PI * 2 + r() * 0.02;
      if (r() < 0.18) continue;
      const rr = R * (1.5 + r() * 0.25);
      rg.push(tint(xf(box(R * (0.04 + r() * 0.05), R * 0.008, R * (0.06 + r() * 0.12)), [Math.cos(a) * rr, (r() - 0.5) * R * 0.02, Math.sin(a) * rr], [0, -a, 0]), r() < 0.2 ? C.gold : C.ivoryDark));
    }
    this.part(rg, this.ring);
    this.ring.rotation.set(0.35, 0, 0.18);
    this.spinners.push({ obj: this.ring, axis: 'y', speed: 0.003 });
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = false;
        m.receiveShadow = false;
        m.frustumCulled = false;
        if (m.userData.isOutline) m.visible = false;
      }
    });
    this.root.renderOrder = -6;
  }

  setHaze(color: THREE.ColorRepresentation, amount: number): void {
    const h = this.hull.userData.haze as { value: THREE.Vector4 };
    const c = new THREE.Color(color);
    h.value.set(c.r, c.g, c.b, amount);
  }

  protected pose(): void {
    const w = this.wake;
    this.iris.scale.setScalar(1 + w * 0.15 + Math.sin(this.time * 0.2) * 0.01);
    this.setGlow('#ffb070', 1.2 + w * 4);
  }
}

export type AnyColossus = Pilgrim | Antlered | Carillon | Seraph | Leviathan | Behemoth;
