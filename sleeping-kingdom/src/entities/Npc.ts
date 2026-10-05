import * as THREE from 'three';
import { Animator, idle, latheG, limb, locomotion, mesh, type FolkStyle, type Pose } from './Rig';
import { buildTownsfolk } from './Townsfolk';
import { Mats } from '../world/Materials';
import type { Nav } from '../game/Nav';
import { damp, dampAngle } from '../utils/math';
import { createSeededRandom } from '../utils/random';

export type NpcBehavior = 'idle' | 'talk' | 'pace' | 'lookup' | 'flee' | 'cower' | 'pray' | 'dying' | 'guard';

export class Folk {
  readonly rig;
  readonly group = new THREE.Group();
  private readonly anim;
  behavior: NpcBehavior;
  yaw = 0;
  private phase = 0;
  private pathIndex = -1;
  private readonly home = new THREE.Vector3();
  private paceDir = 1;
  private fleeSpeed = 5;
  private seed: number;
  removed = false;
  name: string;

  constructor(style: FolkStyle, behavior: NpcBehavior, name: string, seed: number) {
    this.rig = buildTownsfolk(style);
    this.anim = new Animator(this.rig);
    this.group.add(this.rig.root);
    this.behavior = behavior;
    this.name = name;
    this.seed = seed;
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1).rotateX(-Math.PI / 2), Mats().contactShadow);
    sh.position.y = 0.03;
    this.group.add(sh);
  }

  get pos(): THREE.Vector3 {
    return this.group.position;
  }

  place(p: THREE.Vector3, yaw: number): void {
    this.group.position.copy(p);
    this.home.copy(p);
    this.yaw = yaw;
  }

  panic(rng: () => number): void {
    if (this.behavior === 'dying' || this.behavior === 'guard') return;
    this.behavior = rng() < 0.3 ? 'cower' : 'flee';
    this.fleeSpeed = 4.5 + rng() * 2.5;
  }

  update(dt: number, time: number, nav: Nav, tilt: number): void {
    let pose: Pose;
    const t = time + this.seed;
    switch (this.behavior) {
      case 'talk':
        pose = idle(t);
        pose.shoulderR = [-0.6 - Math.max(0, Math.sin(t * 2.3)) * 0.6, 0, -0.3];
        pose.elbowR = [-1.0, 0, 0];
        pose.head = [0, Math.sin(t * 0.9) * 0.3, 0];
        break;
      case 'pace': {
        const sp = 1.3;
        const target = this.home.clone().add(new THREE.Vector3(Math.sin(this.yaw) * 0.01, 0, 0));
        void target;
        this.pos.x += Math.sin(this.yaw) * sp * dt;
        this.pos.z += Math.cos(this.yaw) * sp * dt;
        if (this.pos.distanceTo(this.home) > 6) {
          this.paceDir *= -1;
          this.yaw += Math.PI;
          this.pos.lerp(this.home, 0.02);
        }
        this.phase += sp * 2.6 * dt;
        pose = locomotion(this.phase, 0.35, { armSwing: 0.3 });
        break;
      }
      case 'lookup':
        pose = idle(t);
        pose.head = [-0.7, Math.sin(t * 0.7) * 0.4, 0];
        pose.neck = [-0.25, 0, 0];
        pose.spine = [-0.1, 0, 0];
        break;
      case 'flee': {
        // Run up the street ahead of the player, then vanish into side alleys.
        const near = nav.path.samples[Math.max(0, this.pathIndex)];
        const dirYaw = Math.atan2(near.tangent.x, near.tangent.z);
        this.yaw = dampAngle(this.yaw, dirYaw + Math.sin(t) * 0.4, 6, dt);
        this.pos.x += Math.sin(this.yaw) * this.fleeSpeed * dt;
        this.pos.z += Math.cos(this.yaw) * this.fleeSpeed * dt;
        this.pathIndex = nav.resolve(this.pos, 0.4, this.pathIndex);
        this.phase += this.fleeSpeed * 2.2 * dt;
        pose = locomotion(this.phase, 1.2, { armSwing: 0.9 });
        pose.shoulderL = [-2.2, 0, 0.5];
        pose.shoulderR = [-2.2, 0, -0.5];
        pose.elbowL = [-1.5, 0, 0];
        pose.elbowR = [-1.5, 0, 0];
        this.fleeTime += dt;
        if (this.fleeTime > 9) this.removed = true;
        break;
      }
      case 'cower':
        pose = {
          hipL: [-1.6, 0, 0.2], hipR: [-1.6, 0, -0.2], kneeL: [2.3, 0, 0], kneeR: [2.3, 0, 0],
          spine: [0.9, 0, 0], head: [0.6, 0, 0], shoulderL: [-2.4, 0, 0.6], shoulderR: [-2.4, 0, -0.6],
          elbowL: [-2.0, 0, 0], elbowR: [-2.0, 0, 0], rootY: -0.62 + Math.sin(t * 20) * 0.01,
        };
        break;
      case 'pray':
        pose = {
          hipL: [-1.5, 0, 0.1], hipR: [-1.5, 0, -0.1], kneeL: [2.2, 0, 0], kneeR: [2.2, 0, 0],
          spine: [0.15, 0, 0], head: [0.35, 0, 0], shoulderL: [-1.0, 0.4, 0.1], shoulderR: [-1.0, -0.4, -0.1],
          elbowL: [-1.6, 0, 0], elbowR: [-1.6, 0, 0], rootY: -0.6,
        };
        break;
      case 'dying':
        pose = {
          hipL: [-1.5, 0, 0.3], hipR: [-1.2, 0, -0.3], kneeL: [0.4, 0, 0], kneeR: [0.6, 0, 0],
          spine: [-0.5, 0, 0], head: [-0.2, 0.3 + Math.sin(t * 0.5) * 0.05, 0.2], shoulderL: [-0.4, 0, 0.6], shoulderR: [-0.9, 0, -0.2],
          elbowR: [-1.4, 0, 0], rootY: -0.75 + Math.sin(t * 1.2) * 0.01,
        };
        break;
      case 'guard':
        pose = idle(t);
        pose.shoulderR = [-0.3, 0, -0.1];
        pose.elbowR = [-0.4, 0, 0];
        break;
      default:
        pose = idle(t);
    }
    // The tilt makes everyone stagger toward the low side.
    if (Math.abs(tilt) > 0.01 && this.behavior !== 'dying') {
      pose.spine = [(pose.spine?.[0] ?? 0), 0, -tilt * 3];
    }
    this.anim.apply(pose, dt, 8);
    this.group.rotation.y = this.yaw;
  }

  private fleeTime = 0;
}

