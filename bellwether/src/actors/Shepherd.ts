import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { T as Tex } from './shepherdTex';

/**
 * A Shepherd: one of CIVIC's giant municipal walkers. Four legs, a long armoured hull and a small
 * watchful head. Every leg is solved with two-bone IK against a foot that stays planted on the ground
 * until it is its turn to swing, so the feet never slide.
 */
export type ShepherdCargo = 'house' | 'lamps' | 'tank' | null;
export interface ShepherdOpts {
  scale?: number;
  hostile?: boolean;
  cargo?: ShepherdCargo;
  hull?: string;
  name?: string;
  speed?: number;
  /** extra hull self-illumination for walkers seen from far away */
  glow?: number;
}

interface Leg {
  hip: THREE.Vector3; // in body space
  home: THREE.Vector3; // foot rest offset in root space (y = 0)
  front: boolean;
  phase: number;
  plant: THREE.Vector3;
  from: THREE.Vector3;
  to: THREE.Vector3;
  swinging: boolean;
  thigh: THREE.Object3D;
  shin: THREE.Object3D;
  knee: THREE.Object3D;
  foot: THREE.Object3D;
  piston: THREE.Object3D;
}

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();

function rb(w: number, h: number, d: number, r = 0.25): THREE.BufferGeometry {
  return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.1, h / 2.1, d / 2.1));
}

/** Merge a group's direct mesh children by material (keeps draw calls low). */
function mergeChildren(group: THREE.Object3D, keep: Set<THREE.Object3D>): void {
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const kill: THREE.Mesh[] = [];
  for (const c of group.children) {
    const m = c as THREE.Mesh;
    if (!m.isMesh || keep.has(m) || Array.isArray(m.material)) continue;
    m.updateMatrix();
    let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    g.applyMatrix4(m.matrix);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((g.attributes.position.count) * 2), 2));
    g = g.index ? g.toNonIndexed() : g;
    const mat = m.material as THREE.Material;
    if (!byMat.has(mat)) byMat.set(mat, []);
    byMat.get(mat)!.push(g);
    kill.push(m);
  }
  for (const m of kill) group.remove(m);
  for (const [mat, list] of byMat) {
    const merged = mergeGeometries(list, false);
    if (!merged) continue;
    const o = new THREE.Mesh(merged, mat);
    o.castShadow = !(mat as THREE.MeshBasicMaterial).isMeshBasicMaterial;
    o.receiveShadow = true;
    group.add(o);
    list.forEach((g) => g.dispose());
  }
}

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, cast = true): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = cast;
  o.receiveShadow = true;
  return o;
}

export class Shepherd {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly head = new THREE.Group();
  readonly legsGroup = new THREE.Group();
  readonly legs: Leg[] = [];
  readonly scale: number;
  pos = new THREE.Vector3();
  yaw = 0;
  speed: number;
  cruise: number;
  path: THREE.Vector3[] = [];
  loop = true;
  private wp = 0;
  private t = Math.random() * 10;
  private period: number;
  private bodyY: number;
  hostile: boolean;
  /** world point the searchlight / head is looking at */
  readonly look = new THREE.Vector3();
  lookTarget: THREE.Vector3 | null = null;
  readonly eyeMat: THREE.MeshBasicMaterial;
  readonly lampMat: THREE.MeshBasicMaterial;
  readonly beam: THREE.Mesh;
  readonly beamMat: THREE.MeshBasicMaterial;
  readonly spot: THREE.Mesh;
  /** called on every footfall (world pos, scale) */
  onStep: ((p: THREE.Vector3, s: number) => void) | null = null;
  readonly cables: THREE.Object3D[] = [];
  /** collapse animation (0 = standing) */
  fall = 0;
  private fallDir = 1;
  dead = false;

