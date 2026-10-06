import * as THREE from 'three';
import { Animator, bakeMeshes, buildPenitent, gaitRate, dome, idle, latheG, limb, locomotion, mesh, skeleton, track, type Pose, type Rig } from './Rig';
import { Cloth } from './Cloth';
import { Mats } from '../world/Materials';
import type { Combatant, EventBus, HitInfo } from '../systems/Combat';
import type { Vfx } from '../systems/Vfx';
import type { Nav } from '../game/Nav';
import type { Player } from './Player';
import { clamp, damp, dampAngle } from '../utils/math';

export type EnemyCtx = {
  player: Player;
  nav: Nav;
  bus: EventBus;
  vfx: Vfx;
  shake: (amount: number) => void;
  hitstop: (ms: number) => void;
  rng: () => number;
  spawnMite: (pos: THREE.Vector3) => void;
};

type EState = 'dormant' | 'emerge' | 'idle' | 'chase' | 'telegraph' | 'strike' | 'recover' | 'stagger' | 'dead';

type Wave = { center: THREE.Vector3; r: number; speed: number; maxR: number; width: number; damage: number; done: boolean };

export abstract class Enemy implements Combatant {
  readonly group = new THREE.Group();
  readonly pos = this.group.position;
  hp: number;
  alive = true;
  state: EState = 'idle';
  stateT = 0;
  yaw = 0;
  pathIndex = -1;
  poise: number;
  removed = false;
  protected cooldown = 0;
  protected attackId = '';
  protected hitDone = false;
  protected readonly vel = new THREE.Vector3();
  protected readonly tmp = new THREE.Vector3();
  protected flash = 0;
  protected readonly waves: Wave[] = [];
  encounter = '';
  /** Optional cloth (cloak/cape) simulated by the game after the scene matrices update. */
  cloth: Cloth | null = null;
  /** Bosses that are reused across respawns keep their geometry when removed. */
  persistent = false;

  constructor(
    readonly name: string,
    readonly kind: string,
    public maxHp: number,
    readonly radius: number,
    readonly maxPoise: number,
    protected readonly aggro: number,
  ) {
    this.hp = maxHp;
    this.poise = maxPoise;
  }

  abstract focusPoint(target: THREE.Vector3): THREE.Vector3;
  protected abstract think(dt: number, time: number, ctx: EnemyCtx): void;
  protected abstract onStagger(): void;

  protected setState(s: EState): void {
    this.state = s;
    this.stateT = 0;
    this.hitDone = false;
  }

  protected toPlayer(ctx: EnemyCtx): { d: number; dir: THREE.Vector3; ang: number } {
    const dir = this.tmp.copy(ctx.player.pos).sub(this.pos).setY(0);
    const d = dir.length();
    dir.divideScalar(Math.max(0.001, d));
    const ang = Math.atan2(dir.x, dir.z);
    return { d, dir, ang };
  }

  takeHit(hit: HitInfo): void {
    if (!this.alive || this.state === 'dormant' || this.state === 'emerge') return;
    this.hp -= hit.damage * (this.state === 'stagger' ? 1.3 : 1);
    this.poise -= hit.poise;
    this.flash = 1;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.setState('dead');
      return;
    }
    if (this.poise <= 0 && this.state !== 'stagger') {
      this.poise = this.maxPoise;
      this.onStagger();
      this.setState('stagger');
      this.tmp.copy(this.pos).sub(hit.from).setY(0).normalize();
      this.vel.copy(this.tmp).multiplyScalar(hit.heavy ? 5 : 3);
    }
  }

  /** Melee check helper: player within reach and arc in front. */
  protected inArc(ctx: EnemyCtx, reach: number, arc: number): boolean {
    const p = ctx.player.pos;
    const dx = p.x - this.pos.x;
    const dz = p.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d > reach + 0.4) return false;
    const fx = Math.sin(this.yaw);
    const fz = Math.cos(this.yaw);
    const ang = Math.acos(clamp((dx * fx + dz * fz) / Math.max(0.001, d), -1, 1));
    return ang < arc / 2 || d < this.radius + 0.6;
  }

  protected strikePlayer(ctx: EnemyCtx, damage: number, heavy: boolean): void {
    const landed = ctx.player.takeHit({ damage, poise: damage, from: this.pos.clone(), heavy });
    if (landed) {
      ctx.shake(heavy ? 0.55 : 0.35);
      ctx.hitstop(heavy ? 90 : 60);
    }
  }

  protected spawnWave(center: THREE.Vector3, speed: number, maxR: number, width: number, damage: number): void {
    this.waves.push({ center: center.clone(), r: 0.3, speed, maxR, width, damage, done: false });
  }

  private updateWaves(dt: number, ctx: EnemyCtx): void {
    for (const w of this.waves) {
      w.r += w.speed * dt;
      if (!w.done) {
        const d = Math.hypot(ctx.player.pos.x - w.center.x, ctx.player.pos.z - w.center.z);
        if (Math.abs(d - w.r) < w.width && Math.abs(ctx.player.pos.y - w.center.y) < 2.5) {
          w.done = true;
          this.strikePlayer(ctx, w.damage, w.damage > 20);
        }
      }
    }
    for (let i = this.waves.length - 1; i >= 0; i -= 1) if (this.waves[i].r > this.waves[i].maxR) this.waves.splice(i, 1);
  }

  update(dt: number, time: number, ctx: EnemyCtx): void {
    this.stateT += dt;
    this.cooldown -= dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    if (this.alive && this.state !== 'stagger') this.poise = Math.min(this.maxPoise, this.poise + this.maxPoise * 0.12 * dt);
    this.think(dt, time, ctx);
    this.updateWaves(dt, ctx);
    if (this.state !== 'dormant' && this.state !== 'emerge') {
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
      const y = this.pos.y;
      this.pathIndex = ctx.nav.resolve(this.pos, this.radius * 0.8, this.pathIndex);
      if (this.state === 'dead') this.pos.y = Math.min(this.pos.y, y);
    }
    this.group.rotation.y = this.yaw;
  }

  /** Called after any external teleport. */
  place(p: THREE.Vector3, yaw: number): void {
    this.pos.copy(p);
    this.yaw = yaw;
    this.pathIndex = -1;
  }
}