/** A stray black hound: barks at the bells, then bolts. */
export class Dog {
  readonly group = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly legs: THREE.Group[] = [];
  private readonly head = new THREE.Group();
  private readonly tail = new THREE.Group();
  state: 'sit' | 'bark' | 'run' | 'gone' = 'sit';
  private t = 0;
  private phase = 0;
  yaw = 0;
  private pathIndex = -1;
  onBark: (() => void) | null = null;

  constructor() {
    const m = Mats();
    this.group.add(this.body);
    this.body.position.y = 0.55;
    this.body.add(mesh(new THREE.SphereGeometry(0.22, 10, 8).scale(1, 0.9, 2.1), m.fur));
    this.head.position.set(0, 0.18, 0.42);
    this.body.add(this.head);
    this.head.add(mesh(new THREE.SphereGeometry(0.14, 10, 8).scale(0.9, 0.95, 1.1), m.fur));
    this.head.add(mesh(latheG([[0.07, 0], [0.06, 0.12], [0.03, 0.22], [0, 0.23]], 8).rotateX(Math.PI / 2), m.fur, 0, -0.03, 0.08));
    for (const sx of [-1, 1]) {
      this.head.add(mesh(new THREE.ConeGeometry(0.04, 0.12, 4), m.fur, sx * 0.07, 0.13, -0.02, -0.3, 0, sx * -0.3));
      this.head.add(mesh(new THREE.SphereGeometry(0.018, 5, 4), m.lanternGlow, sx * 0.06, 0.04, 0.11));
    }
    this.tail.position.set(0, 0.1, -0.42);
    this.body.add(this.tail);
    this.tail.add(mesh(limb(0.03, 0.015, 0.35, 5).rotateX(Math.PI * 0.8), m.fur));
    for (const [x, z] of [[-0.11, 0.3], [0.11, 0.3], [-0.11, -0.3], [0.11, -0.3]]) {
      const g = new THREE.Group();
      g.position.set(x, -0.05, z);
      g.add(mesh(limb(0.045, 0.03, 0.5, 6), m.fur));
      this.body.add(g);
      this.legs.push(g);
    }
  }