  constructor(o: ShepherdOpts = {}) {
    const s = (this.scale = o.scale ?? 1);
    this.hostile = !!o.hostile;
    this.cruise = this.speed = o.speed ?? 2.4 * s;
    this.period = 3.4 * Math.sqrt(s);
    this.bodyY = 14 * s;
    const hullC = new THREE.Color(o.hull ?? '#d9d4c6');
    const hull = new THREE.MeshStandardMaterial({ color: hullC, roughness: 0.55, metalness: 0.35, map: Tex.panels(), envMapIntensity: 1.1, emissive: hullC.clone().multiplyScalar(o.glow ?? 0.07), emissiveMap: Tex.panels() });
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.45, metalness: 0.8 });
    const steel = new THREE.MeshStandardMaterial({ color: '#8d939b', roughness: 0.3, metalness: 0.95 });
    const hazard = new THREE.MeshStandardMaterial({ map: Tex.hazard(), roughness: 0.5, metalness: 0.2 });
    const col = this.hostile ? '#ff2a20' : '#7ff4ff';
    this.eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(3), toneMapped: false });
    this.lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.hostile ? '#ff6a50' : '#fff2d0').multiplyScalar(3), toneMapped: false });

    // ---------------------------------------------------------------- hull
    const B = this.body;
    const L = 20 * s;
    const W = 8 * s;
    const H = 6.5 * s;
    B.add(mesh(rb(W, H, L, 1.2 * s), hull));
    // armoured spine ridge + top hatches
    B.add(mesh(rb(W * 0.55, 1.2 * s, L * 0.86, 0.4 * s), hull, 0, H / 2 + 0.5 * s, 0));
    for (let i = -2; i <= 2; i++) B.add(mesh(rb(1.6 * s, 0.5 * s, 2.2 * s, 0.15 * s), dark, 0, H / 2 + 1.25 * s, i * 3.6 * s));
    // side armour plates with a hazard band and a vent grid
    for (const sx of [-1, 1]) {
      for (let i = -1; i <= 1; i++) B.add(mesh(rb(0.6 * s, H * 0.7, 5.6 * s, 0.25 * s), hull, sx * (W / 2 + 0.25 * s), -0.2 * s, i * 6.2 * s));
      B.add(mesh(new THREE.BoxGeometry(0.1 * s, 0.7 * s, L * 0.9), hazard, sx * (W / 2 + 0.58 * s), -H * 0.38, 0));
      for (let k = 0; k < 6; k++) B.add(mesh(new THREE.BoxGeometry(0.12 * s, 0.18 * s, 2.6 * s), dark, sx * (W / 2 + 0.6 * s), 1.4 * s + k * 0.35 * s, -6.2 * s, false));
      // side lights
      for (let k = 0; k < 4; k++) B.add(mesh(new THREE.BoxGeometry(0.15 * s, 0.25 * s, 0.6 * s), this.eyeMat, sx * (W / 2 + 0.6 * s), -0.8 * s, (-6 + k * 4) * s, false));
      // stencil
      const sten = new THREE.Mesh(new THREE.PlaneGeometry(7 * s, 1.0 * s), new THREE.MeshStandardMaterial({ map: Tex.stencil(o.name ?? 'SHEPHERD 04'), transparent: true, roughness: 0.6 }));
      sten.position.set(sx * (W / 2 + 0.56 * s), 1.0 * s, 1.5 * s);
      sten.rotation.y = sx * Math.PI / 2;
      B.add(sten);
    }
    // belly: dark machinery, pistons, hanging cables, belly lamps
    B.add(mesh(rb(W * 0.7, 1.4 * s, L * 0.75, 0.4 * s), dark, 0, -H / 2 - 0.5 * s, 0));
    for (let i = 0; i < 6; i++) {
      const c = mesh(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, (2 + (i % 3)) * s, 5), dark, (-2.5 + i) * s * 0.9, -H / 2 - 1.4 * s - (i % 3) * 0.5 * s, (-6 + i * 2.4) * s, false);
      B.add(c);
      this.cables.push(c);
    }
    for (const z of [-6, 0, 6]) B.add(mesh(new THREE.BoxGeometry(1.2 * s, 0.15 * s, 1.2 * s), this.lampMat, 0, -H / 2 - 1.25 * s, z * s, false));
    // tail: exhaust stacks
    for (const sx of [-1.6, 1.6]) B.add(mesh(new THREE.CylinderGeometry(0.5 * s, 0.6 * s, 3 * s, 10), dark, sx * s, H / 2 + 1.2 * s, -L / 2 + 1.5 * s));

    // ---------------------------------------------------------------- head on a neck
    const neck = mesh(rb(2.4 * s, 2.2 * s, 4 * s, 0.4 * s), dark, 0, 0.6 * s, L / 2 + 1.2 * s);
    B.add(neck);
    this.head.position.set(0, 0.2 * s, L / 2 + 3.6 * s);
    B.add(this.head);
    const Hd = this.head;
    Hd.add(mesh(rb(4.2 * s, 3.2 * s, 5.2 * s, 0.7 * s), hull, 0, 0, 0.6 * s));
    Hd.add(mesh(rb(3.6 * s, 0.9 * s, 1.0 * s, 0.3 * s), dark, 0, 0.3 * s, 3.1 * s));
    Hd.add(mesh(new THREE.BoxGeometry(3.0 * s, 0.32 * s, 0.1 * s), this.eyeMat, 0, 0.32 * s, 3.62 * s, false));
    // chin guns
    for (const sx of [-1, 1]) {
      Hd.add(mesh(new THREE.CylinderGeometry(0.22 * s, 0.22 * s, 3 * s, 8).rotateX(Math.PI / 2), steel, sx * 1.4 * s, -1.4 * s, 3.2 * s));
      Hd.add(mesh(rb(0.6 * s, 2.2 * s, 0.6 * s, 0.15 * s), dark, sx * 2.2 * s, 2.0 * s, -0.6 * s)); // antenna ears
    }
    // searchlight under the chin
    Hd.add(mesh(new THREE.CylinderGeometry(0.7 * s, 0.9 * s, 0.6 * s, 14).rotateX(Math.PI / 2), dark, 0, -1.6 * s, 2.0 * s));
    Hd.add(mesh(new THREE.CircleGeometry(0.62 * s, 16), this.lampMat, 0, -1.6 * s, 2.32 * s, false));
    this.body.position.y = this.bodyY;
    this.root.add(this.body);

    // ---------------------------------------------------------------- cargo
    if (o.cargo === 'house') this.cargoHouse(s, dark);
    else if (o.cargo === 'lamps') this.cargoLamps(s, dark);
    else if (o.cargo === 'tank') this.cargoTank(s, dark, steel);

    // ---------------------------------------------------------------- legs
    const thighL = 8.6 * s;
    const shinL = 9.4 * s;
    const order = [0, 0.5, 0.25, 0.75]; // FL, FR, HL, HR (a lateral-sequence walk)
    let li = 0;
    for (const front of [true, false]) {
      for (const sx of [-1, 1]) {
        const hip = new THREE.Vector3(sx * (W / 2 + 0.6 * s), -H / 2 + 0.6 * s, (front ? 1 : -1) * 7 * s);
        const home = new THREE.Vector3(sx * (W / 2 + 2.6 * s), 0, (front ? 1 : -1) * 8.2 * s);
        // hip housing on the hull
        B.add(mesh(rb(2.4 * s, 2.6 * s, 2.8 * s, 0.5 * s), dark, hip.x, hip.y + 0.4 * s, hip.z));
        const thigh = new THREE.Group();
        thigh.add(mesh(rb(1.9 * s, thighL, 2.1 * s, 0.4 * s).translate(0, -thighL / 2, 0), hull));
        thigh.add(mesh(new THREE.BoxGeometry(0.12 * s, thighL * 0.7, 2.15 * s).translate(0, -thighL / 2, 0), hazard, sx * 0.97 * s));
        const shin = new THREE.Group();
        shin.add(mesh(rb(1.4 * s, shinL, 1.6 * s, 0.35 * s).translate(0, -shinL / 2, 0), hull));
        shin.add(mesh(rb(0.9 * s, shinL * 0.5, 1.0 * s, 0.2 * s).translate(0, -shinL * 0.72, 0.4 * s), dark));
        // running lights down the front of each leg so the silhouette reads at night
        for (const side of [-1, 1]) {
          thigh.add(mesh(new THREE.BoxGeometry(0.14 * s, thighL * 0.75, 0.14 * s).translate(side * 0.75 * s, -thighL / 2, 1.08 * s), this.eyeMat, 0, 0, 0, false));
          shin.add(mesh(new THREE.BoxGeometry(0.12 * s, shinL * 0.7, 0.12 * s).translate(side * 0.55 * s, -shinL * 0.45, 0.82 * s), this.eyeMat, 0, 0, 0, false));
        }
        const knee = mesh(new THREE.CylinderGeometry(1.25 * s, 1.25 * s, 2.3 * s, 14).rotateZ(Math.PI / 2), dark);
        const piston = mesh(new THREE.CylinderGeometry(0.22 * s, 0.22 * s, 1, 8), steel);
        const foot = new THREE.Group();
        foot.add(mesh(rb(3.2 * s, 1.0 * s, 3.6 * s, 0.35 * s), dark, 0, 0.5 * s, 0));
        for (const t of [-1, 0, 1]) foot.add(mesh(rb(0.8 * s, 0.6 * s, 1.4 * s, 0.2 * s), hull, t * 1.05 * s, 0.3 * s, 2.0 * s));
        foot.add(mesh(rb(1.6 * s, 0.9 * s, 1.6 * s, 0.3 * s), hull, 0, 1.3 * s, 0));
        foot.add(mesh(new THREE.BoxGeometry(2.4 * s, 0.16 * s, 0.1 * s), this.lampMat, 0, 0.6 * s, 1.82 * s, false));
        this.legsGroup.add(thigh, shin, knee, piston, foot);
        this.legs.push({ hip, home, front, phase: order[li++], plant: new THREE.Vector3(), from: new THREE.Vector3(), to: new THREE.Vector3(), swinging: false, thigh, shin, knee, foot, piston });
      }
    }
    void thighL;
    // ---------------------------------------------------------------- searchlight beam + ground spot
    this.beamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.hostile ? '#ff5a40' : '#fff0c8').multiplyScalar(0.55), transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    this.beam = new THREE.Mesh(new THREE.CylinderGeometry(0.6 * s, 4.2, 1, 20, 1, true).translate(0, -0.5, 0), this.beamMat);
    this.beam.renderOrder = 4;
    this.spot = new THREE.Mesh(new THREE.CircleGeometry(4.2, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: Tex.radial(), color: new THREE.Color(this.hostile ? '#ff5a40' : '#fff0c8').multiplyScalar(0.9), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.spot.renderOrder = 3;
    mergeChildren(this.body, new Set<THREE.Object3D>([this.head, ...this.cables]));
    mergeChildren(this.head, new Set());
    for (const l of this.legs) for (const part of [l.thigh, l.shin, l.foot]) mergeChildren(part, new Set());
    this.root.add(this.legsGroup);
    this.root.add(this.beam, this.spot);
    this.legsGroup.matrixAutoUpdate = true;
  }

  private cargoHouse(s: number, dark: THREE.Material): void {
    // a whole townhouse, slung underneath on four cables: CIVIC moves houses at night
    const g = new THREE.Group();
    const siding = new THREE.MeshStandardMaterial({ color: '#c9b48a', roughness: 0.8, map: Tex.siding() });
    g.add(mesh(new THREE.BoxGeometry(7 * s, 5 * s, 9 * s), siding));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 5.2 * s, 2.6 * s, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 1.25), new THREE.MeshStandardMaterial({ color: '#3a2c28', roughness: 0.8 }));
    roof.position.y = 3.8 * s;
    roof.castShadow = true;
    g.add(roof);
    const win = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(1.6) });
    for (const sx of [-1, 1]) for (const z of [-2.5, 0, 2.5]) for (const y of [-1, 1.2]) g.add(mesh(new THREE.PlaneGeometry(1.2 * s, 1.1 * s).rotateY(sx * Math.PI / 2), Math.random() < 0.6 ? win : dark, sx * 3.52 * s, y * s, z * s, false));
    g.add(mesh(new THREE.PlaneGeometry(1.1 * s, 2 * s), new THREE.MeshStandardMaterial({ color: '#7a2a2a' }), 0, -1.5 * s, 4.52 * s, false));
    for (const [x, z] of [[-3, -4], [3, -4], [-3, 4], [3, 4]]) {
      const c = mesh(new THREE.CylinderGeometry(0.07 * s, 0.07 * s, 3.6 * s, 5), dark, x * s, 4.3 * s, z * s, false);
      g.add(c);
    }
    this.body.add(g);
    g.position.set(0, -3.25 * s - 6 * s, 0);
    this.cables.push(g);
  }

  private cargoLamps(s: number, dark: THREE.Material): void {
    // a chandelier of street lamps it plants along new roads
    for (let i = 0; i < 5; i++) {
      const lamp = new THREE.Group();
      lamp.add(mesh(new THREE.CylinderGeometry(0.15 * s, 0.15 * s, 5 * s, 6), dark, 0, -2.5 * s, 0, false));
      lamp.add(mesh(new THREE.BoxGeometry(0.6 * s, 0.25 * s, 0.9 * s), this.lampMat, 0, -5.1 * s, 0, false));
      lamp.position.set((i - 2) * 1.6 * s, -4.5 * s, (i % 2 ? 2 : -2) * s);
      this.body.add(lamp);
      this.cables.push(lamp);
    }
  }

  private cargoTank(s: number, dark: THREE.Material, steel: THREE.Material): void {
    const tank = mesh(new THREE.CylinderGeometry(2.6 * s, 2.6 * s, 12 * s, 18).rotateX(Math.PI / 2), steel, 0, -6.8 * s, 0);
    this.body.add(tank);
    for (const z of [-4, 0, 4]) this.body.add(mesh(new THREE.TorusGeometry(2.65 * s, 0.18 * s, 6, 24), dark, 0, -6.8 * s, z * s));
    this.cables.push(tank);
  }

  /** Put the walker somewhere and plant all four feet. */
  place(p: THREE.Vector3, yaw: number): this {
    const path = this.path;
    this.pos.copy(p);
    this.yaw = yaw;
    for (const l of this.legs) {
      l.plant.copy(this.homeWorld(l, 0));
      l.from.copy(l.plant);
      l.to.copy(l.plant);
      l.swinging = false;
    }
    this.look.copy(p).add(new THREE.Vector3(Math.sin(yaw) * 30, 0, Math.cos(yaw) * 30));
    this.solve(0);
    if (path.length) this.follow(path, this.loop);
    return this;
  }

  follow(path: THREE.Vector3[], loop = true): this {
    this.path = path;
    this.loop = loop;
    // start with the waypoint most directly ahead
    const f = this.fwd();
    let best = -2;
    this.wp = 0;
    path.forEach((p, i) => {
      const d = p.clone().sub(this.pos).setY(0);
      if (d.length() < 8 * this.scale) return;
      const k = d.normalize().dot(f);
      if (k > best) {
        best = k;
        this.wp = i;
      }
    });
    return this;
  }

  private fwd(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  private homeWorld(l: Leg, ahead: number): THREE.Vector3 {
    const c = Math.cos(this.yaw);
    const sn = Math.sin(this.yaw);
    const h = l.home;
    return new THREE.Vector3(this.pos.x + h.x * c + h.z * sn, 0, this.pos.z - h.x * sn + h.z * c).addScaledVector(this.fwd(), ahead);
  }

  /** Feet planted on the ground (for traffic and colliders). */
  plantedFeet(): THREE.Vector3[] {
    return this.legs.filter((l) => !l.swinging).map((l) => l.plant);
  }

  /** Collapse: knees buckle, the hull tilts and crashes down. */
  collapse(dir = 1): void {
    this.dead = true;
    this.fallDir = dir;
    this.speed = 0;
    this.eyeMat.color.set('#111111');
    this.beam.visible = false;
    this.spot.visible = false;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.dead) {
      this.fall = Math.min(1, this.fall + dt * (0.25 + this.fall * 1.6));
      this.solve(dt);
      return;
    }
    // steer along the path
    if (this.path.length) {
      const target = this.path[this.wp];
      const dx = target.x - this.pos.x;
      const dz = target.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 6 * this.scale) {
        if (this.wp < this.path.length - 1) this.wp++;
        else if (this.loop) this.wp = 0;
        else this.speed = Math.max(0, this.speed - dt * 2);
      }
      const want = Math.atan2(dx, dz);
      let d = want - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      const turn = 0.12 / Math.sqrt(this.scale);
      this.yaw += THREE.MathUtils.clamp(d, -turn * dt, turn * dt);
      const slow = Math.abs(d) > 0.5 ? 0.5 : 1;
      if (!(this.wp === this.path.length - 1 && !this.loop && dist < 6 * this.scale)) this.speed = THREE.MathUtils.damp(this.speed, this.cruise * slow, 1.5, dt);
    }
    this.pos.addScaledVector(this.fwd(), this.speed * dt);
    // gait
    const T = this.period;
    const moving = this.speed > 0.05;
    for (const l of this.legs) {
      const p = (((this.t / T + l.phase) % 1) + 1) % 1;
      const swing = moving && p < 0.25;
      if (swing && !l.swinging) {
        l.swinging = true;
        l.from.copy(l.plant);
        const stride = this.speed * T;
        l.to.copy(this.homeWorld(l, this.speed * T * 0.25 + stride * 0.375));
      }
      if (l.swinging) {
        const k = swing ? p / 0.25 : 1;
        const e = k * k * (3 - 2 * k);
        l.plant.lerpVectors(l.from, l.to, e);
        l.plant.y = Math.sin(Math.PI * k) * 2.6 * this.scale;
        if (!swing) {
          l.swinging = false;
          l.plant.copy(l.to);
          l.plant.y = 0;
          this.onStep?.(l.plant, this.scale);
        }
      }
    }
    this.solve(dt);
  }

  private solve(dt: number): void {
    const s = this.scale;
    const swayT = this.t * (Math.PI * 4) / this.period;
    this.body.position.copy(this.pos);
    this.body.position.y = this.bodyY + Math.sin(swayT) * 0.18 * s - this.fall * this.bodyY * 0.62;
    this.body.rotation.set(Math.sin(swayT * 0.5) * 0.012 + this.fall * 0.22 * this.fallDir, this.yaw, Math.sin(swayT * 0.5) * 0.02 + this.fall * 0.3 * this.fallDir, 'YXZ');
    this.root.updateMatrixWorld(true);
    const toRoot = (o: THREE.Object3D, v: THREE.Vector3) => this.root.worldToLocal(o.localToWorld(v));
    // head looks toward the look point (lookTarget is in world space, look in root space)
    const want = this.lookTarget ? this.lookTarget.clone() : this.root.localToWorld(this.look.clone());
    this.body.worldToLocal(want);
    const hp = this.head.position;
    const yawH = THREE.MathUtils.clamp(Math.atan2(want.x - hp.x, want.z - hp.z), -0.9, 0.9);
    const pitchH = THREE.MathUtils.clamp(Math.atan2(-(want.y - hp.y), Math.hypot(want.x - hp.x, want.z - hp.z)), -0.2, 0.9);
    this.head.rotation.y = THREE.MathUtils.damp(this.head.rotation.y, yawH, 2, dt || 0.016);
    this.head.rotation.x = THREE.MathUtils.damp(this.head.rotation.x, pitchH, 2, dt || 0.016);
    // dangling cables swing
    this.cables.forEach((c, i) => {
      c.rotation.x = Math.sin(this.t * 1.1 + i) * 0.05 - this.speed * 0.01;
      c.rotation.z = Math.sin(this.t * 0.8 + i * 2) * 0.04;
    });
    // legs: two-bone IK in world space
    const thighL = 8.6 * s;
    const shinL = 9.4 * s;
    for (const l of this.legs) {
      const H = toRoot(this.body, l.hip.clone());
      const F = l.plant.clone();
      if (this.fall > 0) F.lerp(new THREE.Vector3(F.x, 0, F.z), 1);
      const to = _a.copy(F).sub(H);
      let d = to.length();
      const maxD = (thighL + shinL) * 0.995;
      if (d > maxD) {
        to.multiplyScalar(maxD / d);
        d = maxD;
        F.copy(H).add(to);
      }
      const u = to.clone().normalize();
      // knees: front legs bend forward, hind legs backward (AT-AT style)
      const bendDir = this.fwd().multiplyScalar(l.front ? 1 : -1);
      const n = bendDir.sub(u.clone().multiplyScalar(bendDir.dot(u))).normalize();
      const x = (thighL * thighL - shinL * shinL + d * d) / (2 * d);
      const hgt = Math.sqrt(Math.max(0, thighL * thighL - x * x));
      const K = H.clone().addScaledVector(u, x).addScaledVector(n, hgt);
      l.thigh.position.copy(H);
      l.thigh.quaternion.setFromUnitVectors(DOWN, _b.copy(K).sub(H).normalize());
      l.shin.position.copy(K);
      l.shin.quaternion.setFromUnitVectors(DOWN, _b.copy(F).sub(K).normalize());
      l.knee.position.copy(K);
      l.knee.quaternion.setFromAxisAngle(UP, this.yaw);
      // piston from mid-thigh to mid-shin (the back of the knee)
      const pa = H.clone().lerp(K, 0.45);
      const pb = K.clone().lerp(F, 0.4);
      l.piston.position.copy(pa).lerp(pb, 0.5).addScaledVector(n, -0.9 * s);
      l.piston.quaternion.setFromUnitVectors(UP, _b.copy(pb).sub(pa).normalize());
      l.piston.scale.set(1, pa.distanceTo(pb), 1);
      l.foot.position.copy(F);
      l.foot.quaternion.copy(_q.setFromAxisAngle(UP, this.yaw));
    }
    // searchlight beam from the chin lamp to the ground point
    const lamp = toRoot(this.head, new THREE.Vector3(0, -1.6 * s, 2.4 * s));
    const ground = this.look.clone();
    ground.y = 0.06;
    const dir = ground.clone().sub(lamp);
    const len = dir.length();
    this.beam.position.copy(lamp);
    this.beam.quaternion.setFromUnitVectors(DOWN, dir.normalize());
    this.beam.scale.set(1, len, 1);
    this.spot.position.copy(ground);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.geometry.dispose();
    });
  }
}
