import * as THREE from 'three';
import type { Game } from './Game';
import type { ChapterDef } from './types';
import { SPEAKERS } from './types';
import { LevelBuilder } from '../world/LevelBuilder';
import { MaterialKit } from '../render/DreamShading';
import { Actor, LostCourier, ParcelHusk, Resident, ResidentDef, Sleepless, StaticFigure, Watcher } from '../entities/Actors';
import type { ChapterLook } from '../render/Atmosphere';
import type { Expression } from '../entities/Rig';
import type { DialogueLine } from '../ui/Ui';
import { prep, roundedGeo } from '../world/Geo';
import type { Collider } from '../world/Physics';

export interface Checkpoint {
  pos: THREE.Vector3;
  facing: number;
  objective?: string;
  waypoint?: THREE.Vector3 | null;
  restore?: () => void;
}

export interface Trigger {
  center: THREE.Vector3;
  half: THREE.Vector3;
  once: boolean;
  fired: boolean;
  reArm: boolean;
  enabled: boolean;
  fn: () => void | Promise<void>;
}

export interface Interactable {
  pos: THREE.Vector3;
  radius: number;
  label: string | (() => string);
  key?: string;
  enabled: () => boolean;
  onUse: () => void | Promise<void>;
  once: boolean;
  used: boolean;
}

export interface Anchor {
  pos: THREE.Vector3;
  radius: number;
  active: boolean;
  group: THREE.Group;
  ring: THREE.Mesh;
  beacon: THREE.Mesh;
  color: THREE.Color;
  label: string;
  onActivate: () => void | Promise<void>;
  enabled: () => boolean;
}

export interface Stamp {
  id: string;
  pos: THREE.Vector3;
  mesh: THREE.Group;
  collected: boolean;
}

/** Line shorthand: [speaker, text, expression?] */
export type Say = [string, string, Expression?] | DialogueLine;