// ======================================================================= Marrowmite

export class Marrowmite extends Enemy {
  private readonly body = new THREE.Group();
  private readonly legs: Array<{ g: THREE.Group; lower: THREE.Group; side: number; idx: number }> = [];
  private readonly eyeMat: THREE.MeshStandardMaterial;
  private readonly mandibles: THREE.Object3D[] = [];
  private phase = 0;
  private lungeDir = new THREE.Vector3();
  private emergeFrom = 0;

  constructor() {
    super('Marrowmite', 'mite', 42, 0.6, 12, 18);
    const m = Mats();
    this.eyeMat = m.marrowGlow.clone();
    this.group.add(this.body);
    this.body.position.y = 0.48;
    const abd = new THREE.SphereGeometry(0.42, 12, 9);
    abd.scale(1, 0.75, 1.4);
    this.body.add(mesh(abd, m.bone, 0, 0.05, -0.45));
    // Glowing seams between carapace plates.
    for (let i = 0; i < 3; i += 1) {
      this.body.add(mesh(new THREE.TorusGeometry(0.33 - i * 0.05, 0.025, 4, 14), this.eyeMat, 0, 0.06, -0.25 - i * 0.22, 0, 0, 0));
    }
    this.body.add(mesh(new THREE.SphereGeometry(0.3, 10, 8).scale(1, 0.8, 1.1), m.bone, 0, 0.02, 0.05));
    const head = mesh(new THREE.SphereGeometry(0.22, 10, 8).scale(1.1, 0.8, 1.2), m.bone, 0, 0.0, 0.38);
    this.body.add(head);
    for (const sx of [-1, 1]) {
      const mand = mesh(new THREE.ConeGeometry(0.05, 0.36, 5), m.bone, sx * 0.1, -0.06, 0.6, Math.PI / 2 + 0.2, 0, sx * 0.5);
      mand.userData.keep = true;
      this.mandibles.push(mand);
      this.body.add(mand);
      this.body.add(mesh(new THREE.SphereGeometry(0.045, 6, 5), this.eyeMat, sx * 0.1, 0.07, 0.53));
      this.body.add(mesh(new THREE.SphereGeometry(0.03, 6, 5), this.eyeMat, sx * 0.16, 0.04, 0.47));
    }
    // Dorsal spines.
    for (let i = 0; i < 5; i += 1) {
      this.body.add(mesh(new THREE.ConeGeometry(0.05, 0.28 - i * 0.03, 5), m.bone, 0, 0.3 - i * 0.02, -0.05 - i * 0.2, -0.5));
    }
    for (let i = 0; i < 3; i += 1) {
      for (const side of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(side * 0.22, 0, 0.15 - i * 0.25);
        g.rotation.set(0, side * (0.3 - i * 0.3), side * -1.0);
        this.body.add(g);
        g.add(mesh(limb(0.05, 0.035, 0.45, 6), m.bone, 0, 0, 0));
        const lower = new THREE.Group();
        lower.position.y = -0.45;
        lower.rotation.z = side * 1.9;
        g.add(lower);
        lower.add(mesh(limb(0.035, 0.012, 0.55, 6), m.bone, 0, 0, 0));
        this.legs.push({ g, lower, side, idx: i });
      }
    }
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2).rotateX(-Math.PI / 2), m.contactShadow);
    sh.position.y = 0.03;
    this.group.add(sh);
    bakeMeshes(this.body);
  }

  /** Burrow up out of the ground. */
  emerge(delay = 0): void {
    this.setState('emerge');
    this.emergeFrom = -delay;
    this.body.position.y = -1.2;
  }

  focusPoint(t: THREE.Vector3): THREE.Vector3 {
    return t.copy(this.pos).setY(this.pos.y + 0.6);
  }

  protected onStagger(): void {
    this.flash = 1;
  }

  protected think(dt: number, time: number, ctx: EnemyCtx): void {
    this.eyeMat.emissiveIntensity = 2.6 + this.flash * 6 + (this.state === 'telegraph' ? 5 : 0);
    const { d, dir, ang } = this.toPlayer(ctx);
    let walk = 0;
    let rear = 0;
    switch (this.state) {
      case 'emerge': {
        const t = this.stateT + this.emergeFrom;
        if (t < 0) {
          this.body.visible = false;
          break;
        }
        this.body.visible = true;
        if (t < dt * 1.5) ctx.vfx.dust(this.pos, 8, 0.8, '#5a4a40');
        this.body.position.y = -1.2 + Math.min(1, t / 0.9) * 1.68;
        this.yaw = ang;
        walk = 1;
        if (t > 0.9) this.setState('chase');
        break;
      }
      case 'idle':
        if (d < this.aggro) this.setState('chase');
        break;
      case 'chase': {
        const weave = Math.sin(time * 3 + this.maxHp) * 0.6;
        this.yaw = dampAngle(this.yaw, ang + weave * 0.4, 8, dt);
        const sp = d > 2.6 ? 5.2 : 0;
        this.vel.set(Math.sin(this.yaw) * sp, 0, Math.cos(this.yaw) * sp);
        walk = sp / 5;
        if (d < 3.4 && this.cooldown <= 0 && ctx.player.state !== 'dead') {
          this.setState('telegraph');
          ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: 'mite' });
        }
        break;
      }
      case 'telegraph':
        this.vel.multiplyScalar(Math.exp(-10 * dt));
        this.yaw = dampAngle(this.yaw, ang, 10, dt);
        rear = Math.min(1, this.stateT / 0.3);
        if (this.stateT > 0.5) {
          this.lungeDir.copy(dir);
          this.setState('strike');
          ctx.bus.emit({ type: 'enemy-attack', pos: this.pos.clone(), kind: 'mite' });
        }
        break;
      case 'strike':
        this.vel.copy(this.lungeDir).multiplyScalar(this.stateT < 0.28 ? 9.5 : 2);
        rear = -0.3;
        if (!this.hitDone && d < 1.3) {
          this.hitDone = true;
          this.strikePlayer(ctx, 12, false);
        }
        if (this.stateT > 0.36) {
          this.setState('recover');
          this.cooldown = 1.2 + ctx.rng() * 0.8;
        }
        break;
      case 'recover':
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        if (this.stateT > 0.75) this.setState('chase');
        break;
      case 'stagger':
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        rear = -0.2;
        if (this.stateT > 0.5) this.setState('chase');
        break;
      case 'dead':
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        this.body.rotation.z = damp(this.body.rotation.z, Math.PI, 8, dt);
        this.body.position.y = damp(this.body.position.y, 0.3, 6, dt);
        if (this.stateT > 1.6) this.group.position.y -= dt * 0.5;
        if (this.stateT > 3.2) this.removed = true;
        if (this.stateT < dt * 1.5) {
          ctx.vfx.ichor(this.focusPoint(new THREE.Vector3()), 22);
          ctx.bus.emit({ type: 'enemy-dead', pos: this.pos.clone(), kind: 'mite' });
        }
        break;
      default:
        break;
    }
    // Hit squash.
    const sq = 1 - this.flash * 0.25;
    this.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.body.rotation.x = damp(this.body.rotation.x, -rear * 0.55, 14, dt);
    // Tripod gait.
    this.phase += dt * (walk * 16 + (this.state === 'telegraph' ? 5 : 0));
    for (const leg of this.legs) {
      const tri = (leg.idx + (leg.side > 0 ? 1 : 0)) % 2 === 0 ? 0 : Math.PI;
      const s = Math.sin(this.phase + tri);
      if (this.state === 'dead') {
        leg.g.rotation.z = damp(leg.g.rotation.z, leg.side * -0.2, 6, dt);
        leg.lower.rotation.z = damp(leg.lower.rotation.z, leg.side * 2.6, 6, dt);
        continue;
      }
      leg.g.rotation.x = s * 0.45 * Math.min(1, walk + 0.2);
      leg.g.rotation.z = leg.side * (-1.0 + Math.max(0, Math.cos(this.phase + tri)) * 0.35 * walk);
    }
    for (const [i, md] of this.mandibles.entries()) {
      md.rotation.z = (i === 0 ? -1 : 1) * (0.5 + Math.sin(time * 18) * 0.15 * (this.state === 'telegraph' ? 3 : 1));
    }
    if (this.state !== 'emerge' && this.state !== 'dead') this.body.position.y = 0.48 + Math.abs(Math.sin(this.phase)) * 0.04;
  }
}