  get pos(): THREE.Vector3 {
    return this.group.position;
  }

  update(dt: number, time: number, nav: Nav): void {
    this.t += dt;
    if (this.state === 'gone') return;
    if (this.state === 'sit') {
      this.body.rotation.x = -0.4;
      this.legs[2].rotation.x = -1.2;
      this.legs[3].rotation.x = -1.2;
      this.tail.rotation.y = Math.sin(time * 6) * 0.5;
    } else if (this.state === 'bark') {
      this.body.rotation.x = damp(this.body.rotation.x, -0.15, 6, dt);
      for (const l of this.legs) l.rotation.x = damp(l.rotation.x, 0, 8, dt);
      const bark = Math.sin(this.t * 9);
      this.head.rotation.x = bark > 0.7 ? -0.5 : -0.2;
      if (Math.floor(this.t * 9 / (Math.PI * 2)) !== Math.floor((this.t - dt) * 9 / (Math.PI * 2))) this.onBark?.();
      if (this.t > 4.5) {
        this.state = 'run';
        this.t = 0;
      }
    } else if (this.state === 'run') {
      const near = nav.path.samples[Math.max(0, this.pathIndex)];
      const dirYaw = Math.atan2(near.tangent.x, near.tangent.z) + 0.3;
      this.yaw = dampAngle(this.yaw, dirYaw, 5, dt);
      this.pos.x += Math.sin(this.yaw) * 9 * dt;
      this.pos.z += Math.cos(this.yaw) * 9 * dt;
      this.pathIndex = nav.resolve(this.pos, 0.3, this.pathIndex);
      this.phase += dt * 18;
      this.legs.forEach((l, i) => (l.rotation.x = Math.sin(this.phase + (i < 2 ? 0 : 2.2)) * 0.9));
      this.body.rotation.x = Math.sin(this.phase) * 0.08;
      if (this.t > 6) {
        this.state = 'gone';
        this.group.visible = false;
      }
    }
    this.group.rotation.y = this.yaw;
  }
}

/** Crows roosting on rooftops; they take flight all at once when the bells ring. */
export class Flock {
  readonly mesh: THREE.InstancedMesh;
  private readonly birds: Array<{ p: THREE.Vector3; v: THREE.Vector3; flap: number; flying: boolean; delay: number }> = [];
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly e = new THREE.Euler();
  private readonly s = new THREE.Vector3(1, 1, 1);

  constructor(perches: THREE.Vector3[]) {
    const g = new THREE.BufferGeometry();
    // A simple crow: body plus two wing triangles.
    const v = [
      0, 0, 0.25, 0.06, 0, -0.2, -0.06, 0, -0.2,
      0, 0.02, 0.05, 0.55, 0.05, -0.1, 0, 0.02, -0.15,
      0, 0.02, 0.05, -0.55, 0.05, -0.1, 0, 0.02, -0.15,
    ];
    g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    g.computeVertexNormals();
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: '#070709', side: THREE.DoubleSide }), perches.length);
    const rng = createSeededRandom(66);
    for (const p of perches) {
      this.birds.push({ p: p.clone(), v: new THREE.Vector3(), flap: rng() * 10, flying: false, delay: rng() * 1.5 });
    }
    this.mesh.frustumCulled = false;
    this.write(0);
  }

  scatter(rng: () => number): void {
    for (const b of this.birds) {
      b.flying = true;
      b.v.set((rng() - 0.5) * 6, 4 + rng() * 4, (rng() - 0.5) * 6 - 3);
    }
  }

  update(dt: number, time: number): void {
    for (const b of this.birds) {
      if (!b.flying) continue;
      if (b.delay > 0) {
        b.delay -= dt;
        continue;
      }
      b.v.y += (2.5 - b.v.y) * dt * 0.5;
      b.v.x += Math.sin(time + b.flap) * dt * 2;
      b.p.addScaledVector(b.v, dt);
      b.flap += dt * 14;
    }
    this.write(time);
  }

  private write(time: number): void {
    this.birds.forEach((b, i) => {
      const flapping = b.flying && b.delay <= 0;
      const yaw = flapping ? Math.atan2(b.v.x, b.v.z) : Math.sin(time * 0.3 + i) * 1.5;
      this.e.set(0, yaw, flapping ? Math.sin(b.flap) * 0.6 : 0);
      this.q.setFromEuler(this.e);
      this.s.set(flapping ? 1 : 0.45, 1, 1);
      this.m.compose(b.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