/** One loaded chapter: its geometry, actors, triggers and story script. */
export class Level {
  readonly root = new THREE.Group();
  readonly mats = new MaterialKit();
  readonly b: LevelBuilder;
  readonly actors: Actor[] = [];
  readonly checkpoints: Checkpoint[] = [];
  readonly triggers: Trigger[] = [];
  readonly interactables: Interactable[] = [];
  readonly anchors: Anchor[] = [];
  readonly stamps: Stamp[] = [];
  readonly updaters: Array<(dt: number, t: number) => void> = [];
  readonly respawnHooks: Array<() => void> = [];
  readonly pulseHooks: Array<(origin: THREE.Vector3) => void> = [];
  start = { pos: new THREE.Vector3(), facing: Math.PI, camYaw: 0 };
  killY = -40;
  cpIndex = 0;
  objectiveText = '';
  waypointPos: THREE.Vector3 | null = null;
  intro: (() => Promise<void>) | null = null;
  introRunning: Promise<void> | null = null;
  /** Chase intensity 0..1 for audio/UI. */
  chase = 0;
  time = 0;
  private stampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.0, 1.0), toneMapped: false });

  constructor(readonly game: Game, readonly def: ChapterDef) {
    this.b = new LevelBuilder(this.root, game.physics, this.mats);
    this.root.name = `chapter-${def.key}`;
  }

  get player() {
    return this.game.player;
  }

  // ---------------- authoring ----------------
  setStart(x: number, y: number, z: number, facing: number, camYaw?: number): void {
    this.start.pos.set(x, y, z);
    this.start.facing = facing;
    this.start.camYaw = camYaw ?? facing + Math.PI;
    if (!this.checkpoints.length) this.checkpoints.push({ pos: this.start.pos.clone(), facing });
  }

  checkpoint(x: number, y: number, z: number, facing: number, o: { objective?: string; waypoint?: THREE.Vector3 | null; restore?: () => void; radius?: number } = {}): number {
    const idx = this.checkpoints.length;
    this.checkpoints.push({ pos: new THREE.Vector3(x, y, z), facing, objective: o.objective, waypoint: o.waypoint, restore: o.restore });
    this.trigger(x, y + 1, z, o.radius ?? 3, 3, o.radius ?? 3, () => {
      if (this.cpIndex < idx) {
        this.cpIndex = idx;
        this.game.saveCheckpoint(idx);
      }
    });
    return idx;
  }

  trigger(x: number, y: number, z: number, w: number, h: number, d: number, fn: () => void | Promise<void>, o: { once?: boolean; reArm?: boolean } = {}): Trigger {
    const t: Trigger = {
      center: new THREE.Vector3(x, y, z),
      half: new THREE.Vector3(w / 2, h / 2, d / 2),
      once: o.once ?? true,
      fired: false,
      reArm: o.reArm ?? false,
      enabled: true,
      fn,
    };
    this.triggers.push(t);
    return t;
  }

  interact(x: number, y: number, z: number, label: string | (() => string), onUse: () => void | Promise<void>, o: { radius?: number; once?: boolean; enabled?: () => boolean; key?: string } = {}): Interactable {
    const it: Interactable = {
      pos: new THREE.Vector3(x, y, z),
      radius: o.radius ?? 2.2,
      label,
      key: o.key,
      enabled: o.enabled ?? (() => true),
      onUse,
      once: o.once ?? false,
      used: false,
    };
    this.interactables.push(it);
    return it;
  }

  /** Dream anchor: a pedestal activated by the Dream Pulse. */
  anchor(x: number, y: number, z: number, color: string, label: string, onActivate: () => void | Promise<void>, o: { enabled?: () => boolean; radius?: number } = {}): Anchor {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    const ped = new THREE.Mesh(prep(new THREE.CylinderGeometry(0.55, 0.75, 0.9, 16), '#f3e6ff', 0.3, '#ffffff'), this.mats.satin);
    ped.position.y = 0.45;
    ped.castShadow = ped.receiveShadow = true;
    const top = new THREE.Mesh(prep(roundedGeo(0.7, 0.18, 0.7, 0.06, 2), '#d9c2ff', 0.1), this.mats.satin);
    top.position.y = 0.95;
    top.rotation.y = Math.PI / 4;
    const c = new THREE.Color(color);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.2), toneMapped: false }));
    ring.position.y = 1.7;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshBasicMaterial({ color: c.clone().multiplyScalar(2.6), toneMapped: false }));
    core.position.y = 1.7;
    ring.add(core);
    g.add(ped, top, ring);
    this.root.add(g);
    this.game.physics.addBox(x, y + 0.5, z, 1.2, 1.0, 1.2, { climbable: true });
    const beacon = this.game.vfx.beacon(color, 60, 0.5);
    beacon.position.set(x, y + 1, z);
    const a: Anchor = { pos: new THREE.Vector3(x, y + 1.2, z), radius: o.radius ?? 4.5, active: true, group: g, ring, beacon, color: c, label, onActivate, enabled: o.enabled ?? (() => true) };
    this.anchors.push(a);
    return a;
  }

  /** Optional collectible Dream Stamp. */
  stamp(id: string, x: number, y: number, z: number): void {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const ang = (i / 10) * Math.PI * 2 + Math.PI / 2;
      const r = i % 2 ? 0.16 : 0.36;
      if (i === 0) shape.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else shape.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 });
    geo.center();
    const star = new THREE.Mesh(geo, this.stampMat);
    g.add(star);
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.5, 32), new THREE.MeshBasicMaterial({ color: '#ffe2a8', transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
    g.add(halo);
    g.position.set(x, y + 1, z);
    this.root.add(g);
    const already = this.game.save.stamps[String(this.def.id)]?.includes(id) ?? false;
    if (already) g.visible = false;
    this.stamps.push({ id, pos: g.position, mesh: g, collected: already });
  }

  resident(def: ResidentDef): Resident {
    const r = new Resident(def);
    return this.addActor(r);
  }

  husk(x: number, y: number, z: number, facing = 0, scale = 1): ParcelHusk {
    return this.addActor(new ParcelHusk(x, y, z, facing, scale));
  }

  courier(path: Array<[number, number, number]>, o: { range?: number; speed?: number } = {}): LostCourier {
    return this.addActor(new LostCourier(path, o));
  }

  staticFigure(x: number, y: number, z: number, facing = 0): StaticFigure {
    return this.addActor(new StaticFigure(x, y, z, facing));
  }

  watcher(x: number, y: number, z: number, scale = 2.6): Watcher {
    return this.addActor(new Watcher(x, y, z, scale));
  }

  sleepless(x: number, y: number, z: number, scale = 1.35): Sleepless {
    const s = this.addActor(new Sleepless(x, y, z, scale));
    s.group.visible = false;
    return s;
  }

  addActor<T extends Actor>(a: T): T {
    a.name ||= `${a.kind}-${this.actors.length}`;
    this.actors.push(a);
    this.root.add(a.group);
    return a;
  }

  onUpdate(fn: (dt: number, t: number) => void): void {
    this.updaters.push(fn);
  }

  onRespawn(fn: () => void): void {
    this.respawnHooks.push(fn);
  }

  onPulse(fn: (origin: THREE.Vector3) => void): void {
    this.pulseHooks.push(fn);
  }

  /** A kinematic moving platform; returns the collider + mesh, call move(pos) each frame. */
  movingPlatform(mesh: THREE.Object3D, w: number, h: number, d: number, surface: Collider['surface'] = 'wood'): { col: Collider; move: (x: number, y: number, z: number) => void } {
    const p = mesh.position;
    const col = this.game.physics.addBox(p.x, p.y, p.z, w, h, d, { surface, climbable: true });
    col.delta = new THREE.Vector3();
    const move = (x: number, y: number, z: number) => {
      col.delta!.set(x - p.x, y - p.y, z - p.z);
      p.set(x, y, z);
      col.min.set(x - w / 2, y - h / 2, z - d / 2);
      col.max.set(x + w / 2, y + h / 2, z + d / 2);
    };
    return { col, move };
  }

  // ---------------- story helpers ----------------
  say(...lines: Say[]): Promise<void> {
    const out: DialogueLine[] = lines.map((l) => {
      if (!Array.isArray(l)) return l;
      const [who, text, expr] = l;
      const sp = SPEAKERS[who] ?? { color: '#ffd46b', pitch: 500 };
      return { who, text, color: sp.color, pitch: sp.pitch, thought: who === 'Ori' && text.startsWith('('), expr };
    });
    return this.game.dialogue(out);
  }

  choose(who: string, text: string, options: string[]): Promise<number> {
    const sp = SPEAKERS[who] ?? { color: '#ffd46b', pitch: 500 };
    return this.game.ui.choose({ who, text, color: sp.color, pitch: sp.pitch }, options);
  }

  objective(text: string, waypoint: THREE.Vector3 | [number, number, number] | null = null): void {
    this.objectiveText = text;
    this.waypointPos = waypoint ? (Array.isArray(waypoint) ? new THREE.Vector3(...waypoint) : waypoint.clone()) : null;
    this.game.refreshObjective();
  }

  wait(sec: number): Promise<void> {
    return this.game.wait(sec);
  }

  /** Run fn after `sec` seconds of game time (pauses with the game). */
  after(sec: number, fn: () => void): void {
    void this.game.wait(sec).then(fn);
  }

  cine(pos: THREE.Vector3 | [number, number, number], look: THREE.Vector3 | [number, number, number], fov?: number): void {
    const P = Array.isArray(pos) ? new THREE.Vector3(...pos) : pos.clone();
    const L = Array.isArray(look) ? new THREE.Vector3(...look) : look.clone();
    this.game.camRig.cinematic = { pos: P, look: L, fov };
  }

  cineEnd(): void {
    this.game.camRig.cinematic = null;
  }

  setLook(l: ChapterLook, dur = 2): void {
    this.game.atmos.blendTo(l, dur);
  }

  toast(text: string): void {
    this.game.ui.toast(text);
  }

  shake(a: number): void {
    this.game.camRig.addTrauma(a);
  }

  flash(color = '#ffffff', amount = 0.8): void {
    this.game.post.setFlashColor(color);
    this.game.post.flash = amount;
  }

  glitch(amount = 0.8): void {
    this.game.post.glitchPulse = amount;
    this.game.post.aberrationPulse = amount;
  }

  parcel(color: string | null): void {
    this.game.setParcel(color);
  }

  expression(e: import('../entities/Rig').Expression): void {
    this.player.rig.expression = e;
  }

  /** Freeze/unfreeze player control for scripted moments. */
  lock(on: boolean): void {
    this.game.scriptLock = on;
  }

  async walkTo(x: number, z: number, speed = 2.6): Promise<void> {
    const p = this.player;
    const y = p.pos.y;
    await new Promise<void>((res) => {
      p.autoWalk = { to: new THREE.Vector3(x, y, z), speed, done: res };
    });
  }

  complete(): void {
    void this.game.completeChapter();
  }

  // ---------------- runtime ----------------
  respawn(): void {
    for (const a of this.actors) a.reset();
    for (const h of this.respawnHooks) h();
    for (const t of this.triggers) if (t.reArm) t.fired = false;
    this.chase = 0;
  }

  update(dt: number): void {
    this.time += dt;
    const pp = this.player.pos;
    for (const t of this.triggers) {
      if (!t.enabled || (t.once && t.fired)) continue;
      const inside = Math.abs(pp.x - t.center.x) <= t.half.x && Math.abs(pp.y + 0.8 - t.center.y) <= t.half.y && Math.abs(pp.z - t.center.z) <= t.half.z;
      if (inside) {
        t.fired = true;
        void t.fn();
      }
    }
    for (const a of this.anchors) {
      a.ring.rotation.y += dt * (a.active ? 1.2 : 0.3);
      a.ring.rotation.x = Math.sin(this.time * 0.8) * 0.4;
      a.ring.position.y = 1.7 + Math.sin(this.time * 1.6) * 0.08;
      a.beacon.visible = a.active && a.enabled();
    }
    for (const s of this.stamps) {
      if (s.collected) continue;
      s.mesh.rotation.y += dt * 1.6;
      s.mesh.children[0].position.y = Math.sin(this.time * 2) * 0.1;
      if (s.pos.distanceTo(pp.clone().setY(pp.y + 1)) < 1.2) {
        s.collected = true;
        s.mesh.visible = false;
        this.game.collectStamp(this.def.id, s.id, s.pos);
      }
    }
    for (const u of this.updaters) u(dt, this.time);
  }

  dispose(): void {
    for (const a of this.actors) {
      a.dispose();
      const r = (a as unknown as { rig?: { dispose(): void } }).rig;
      r?.dispose();
    }
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    this.root.removeFromParent();
    this.mats.dispose();
    this.stampMat.dispose();
  }
}