// ======================================================================= Hushed Penitent

const PENITENT_SWING: Array<[number, Pose]> = [
  [0, { shoulderR: [0.5, 0, -1.3], elbowR: [-0.4, 0, 0], chest: [0, -0.6, 0], spine: [0.2, -0.3, 0], shoulderL: [-0.3, 0, 0.4] }],
  [0.5, { shoulderR: [-1.3, 0, 0.9], elbowR: [-0.1, 0, 0], chest: [0.1, 0.7, 0], spine: [0.35, 0.3, 0], hipL: [-0.5, 0, 0], kneeL: [0.5, 0, 0] }],
  [1, { shoulderR: [-0.6, 0, 1.0], elbowR: [-0.4, 0, 0], chest: [0.1, 0.5, 0], spine: [0.3, 0.2, 0] }],
];
const PENITENT_OVERHEAD: Array<[number, Pose]> = [
  [0, { shoulderR: [-3.0, 0, -0.2], elbowR: [-0.6, 0, 0], spine: [-0.2, 0, 0], head: [-0.3, 0, 0] }],
  [0.5, { shoulderR: [-0.7, 0, -0.1], elbowR: [0, 0, 0], spine: [0.6, 0, 0], hipL: [-0.6, 0, 0], kneeL: [0.6, 0, 0] }],
  [1, { shoulderR: [-0.4, 0, -0.1], spine: [0.5, 0, 0] }],
];

export class Penitent extends Enemy {
  readonly rig = buildPenitent();
  private readonly anim = new Animator(this.rig);
  private attack: 'swing' | 'overhead' | 'toll' = 'swing';
  private comboNext = false;
  private phase = 0;
  private censerSwing = 0;
  private censerVel = 0;
  private kneeling = true;

