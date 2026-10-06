import * as THREE from 'three';
import { Mats } from '../world/Materials';
import { latheG, limb, mesh } from './Rig';
import { damp } from '../utils/math';

type Leg = { hip: THREE.Group; knee: THREE.Group; front: boolean; side: number };

/** Ser Calder's warhorse, Ash: dark coat, blue caparison with the Order's colours. */
export class Horse {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly seat = new THREE.Object3D();
  private readonly neck = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly legs: Leg[] = [];
  private phase = 0;

  constructor() {
    const m = Mats();
    this.root.add(this.body);
    this.body.position.y = 1.25;
    const torso = new THREE.SphereGeometry(0.5, 8, 6);
    torso.scale(0.9, 0.95, 1.9);
    this.body.add(mesh(torso, m.horseCoat));
    const chestG = new THREE.SphereGeometry(0.42, 8, 6);
    this.body.add(mesh(chestG, m.horseCoat, 0, 0.05, 0.7));
    this.body.add(mesh(new THREE.SphereGeometry(0.46, 8, 6), m.horseCoat, 0, 0.05, -0.72));
    // Caparison: open cloth skirt around the barrel.
    const cap = new THREE.CylinderGeometry(0.55, 0.66, 0.85, 7, 1, true);
    cap.scale(1, 1, 1.85);
    this.body.add(mesh(cap, m.barding, 0, -0.18, 0));
    // Saddle with high cantle.
    this.body.add(mesh(latheG([[0.3, 0], [0.32, 0.06], [0.0, 0.08]], 8).scale(1, 1, 1.4), m.leather, 0, 0.42, 0.05));
    this.body.add(mesh(new THREE.BoxGeometry(0.4, 0.22, 0.06), m.leather, 0, 0.55, -0.3));
    this.seat.position.set(0, 0.5, 0.02);
    this.body.add(this.seat);
    // Neck & head.
    this.neck.position.set(0, 0.25, 0.85);
    this.neck.rotation.x = 0.75;
    this.body.add(this.neck);
    this.neck.add(mesh(limb(0.28, 0.2, 0.9, 7).rotateX(Math.PI), m.horseCoat, 0, 0, 0));
    for (let i = 0; i < 6; i += 1) {
      const g = new THREE.PlaneGeometry(0.06, 0.32);
      this.neck.add(mesh(g, m.horseMane, 0, 0.15 + i * 0.13, -0.18, 0.2, Math.PI / 2, 0));
    }
    this.head.position.set(0, 0.9, 0);
    this.head.rotation.x = 1.45;
    this.neck.add(this.head);
    const skull = latheG([[0.0, 0.0], [0.16, 0.05], [0.17, 0.2], [0.13, 0.4], [0.1, 0.55], [0.0, 0.6]], 8);
    skull.scale(0.85, 1, 1.05);
    this.head.add(mesh(skull, m.horseCoat));
    // Chanfron (face armour).
    this.head.add(mesh(new THREE.BoxGeometry(0.12, 0.45, 0.04), m.plate, 0, 0.3, 0.13, -0.1));
    for (const sx of [-1, 1]) {
      this.head.add(mesh(new THREE.ConeGeometry(0.04, 0.14, 5), m.horseCoat, sx * 0.07, 0.0, -0.08, -0.6, 0, sx * 0.2));
      this.head.add(mesh(new THREE.SphereGeometry(0.025, 6, 4), m.visorDark, sx * 0.12, 0.17, 0.05));
    }
    // Tail.
    this.tail.position.set(0, 0.25, -1.0);
    this.body.add(this.tail);
    const tailG = latheG([[0.05, 0], [0.09, -0.3], [0.08, -0.7], [0.0, -0.8]], 8);
    this.tail.add(mesh(tailG, m.horseMane, 0, 0, 0));
    this.tail.rotation.x = 0.5;
    // Legs.
    for (const front of [true, false]) {
      for (const side of [-1, 1]) {
        const hip = new THREE.Group();
        hip.position.set(side * 0.24, -0.1, front ? 0.62 : -0.66);
        this.body.add(hip);
        hip.add(mesh(limb(front ? 0.14 : 0.18, 0.09, 0.62, 7), m.horseCoat, 0, 0, 0));
        const knee = new THREE.Group();
        knee.position.y = -0.6;
        hip.add(knee);
        knee.add(mesh(limb(0.07, 0.06, 0.5, 7), m.horseCoat));
        knee.add(mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.1, 7), m.ironDark, 0, -0.52, 0));
        knee.add(mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.12, 7), m.horseMane, 0, -0.4, 0));
        this.legs.push({ hip, knee, front, side });
      }
    }
    this.root.traverse((o) => {
      const me = o as THREE.Mesh;
      if (me.isMesh) me.castShadow = true;
    });
  }

  /** speed in m/s. Gait blends walk → canter → gallop. */
  update(dt: number, speed: number, time: number): void {
    const gait = Math.min(1, speed / 16);
    const freq = 1.6 + gait * 2.6;
    this.phase += dt * freq * Math.PI * 2 * (speed > 0.3 ? 1 : 0);
    const p = this.phase;
    const stride = 0.2 + gait * 0.55;
    for (const leg of this.legs) {
      const off = (leg.front ? 0 : Math.PI * (gait > 0.5 ? 0.85 : 1)) + (leg.side > 0 ? 0.35 * gait : Math.PI * (1 - gait));
      const s = Math.sin(p + off);
      const target = speed > 0.3 ? s * stride : 0;
      leg.hip.rotation.x = damp(leg.hip.rotation.x, target, 18, dt);
      const bend = speed > 0.3 ? Math.max(0, Math.cos(p + off)) * (leg.front ? 1.2 : -0.8) * (0.4 + gait) : 0;
      leg.knee.rotation.x = damp(leg.knee.rotation.x, bend, 18, dt);
    }
    const bob = speed > 0.3 ? Math.sin(p * 2) * 0.05 * (0.5 + gait) : Math.sin(time * 1.5) * 0.01;
    this.body.position.y = 1.25 + bob;
    this.body.rotation.x = speed > 0.3 ? Math.sin(p) * 0.06 * gait : 0;
    this.neck.rotation.x = 0.75 + (speed > 0.3 ? Math.sin(p + 1) * 0.12 * (0.4 + gait) : Math.sin(time * 0.7) * 0.05) + gait * 0.25;
    this.tail.rotation.x = 0.5 + gait * 0.6 + Math.sin(time * 3) * 0.08;
    this.tail.rotation.z = Math.sin(time * 1.3) * 0.15;
  }
}