  constructor() {
    super('Hushed Penitent', 'penitent', 120, 0.55, 50, 13);
    this.group.add(this.rig.root);
    bakeMeshes(this.rig.root);
    this.state = 'dormant';
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), Mats().contactShadow);
    sh.position.y = 0.03;
    this.group.add(sh);
  }

  focusPoint(t: THREE.Vector3): THREE.Vector3 {
    return t.copy(this.pos).setY(this.pos.y + 1.4);
  }

  protected onStagger(): void {
    this.flash = 1;
  }

  protected think(dt: number, time: number, ctx: EnemyCtx): void {
    const { d, ang } = this.toPlayer(ctx);
    this.rig.maskGlow.emissiveIntensity = 1.2 + this.flash * 5 + (this.state === 'telegraph' ? 3 + Math.sin(time * 30) : 0);
    let pose: Pose = idle(time, { hunch: 0.35 });
    let rate = 10;
    switch (this.state) {
      case 'dormant':
        pose = { hipL: [-1.5, 0, 0.1], hipR: [-0.2, 0, -0.1], kneeL: [1.5, 0, 0], kneeR: [2.2, 0, 0], spine: [0.7, 0, 0], head: [0.4, 0, 0], shoulderL: [-1.1, 0.3, 0.2], shoulderR: [-1.1, -0.3, -0.2], elbowL: [-1.4, 0, 0], elbowR: [-1.4, 0, 0], rootY: -0.42 };
        if (d < this.aggro) this.setState('emerge');
        break;
      case 'emerge':
        if (this.kneeling && this.stateT < dt * 1.5) ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: 'penitent-wake' });
        this.yaw = dampAngle(this.yaw, ang, 3, dt);
        rate = 4;
        if (this.stateT > 1.0) {
          this.kneeling = false;
          this.setState('chase');
        }
        break;
      case 'idle':
        if (d < this.aggro) this.setState('chase');
        break;
      case 'chase': {
        this.yaw = dampAngle(this.yaw, ang, 5, dt);
        const sp = d > 2.2 ? 2.3 : 0;
        this.vel.set(Math.sin(this.yaw) * sp, 0, Math.cos(this.yaw) * sp);
        this.phase += gaitRate(sp * 0.9) * dt;
        pose = sp > 0 ? locomotion(this.phase, sp / 3.5, { hunch: 0.35, armSwing: 0.2 }) : idle(time, { hunch: 0.35 });
        if (d < 2.9 && this.cooldown <= 0 && ctx.player.state !== 'dead') {
          const r = ctx.rng();
          this.attack = r < 0.22 && this.hp < this.maxHp ? 'toll' : r < 0.55 ? 'overhead' : 'swing';
          this.comboNext = this.attack === 'swing' && ctx.rng() < 0.45;
          this.setState('telegraph');
          ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: `penitent-${this.attack}` });
          if (this.attack === 'toll') ctx.vfx.ring(this.pos, 3.4, 3.4, 1.0, '#ffb040', 'tele');
        }
        break;
      }
      case 'telegraph': {
        this.vel.multiplyScalar(Math.exp(-8 * dt));
        const dur = this.attack === 'toll' ? 1.0 : this.attack === 'overhead' ? 0.55 : 0.7;
        if (this.attack !== 'toll') this.yaw = dampAngle(this.yaw, ang, 6, dt);
        const keys = this.attack === 'overhead' ? PENITENT_OVERHEAD : PENITENT_SWING;
        pose = this.attack === 'toll'
          ? { spine: [-0.3, 0, 0], head: [-0.5, Math.sin(time * 40) * 0.2, 0], shoulderL: [-0.4, 0, 1.2], shoulderR: [-0.4, 0, -1.2], kneeL: [0.4, 0, 0], kneeR: [0.4, 0, 0], rootY: -0.1 }
          : track(keys, 0);
        rate = 8;
        if (this.stateT > dur) {
          this.setState('strike');
          ctx.bus.emit({ type: 'enemy-attack', pos: this.pos.clone(), kind: `penitent-${this.attack}` });
        }
        break;
      }
      case 'strike': {
        const dur = this.attack === 'toll' ? 0.4 : 0.42;
        const k = Math.min(1, this.stateT / dur);
        if (this.attack === 'toll') {
          pose = { spine: [0.3, 0, 0], head: [0.3, 0, 0], shoulderL: [-0.2, 0, 1.4], shoulderR: [-0.2, 0, -1.4] };
          if (!this.hitDone) {
            this.hitDone = true;
            ctx.vfx.ring(this.pos, 0.5, 4.2, 0.45, '#ffc060', 'shock');
            ctx.bus.emit({ type: 'toll', pos: this.pos.clone() });
            if (d < 3.6) this.strikePlayer(ctx, 16, false);
          }
        } else {
          const keys = this.attack === 'overhead' ? PENITENT_OVERHEAD : PENITENT_SWING;
          pose = track(keys, k);
          rate = 22;
          this.vel.set(Math.sin(this.yaw) * 1.6 * (1 - k), 0, Math.cos(this.yaw) * 1.6 * (1 - k));
          if (!this.hitDone && k > 0.35 && k < 0.7 && this.inArc(ctx, this.attack === 'overhead' ? 2.5 : 2.8, this.attack === 'overhead' ? 1.0 : 2.0)) {
            this.hitDone = true;
            this.strikePlayer(ctx, this.attack === 'overhead' ? 24 : 20, this.attack === 'overhead');
          }
        }
        if (this.stateT > dur) {
          if (this.comboNext) {
            this.comboNext = false;
            this.attack = 'overhead';
            this.setState('telegraph');
            this.stateT = 0.15;
            ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: 'penitent-overhead' });
          } else {
            this.setState('recover');
            this.cooldown = 1.0 + ctx.rng() * 1.2;
          }
        }
        break;
      }
      case 'recover':
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        pose = idle(time, { hunch: 0.5 });
        if (this.stateT > 0.9) this.setState('chase');
        break;
      case 'stagger':
        this.vel.multiplyScalar(Math.exp(-5 * dt));
        pose = { spine: [-0.4, 0.3, 0], head: [-0.5, 0, 0], shoulderL: [-0.4, 0, 1.0], shoulderR: [-0.4, 0, -1.0], kneeL: [0.5, 0, 0], kneeR: [0.3, 0, 0], rootY: -0.12 };
        rate = 18;
        if (this.stateT > 0.9) this.setState('chase');
        break;
      case 'dead':
        this.vel.multiplyScalar(Math.exp(-5 * dt));
        pose = track(
          [
            [0, { spine: [-0.4, 0, 0], kneeL: [0.6, 0, 0], kneeR: [0.6, 0, 0] }],
            [0.4, { hipL: [-1.4, 0, 0.1], hipR: [-1.4, 0, -0.1], kneeL: [2.2, 0, 0], kneeR: [2.2, 0, 0], spine: [0.3, 0, 0], rootY: -0.6 }],
            [1, { hipL: [-1.4, 0, 0.1], hipR: [-1.4, 0, -0.1], kneeL: [2.2, 0, 0], kneeR: [2.2, 0, 0], spine: [1.2, 0, 0], head: [0.5, 0, 0], rootY: -0.62, rootPitch: 0.7 }],
          ],
          Math.min(1, this.stateT / 1.4),
        );
        if (this.stateT < dt * 1.5) {
          ctx.vfx.sparks(this.focusPoint(new THREE.Vector3()), 18, '#ff9a40', 5);
          ctx.bus.emit({ type: 'enemy-dead', pos: this.pos.clone(), kind: 'penitent' });
        }
        if (this.stateT > 3) this.group.position.y -= dt * 0.4;
        if (this.stateT > 6) this.removed = true;
        break;
    }
    this.anim.apply(pose, dt, rate);
    // Censer pendulum driven by the hand's motion.
    const target = this.state === 'strike' ? -1.2 : this.state === 'telegraph' ? 0.8 : 0;
    this.censerVel += (target - this.censerSwing) * 30 * dt - this.censerVel * 3 * dt + Math.sin(time * 2) * 0.4 * dt;
    this.censerSwing += this.censerVel * dt;
    this.rig.censer.rotation.x = this.censerSwing;
    const sq = 1 - this.flash * 0.12;
    this.rig.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
  }
}

// ======================================================================= The Knellwarden (boss)

type BossAttack = 'sweep' | 'slam' | 'toll' | 'leap';

export class Knellwarden extends Enemy {
  readonly rig: Rig;
  private readonly anim: Animator;
  readonly cape: Cloth;
  private readonly glowMat: THREE.MeshStandardMaterial;
  private readonly eyeMat: THREE.MeshStandardMaterial;
  private readonly hammerHead = new THREE.Object3D();
  private attack: BossAttack = 'sweep';
  private phase = 0;
  phase2 = false;
  private summoned = false;
  private leapFrom = new THREE.Vector3();
  private leapTo = new THREE.Vector3();
  private lastAttack: BossAttack | null = null;
  awake = false;
  onPhase2: (() => void) | null = null;

  constructor() {
    super('The Knellwarden', 'boss', 1300, 1.5, 320, 0);
    const m = Mats();
    this.glowMat = m.goldGlow.clone();
    this.eyeMat = m.goldGlow.clone();
    const rig = skeleton({ scale: 2.45, hipY: 0.98, thigh: 0.46, shin: 0.44, spine: 0.27, chest: 0.38, shoulderW: 0.31 });
    this.rig = rig;
    const { j } = rig;
    // Armoured tasset skirt.
    j.hips.add(mesh(latheG([[0.24, 0.1], [0.27, 0], [0.33, -0.2], [0.4, -0.42], [0, -0.42]], 10), m.plateDark));
    j.hips.add(mesh(new THREE.TorusGeometry(0.255, 0.04, 6, 16), m.bronze, 0, 0.05, 0, Math.PI / 2));
    j.spine.add(mesh(limb(0.25, 0.23, 0.3, 10), m.mail, 0, 0.3, 0));
    const breast = latheG([[0.24, -0.05], [0.31, 0.1], [0.33, 0.24], [0.3, 0.36], [0.18, 0.42], [0, 0.43]], 12);
    breast.scale(1.1, 1, 0.85);
    j.chest.add(mesh(breast, m.plateDark));
    j.chest.add(mesh(new THREE.TorusGeometry(0.2, 0.03, 4, 12, Math.PI), m.bronze, 0, 0.22, 0.25, 0, 0, Math.PI));
    j.chest.add(mesh(latheG([[0.19, 0], [0.18, 0.1], [0, 0.12]], 10), m.bronze, 0, 0.37, 0));
    // The bell head: hollow bronze, a molten slit of light where a face would be.
    j.head.add(mesh(latheG([[0, 0.5], [0.12, 0.49], [0.2, 0.42], [0.22, 0.2], [0.27, 0.0], [0.33, -0.12], [0.3, -0.12], [0.24, -0.02], [0.0, 0.0]], 16), m.bronze, 0, 0.0, 0));
    j.head.add(mesh(new THREE.BoxGeometry(0.03, 0.26, 0.05), this.eyeMat, 0, 0.18, 0.21));
    j.head.add(mesh(new THREE.SphereGeometry(0.14, 10, 8), this.eyeMat, 0, -0.02, 0));
    j.head.add(mesh(new THREE.TorusGeometry(0.07, 0.025, 6, 10), m.ironDark, 0, 0.53, 0));
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      j[`shoulder${side}`].add(mesh(dome(0.22, 1.25, 1, 1.2), m.plateDark, sx * 0.05, 0.05, 0, 0, 0, sx * -0.35));
      j[`shoulder${side}`].add(mesh(dome(0.2, 1.2, 0.7, 1.15, Math.PI * 0.45), m.bronze, sx * 0.08, -0.04, 0, 0, 0, sx * -0.65));
      for (let s = 0; s < 3; s += 1) {
        j[`shoulder${side}`].add(mesh(new THREE.ConeGeometry(0.04, 0.22, 5), m.ironDark, sx * (0.05 + s * 0.06), 0.24 - s * 0.05, -0.05, 0, 0, sx * -0.4));
      }
      j[`shoulder${side}`].add(mesh(limb(0.1, 0.09, 0.3), m.mail));
      j[`elbow${side}`].add(mesh(limb(0.095, 0.085, 0.25, 9, 1.05), m.plateDark));
      j[`hand${side}`].add(mesh(new THREE.SphereGeometry(0.1, 10, 8).scale(1, 1.2, 1.1), m.plateDark, 0, -0.06, 0));
      j[`hip${side}`].add(mesh(limb(0.14, 0.11, 0.44), m.plateDark));
      j[`knee${side}`].add(mesh(dome(0.1, 1, 1, 0.9), m.bronze, 0, 0, 0.06, Math.PI / 2));
      j[`knee${side}`].add(mesh(limb(0.11, 0.09, 0.4, 9, 1.1), m.plateDark));
      j[`foot${side}`].add(mesh(new THREE.SphereGeometry(0.12, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.8, 1.8), m.plateDark, 0, -0.09, 0.05));
    }
    // The Clapper: a great hammer whose head is a small bell.
    const hammer = new THREE.Group();
    hammer.add(mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.9, 8), m.wood, 0, 0.55, 0));
    const head = new THREE.Group();
    head.position.y = 1.45;
    head.rotation.z = Math.PI / 2;
    head.add(mesh(latheG([[0, 0.3], [0.12, 0.28], [0.17, 0.12], [0.2, -0.05], [0.25, -0.15], [0.0, -0.12]], 12), m.bronze));
    head.add(mesh(new THREE.TorusGeometry(0.2, 0.03, 6, 14), this.glowMat, 0, -0.12, 0, Math.PI / 2));
    head.add(this.hammerHead);
    hammer.add(head);
    hammer.add(mesh(new THREE.ConeGeometry(0.05, 0.3, 5), m.ironDark, 0, 1.75, 0));
    hammer.position.set(0, -0.08, 0.05);
    hammer.rotation.x = Math.PI / 2;
    j.handR.add(hammer);
    this.group.add(rig.root);
    this.anim = new Animator(rig);
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    const aL = new THREE.Object3D();
    aL.position.set(0.24, 0.32, -0.2);
    const aR = new THREE.Object3D();
    aR.position.set(-0.24, 0.32, -0.2);
    j.chest.add(aL, aR);
    const capeMat = m.robeRed.clone();
    this.cape = new Cloth(7, 10, 1.4, 3.4, capeMat, aL, aR, 1.4);
    this.cape.colliders.push(
      { obj: j.chest, offset: new THREE.Vector3(0, 0.1, 0), r: 0.32 },
      { obj: j.hips, offset: new THREE.Vector3(0, -0.15, 0), r: 0.36 },
    );
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(4, 4).rotateX(-Math.PI / 2), m.contactShadow);
    sh.position.y = 0.03;
    this.group.add(sh);
    this.state = 'dormant';
    bakeMeshes(rig.root);
    this.anim.snap(this.kneelPose());
  }

  private kneelPose(): Pose {
    return { hipL: [-1.5, 0, 0.1], hipR: [-0.1, 0, -0.1], kneeL: [1.6, 0, 0], kneeR: [2.2, 0, 0], footR: [0.6, 0, 0], spine: [0.45, 0, 0], head: [0.4, 0, 0], shoulderR: [-0.7, 0, -0.25], elbowR: [-0.9, 0, 0], handR: [-0.4, 0, 0], shoulderL: [-0.8, 0, 0.3], elbowL: [-1.2, 0, 0], rootY: -0.42 };
  }

  focusPoint(t: THREE.Vector3): THREE.Vector3 {
    return t.copy(this.pos).setY(this.pos.y + 3.2);
  }

  get hammerWorld(): THREE.Vector3 {
    return this.hammerHead.getWorldPosition(new THREE.Vector3());
  }

  wake(): void {
    this.awake = true;
    this.setState('emerge');
  }

  protected onStagger(): void {
    this.flash = 1;
  }

  takeHit(hit: HitInfo): void {
    super.takeHit(hit);
    if (!this.phase2 && this.hp < this.maxHp * 0.5 && this.alive) {
      this.phase2 = true;
      this.onPhase2?.();
    }
  }

  protected think(dt: number, time: number, ctx: EnemyCtx): void {
    const { d, ang } = this.toPlayer(ctx);
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    let pose: Pose = idle(time * 0.7);
    let rate = 8;
    const glow = this.state === 'telegraph' ? 3.5 + Math.sin(time * 24) * 1.5 : 1.2;
    this.glowMat.emissiveIntensity = glow + this.flash * 4;
    this.eyeMat.emissiveIntensity = 2.5 + (this.phase2 ? 2 + Math.sin(time * 6) : 0) + this.flash * 6;
    const spd = this.phase2 ? 1.25 : 1;
    switch (this.state) {
      case 'dormant':
        pose = this.kneelPose();
        break;
      case 'emerge': {
        const k = Math.min(1, this.stateT / 3.6);
        pose = track(
          [
            [0, this.kneelPose()],
            [0.5, { ...this.kneelPose(), head: [-0.4, 0, 0], spine: [0.1, 0, 0] }],
            [0.8, { hipL: [-0.4, 0, 0.1], kneeL: [0.5, 0, 0], kneeR: [0.6, 0, 0], spine: [-0.2, 0, 0], head: [-0.5, 0, 0], shoulderR: [-2.6, 0, -0.4], elbowR: [-0.6, 0, 0], shoulderL: [-0.4, 0, 0.9], rootY: -0.1 }],
            [1, idle(0)],
          ],
          k,
        );
        rate = 6;
        this.yaw = dampAngle(this.yaw, ang, 1.5, dt);
        if (k >= 1) this.setState('chase');
        break;
      }
      case 'chase': {
        this.yaw = dampAngle(this.yaw, ang, 2.6 * spd, dt);
        const sp = d > 4.2 ? 2.7 * spd : 0;
        this.vel.set(Math.sin(this.yaw) * sp, 0, Math.cos(this.yaw) * sp);
        this.phase += gaitRate(sp / 2.45) * dt;
        pose = sp > 0 ? locomotion(this.phase, sp / 5, { armSwing: 0.15 }) : idle(time * 0.7);
        pose.shoulderR = [-0.5, 0, -0.3];
        pose.elbowR = [-0.9, 0, 0];
        if (sp > 0 && Math.floor(this.phase / Math.PI) !== Math.floor((this.phase - gaitRate(sp / 2.45) * dt) / Math.PI)) {
          ctx.shake(0.08);
          ctx.bus.emit({ type: 'footstep', pos: this.pos.clone(), heavy: true });
        }
        if (this.cooldown <= 0 && ctx.player.state !== 'dead') {
          let next: BossAttack | null = null;
          const r = ctx.rng();
          if (this.phase2 && !this.summoned) {
            this.summoned = true;
            next = 'toll';
          } else if (d > 8.5 && this.phase2 && r < 0.5) next = 'leap';
          else if (d < 6.2) next = r < 0.42 ? 'sweep' : r < 0.78 ? 'slam' : 'toll';
          else if (d < 9 && r < 0.2) next = 'toll';
          if (next === this.lastAttack && next !== 'sweep' && ctx.rng() < 0.6) next = 'sweep';
          if (next) {
            this.attack = next;
            this.lastAttack = next;
            this.setState('telegraph');
            ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: `boss-${next}` });
            if (next === 'toll') ctx.vfx.ring(this.pos, 1.5, 12, 1.4 / spd, '#ffb040', 'tele');
            if (next === 'leap') {
              this.leapFrom.copy(this.pos);
              this.leapTo.copy(ctx.player.pos);
            }
          }
        }
        break;
      }
      case 'telegraph': {
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        const durs: Record<BossAttack, number> = { sweep: 0.85, slam: 1.05, toll: 1.4, leap: 0.65 };
        const dur = durs[this.attack] / spd;
        if (this.attack !== 'toll') this.yaw = dampAngle(this.yaw, ang, this.attack === 'slam' ? 4 : 3, dt);
        rate = 7;
        if (this.attack === 'sweep') pose = { shoulderR: [-0.6, 0.4, -1.5], elbowR: [-1.2, 0, 0], handR: [0.4, 0, 0], shoulderL: [-0.6, 0, -0.4], elbowL: [-1.2, 0, 0], chest: [0, -0.9, 0], spine: [0.1, -0.4, 0], hipR: [-0.3, 0, 0], kneeR: [0.4, 0, 0], kneeL: [0.3, 0, 0], rootY: -0.06 };
        else if (this.attack === 'slam') pose = { shoulderR: [-3.0, 0, -0.3], elbowR: [-1.0, 0, 0], handR: [0.5, 0, 0], shoulderL: [-2.8, 0, 0.4], elbowL: [-1.2, 0, 0], spine: [-0.35, 0, 0], head: [-0.3, 0, 0], kneeL: [0.25, 0, 0], kneeR: [0.25, 0, 0] };
        else if (this.attack === 'toll') pose = { ...this.kneelPose(), head: [-0.6, Math.sin(time * 30) * 0.15, 0], spine: [-0.2, 0, 0], shoulderL: [-0.3, 0, 1.3], shoulderR: [-0.3, 0, -1.3] };
        else pose = { hipL: [-0.9, 0, 0.1], hipR: [-0.9, 0, -0.1], kneeL: [1.6, 0, 0], kneeR: [1.6, 0, 0], spine: [0.6, 0, 0], shoulderR: [0.4, 0, -0.5], shoulderL: [0.4, 0, 0.5], rootY: -0.5 };
        if (this.attack === 'leap') ctx.vfx.ring(this.leapTo, 3.6, 3.6, 0.06, '#ff5030', 'marker');
        if (this.stateT > dur) {
          this.setState('strike');
          ctx.bus.emit({ type: 'enemy-attack', pos: this.pos.clone(), kind: `boss-${this.attack}` });
        }
        break;
      }
      case 'strike': {
        rate = 16;
        if (this.attack === 'sweep') {
          const k = Math.min(1, this.stateT / 0.42);
          pose = { shoulderR: [-1.3, 0, 1.1], elbowR: [-0.1, 0, 0], shoulderL: [-1.2, 0, 0.6], elbowL: [-0.3, 0, 0], chest: [0.15, 0.9, 0], spine: [0.25, 0.4, 0], hipL: [-0.5, 0, 0], kneeL: [0.5, 0, 0], kneeR: [0.4, 0, 0], rootY: -0.1 };
          this.vel.copy(fwd).multiplyScalar(3 * (1 - k));
          if (!this.hitDone && k > 0.2 && k < 0.7 && this.inArc(ctx, 5.8, 2.3)) {
            this.hitDone = true;
            this.strikePlayer(ctx, 30, true);
          }
          if (this.stateT > 0.42) this.endAttack(ctx, 1.0);
        } else if (this.attack === 'slam') {
          pose = { shoulderR: [-0.7, 0, -0.1], elbowR: [0, 0, 0], handR: [-0.3, 0, 0], shoulderL: [-0.7, 0, 0.3], elbowL: [-0.1, 0, 0], spine: [0.75, 0, 0], head: [0.2, 0, 0], hipL: [-0.8, 0, 0], kneeL: [0.9, 0, 0], kneeR: [0.6, 0, 0], rootY: -0.35 };
          rate = 24;
          if (!this.hitDone && this.stateT > 0.14) {
            this.hitDone = true;
            const impact = this.pos.clone().addScaledVector(fwd, 3.8);
            ctx.vfx.ring(impact, 0.5, 9, 0.7, '#ffd080', 'shock');
            ctx.vfx.dust(impact, 22, 2.5, '#6a5a50');
            ctx.vfx.sparks(impact, 26, '#ffc070', 9);
            ctx.vfx.impact(impact.clone().setY(impact.y + 1), 1.4, '#ffc070');
            ctx.shake(0.65);
            ctx.bus.emit({ type: 'slam', pos: impact, radius: 3 });
            if (Math.hypot(ctx.player.pos.x - impact.x, ctx.player.pos.z - impact.z) < 2.9) this.strikePlayer(ctx, 42, true);
            this.spawnWave(impact, 13, 9, 0.75, 16);
          }
          if (this.stateT > 0.5) this.endAttack(ctx, 1.4);
        } else if (this.attack === 'toll') {
          pose = { ...this.kneelPose(), head: [0.5, 0, 0], spine: [0.6, 0, 0], shoulderL: [-0.3, 0, 1.4], shoulderR: [-0.3, 0, -1.4] };
          if (!this.hitDone) {
            this.hitDone = true;
            ctx.vfx.ring(this.pos, 0.8, 14, 0.95, '#ffc060', 'shock');
            ctx.vfx.ring(this.pos, 0.5, 9, 0.8, '#ffe0a0', 'shock');
            ctx.bus.emit({ type: 'toll', pos: this.pos.clone() });
            ctx.shake(0.4);
            this.spawnWave(this.pos, 14, 13, 1.3, 26);
            if (this.phase2 && this.summoned && this.stateT < 0.1 && !this.minionsCalled) {
              this.minionsCalled = true;
              for (let i = 0; i < 3; i += 1) {
                const a = (i / 3) * Math.PI * 2 + this.yaw;
                ctx.spawnMite(this.pos.clone().add(new THREE.Vector3(Math.cos(a) * 6, 0, Math.sin(a) * 6)));
              }
            }
          }
          if (this.stateT > 0.9) this.endAttack(ctx, 1.0);
        } else {
          // Leap.
          const air = 0.95;
          const k = Math.min(1, this.stateT / air);
          this.vel.set(0, 0, 0);
          this.pos.x = this.leapFrom.x + (this.leapTo.x - this.leapFrom.x) * k;
          this.pos.z = this.leapFrom.z + (this.leapTo.z - this.leapFrom.z) * k;
          this.rig.body.position.y = Math.sin(k * Math.PI) * 7;
          pose = { hipL: [-1.2, 0, 0.1], hipR: [-0.4, 0, -0.1], kneeL: [1.5, 0, 0], kneeR: [1.0, 0, 0], spine: [-0.2, 0, 0], shoulderR: [-3, 0, -0.3], shoulderL: [-2.8, 0, 0.3], elbowR: [-0.8, 0, 0], elbowL: [-0.8, 0, 0] };
          if (k >= 1 && !this.hitDone) {
            this.hitDone = true;
            this.rig.body.position.y = 0;
            ctx.vfx.ring(this.pos, 0.5, 10, 0.7, '#ff9050', 'shock');
            ctx.vfx.dust(this.pos, 30, 3, '#6a5a50');
            ctx.vfx.impact(this.pos.clone().setY(this.pos.y + 1), 1.8, '#ff9050');
            ctx.shake(0.8);
            ctx.bus.emit({ type: 'slam', pos: this.pos.clone(), radius: 4 });
            if (d < 3.8) this.strikePlayer(ctx, 45, true);
            this.spawnWave(this.pos, 12, 9, 0.8, 18);
          }
          if (this.stateT > air + 0.3) this.endAttack(ctx, 1.3);
        }
        break;
      }
      case 'recover':
        this.vel.multiplyScalar(Math.exp(-5 * dt));
        pose = { ...idle(time * 0.7), spine: [0.35, 0, 0], shoulderR: [-0.3, 0, -0.2], elbowR: [-0.4, 0, 0] };
        rate = 5;
        if (this.stateT > this.recoverTime) this.setState('chase');
        break;
      case 'stagger':
        this.vel.multiplyScalar(Math.exp(-4 * dt));
        pose = { ...this.kneelPose(), head: [0.7, 0, 0.3], spine: [0.8, 0.2, 0] };
        rate = 9;
        if (this.stateT > 2.4) this.setState('chase');
        break;
      case 'dead':
        this.vel.multiplyScalar(Math.exp(-4 * dt));
        pose = track(
          [
            [0, { spine: [-0.5, 0, 0], head: [-0.6, 0, 0], shoulderL: [-0.5, 0, 1.2], shoulderR: [-0.5, 0, -1.2] }],
            [0.5, this.kneelPose()],
            [1, { ...this.kneelPose(), spine: [1.0, 0, 0], head: [0.9, 0, 0], shoulderR: [0.3, 0, -0.2], shoulderL: [0.3, 0, 0.2], rootY: -0.5 }],
          ],
          Math.min(1, this.stateT / 3),
        );
        rate = 4;
        this.eyeMat.emissiveIntensity = Math.max(0, 4 - this.stateT * 1.2);
        if (this.stateT < dt * 1.5) {
          ctx.vfx.sparks(this.focusPoint(new THREE.Vector3()), 40, '#ffd080', 10);
          ctx.vfx.impact(this.focusPoint(new THREE.Vector3()), 2, '#ffd080');
          ctx.bus.emit({ type: 'enemy-dead', pos: this.pos.clone(), kind: 'boss' });
        }
        break;
    }
    if (this.state !== 'strike' || this.attack !== 'leap') this.rig.body.position.y = damp(this.rig.body.position.y, pose.rootY ?? 0, rate, dt);
    this.anim.apply(pose, dt, rate);
    this.cape.wind.set(Math.sin(time * 0.4) + 0.5, 0, 0.5);
  }

  private minionsCalled = false;
  private recoverTime = 1;

  private endAttack(ctx: EnemyCtx, recover: number): void {
    this.recoverTime = recover / (this.phase2 ? 1.2 : 1);
    this.setState('recover');
    this.cooldown = (this.phase2 ? 0.5 : 0.9) + ctx.rng() * 0.8;
  }

  reset(): void {
    this.hp = this.maxHp;
    this.alive = true;
    this.phase2 = false;
    this.summoned = false;
    this.minionsCalled = false;
    this.awake = false;
    this.poise = this.maxPoise;
    this.state = 'dormant';
    this.stateT = 0;
    this.removed = false;
    this.waves.length = 0;
    this.anim.snap(this.kneelPose());
    this.rig.body.position.y = 0;
    this.cape.reset();
  }

  get waveList(): ReadonlyArray<{ center: THREE.Vector3; r: number }> {
    return this.waves;
  }
}
