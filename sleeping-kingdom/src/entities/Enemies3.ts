import * as THREE from 'three';
import { Animator, gaitRate, idle, limb, locomotion, mesh, track, type Pose, type Rig } from './Rig';
import { Enemy, type EnemyCtx } from './Enemies';
import { buildKnight, type Knight } from './Knight';
import { buildMorvane, type MorvaneRig } from './Morvane';
import { ATTACKS, DEATH_KEYS, HEAVY, HIT_POSE, guardPose, type AttackDef } from './Player';
import { Cloth } from './Cloth';
import { Mats } from '../world/Materials';
import { Tex } from '../world/Textures';
import type { HitInfo } from '../systems/Combat';
import { damp, dampAngle } from '../utils/math';

// ============================================================================ drowned monks

/** Re-dress a Hushed Penitent as one of Saint Merrow's drowned monks: sodden robes, verdigris bell, blue lamp-eyes. */
export function dressAsDrowned(rig: Rig & { maskGlow: THREE.MeshStandardMaterial }): void {
  const cache = new Map<THREE.Material, THREE.Material>();
  rig.root.traverse((o) => {
    const me = o as THREE.Mesh;
    if (!me.isMesh) return;
    const mat = me.material as THREE.MeshStandardMaterial;
    if (mat === rig.maskGlow) return;
    let c = cache.get(mat) as THREE.MeshStandardMaterial | undefined;
    if (!c) {
      c = mat.clone();
      if (c.metalness > 0.5) c.color.set('#7aa898');
      else c.color.multiply(new THREE.Color('#9ab4b0'));
      c.roughness = Math.max(0.35, c.roughness - 0.35);
      cache.set(mat, c);
    }
    me.material = c;
  });
  rig.maskGlow.color.set('#020a10');
  rig.maskGlow.emissive.set('#5ac8ff');
  // Weed and chain hanging from the shoulders.
  const weed = new THREE.MeshStandardMaterial({ color: '#2a3a24', roughness: 0.6, side: THREE.DoubleSide });
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i += 1) {
      const g = new THREE.PlaneGeometry(0.05, 0.5 + i * 0.15).translate(0, -0.3, 0);
      rig.j.chest.add(mesh(g, weed, sx * (0.12 + i * 0.05), 0.3, 0.15 - i * 0.12, 0.1, 0, sx * 0.1));
    }
  }
}

// ============================================================================ shared projectiles

type Orb = { sprite: THREE.Sprite; pos: THREE.Vector3; vel: THREE.Vector3; life: number; homing: number; damage: number };

class Orbs {
  readonly list: Orb[] = [];
  private readonly mat: THREE.SpriteMaterial;
  constructor(
    private readonly space: () => THREE.Object3D | null,
    inner: string,
    outer: string,
    key: string,
  ) {
    this.mat = new THREE.SpriteMaterial({ map: Tex.radial(inner, outer, key), blending: THREE.AdditiveBlending, depthWrite: false });
  }

  fire(from: THREE.Vector3, vel: THREE.Vector3, homing: number, damage: number, size = 1.2): void {
    const sp = new THREE.Sprite(this.mat);
    sp.scale.setScalar(size);
    sp.position.copy(from);
    this.space()?.add(sp);
    this.list.push({ sprite: sp, pos: from.clone(), vel, life: 4, homing, damage });
  }

  update(dt: number, ctx: EnemyCtx, owner: Enemy, spark: string, strike: (dmg: number) => void): void {
    const target = ctx.player.pos.clone().setY(ctx.player.pos.y + 1.1);
    for (let i = this.list.length - 1; i >= 0; i -= 1) {
      const o = this.list[i];
      o.life -= dt;
      const want = target.clone().sub(o.pos).normalize().multiplyScalar(o.vel.length());
      o.vel.lerp(want, Math.min(1, o.homing * dt));
      o.pos.addScaledVector(o.vel, dt);
      o.sprite.position.copy(o.pos);
      if (Math.random() < 0.4) ctx.vfx.sparks(o.pos, 1, spark, 0.5);
      let hit = false;
      if (o.pos.distanceTo(target) < 0.75) {
        hit = true;
        strike(o.damage);
      }
      if (hit || o.life <= 0) {
        ctx.vfx.sparks(o.pos, 12, spark, 4);
        o.sprite.removeFromParent();
        this.list.splice(i, 1);
      }
    }
    void owner;
  }

  clear(): void {
    for (const o of this.list) o.sprite.removeFromParent();
    this.list.length = 0;
  }
}

// ============================================================================ Frostspine wolf

export class FrostWolf extends Enemy {
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly tail = new THREE.Group();
  private readonly legs: Array<{ upper: THREE.Group; lower: THREE.Group; front: boolean; side: number }> = [];
  private readonly eyeMat: THREE.MeshStandardMaterial;
  private phase = Math.random() * 6;
  private readonly lunge = new THREE.Vector3();
  private readonly orbit = Math.random() < 0.5 ? -1 : 1;
  private howled = false;

  constructor(alpha = false) {
    super(alpha ? 'Pale Alpha' : 'Frostspine Wolf', 'wolf', alpha ? 140 : 70, alpha ? 0.8 : 0.6, alpha ? 45 : 22, 22);
    const fur = Mats().fur.clone();
    fur.color.set(alpha ? '#c8ccd4' : '#5a5e68');
    const furLight = Mats().fur.clone();
    furLight.color.set(alpha ? '#e8ecf4' : '#8a8e98');
    const ice = new THREE.MeshStandardMaterial({ color: '#0a1a2a', emissive: '#8ad0ff', emissiveIntensity: 1.6, roughness: 0.2, metalness: 0.2 });
    this.eyeMat = new THREE.MeshStandardMaterial({ color: '#02060a', emissive: '#9ae0ff', emissiveIntensity: 4 });
    const sc = alpha ? 1.35 : 1;
    this.group.add(this.body);
    this.body.position.y = 0.78 * sc;
    this.body.scale.setScalar(sc);
    // Deep chest tapering to lean hindquarters.
    this.body.add(mesh(new THREE.SphereGeometry(0.3, 8, 6).scale(1, 1.05, 1.5), fur, 0, 0.02, 0.22));
    this.body.add(mesh(new THREE.SphereGeometry(0.24, 8, 6).scale(0.95, 0.9, 1.6), fur, 0, 0.04, -0.3));
    // Shaggy ruff of fur spikes around the neck and down the back.
    for (let i = 0; i < 14; i += 1) {
      const a = (i / 14) * Math.PI * 2;
      this.body.add(mesh(new THREE.ConeGeometry(0.07, 0.3, 4), furLight, Math.cos(a) * 0.26, 0.08 + Math.sin(a) * 0.24, 0.38, -1.2, 0, a - Math.PI / 2));
    }
    // Ice shards grown along the spine: a nightmare of the waking mountain, not a natural beast.
    for (let i = 0; i < 6; i += 1) this.body.add(mesh(new THREE.OctahedronGeometry(0.07 + (i % 3) * 0.03, 0).scale(0.6, 2.2, 0.6), ice, 0, 0.3 - i * 0.015, 0.3 - i * 0.13, -0.5));
    this.head.position.set(0, 0.2, 0.55);
    this.body.add(this.head);
    this.head.add(mesh(new THREE.SphereGeometry(0.16, 8, 6).scale(1, 0.95, 1.15), fur));
    this.head.add(mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.3, 7).rotateX(Math.PI / 2), furLight, 0, -0.03, 0.2));
    this.head.add(mesh(new THREE.SphereGeometry(0.035, 6, 5), Mats().ironDark, 0, -0.0, 0.36));
    this.jaw.position.set(0, -0.08, 0.06);
    this.head.add(this.jaw);
    this.jaw.add(mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.26, 7).rotateX(Math.PI / 2), furLight, 0, -0.02, 0.14));
    for (let i = 0; i < 4; i += 1) this.jaw.add(mesh(new THREE.ConeGeometry(0.012, 0.05, 4), Mats().bone, (i - 1.5) * 0.025, 0.02, 0.24));
    for (const sx of [-1, 1]) {
      this.head.add(mesh(new THREE.ConeGeometry(0.05, 0.16, 4), fur, sx * 0.09, 0.15, -0.03, -0.2, 0, sx * -0.25));
      this.head.add(mesh(new THREE.SphereGeometry(0.022, 6, 5), this.eyeMat, sx * 0.07, 0.04, 0.13));
    }
    this.tail.position.set(0, 0.1, -0.62);
    this.body.add(this.tail);
    this.tail.add(mesh(limb(0.07, 0.03, 0.55, 6).rotateX(Math.PI * 0.75), fur));
    for (const [x, z, front] of [[-0.14, 0.32, true], [0.14, 0.32, true], [-0.13, -0.42, false], [0.13, -0.42, false]] as const) {
      const upper = new THREE.Group();
      upper.position.set(x, -0.05, z);
      upper.add(mesh(limb(0.07, 0.05, 0.38, 6), fur));
      const lower = new THREE.Group();
      lower.position.y = -0.38;
      lower.add(mesh(limb(0.045, 0.035, 0.36, 6), fur));
      lower.add(mesh(new THREE.SphereGeometry(0.05, 6, 5).scale(1, 0.6, 1.5), fur, 0, -0.36, 0.03));
      upper.add(lower);
      this.body.add(upper);
      this.legs.push({ upper, lower, front, side: Math.sign(x) });
    }
    this.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = true;
    });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.2 * sc, 2 * sc).rotateX(-Math.PI / 2), Mats().contactShadow);
    sh.position.y = 0.03;
    this.group.add(sh);
  }

  focusPoint(t: THREE.Vector3): THREE.Vector3 {
    return t.copy(this.pos).setY(this.pos.y + 0.8);
  }

  protected onStagger(): void {
    this.flash = 1;
  }

  protected think(dt: number, time: number, ctx: EnemyCtx): void {
    const { d, dir, ang } = this.toPlayer(ctx);
    this.eyeMat.emissiveIntensity = 3 + this.flash * 6 + (this.state === 'telegraph' ? 4 : 0);
    let gait = 0;
    let crouch = 0;
    let jawOpen = 0.05;
    let headPitch = 0;
    switch (this.state) {
      case 'idle':
      case 'dormant':
        headPitch = Math.sin(time * 0.7) * 0.1;
        if (d < this.aggro) {
          this.setState('emerge');
          if (!this.howled) {
            this.howled = true;
            ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: 'wolf-howl' });
          }
        }
        break;
      case 'emerge':
        // Howl, head thrown back.
        this.yaw = dampAngle(this.yaw, ang, 4, dt);
        headPitch = -0.9;
        jawOpen = 0.5;
        if (this.stateT > 0.9) this.setState('chase');
        break;
      case 'chase': {
        // Circle in, then dart.
        const want = d > 5 ? ang : ang + this.orbit * 1.1;
        this.yaw = dampAngle(this.yaw, want, 6, dt);
        const sp = d > 3 ? 7.2 : 4;
        this.vel.set(Math.sin(this.yaw) * sp, 0, Math.cos(this.yaw) * sp);
        gait = sp / 7.2;
        if (d < 5.5 && this.cooldown <= 0 && ctx.player.state !== 'dead') {
          this.setState('telegraph');
          ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: 'wolf-growl' });
        }
        break;
      }
      case 'telegraph':
        this.vel.multiplyScalar(Math.exp(-9 * dt));
        this.yaw = dampAngle(this.yaw, ang, 10, dt);
        crouch = Math.min(1, this.stateT / 0.35);
        jawOpen = 0.35;
        if (this.stateT > 0.55) {
          this.lunge.copy(dir);
          this.setState('strike');
          ctx.bus.emit({ type: 'enemy-attack', pos: this.pos.clone(), kind: 'wolf-bite' });
        }
        break;
      case 'strike': {
        const k = this.stateT;
        this.vel.copy(this.lunge).multiplyScalar(k < 0.3 ? 12 : 2);
        jawOpen = k < 0.25 ? 0.7 : 0.05;
        headPitch = -0.2;
        this.body.position.y = 0.78 + Math.sin(Math.min(1, k / 0.3) * Math.PI) * 0.5;
        if (!this.hitDone && d < 1.5 && k > 0.08) {
          this.hitDone = true;
          this.strikePlayer(ctx, this.maxHp > 100 ? 24 : 15, this.maxHp > 100);
        }
        if (k > 0.42) {
          this.setState('recover');
          this.cooldown = 1.4 + ctx.rng() * 1.2;
        }
        break;
      }
      case 'recover':
        this.vel.multiplyScalar(Math.exp(-5 * dt));
        gait = 0.2;
        if (this.stateT > 0.7) this.setState('chase');
        break;
      case 'stagger':
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        headPitch = 0.4;
        if (this.stateT > 0.6) this.setState('chase');
        break;
      case 'dead':
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        this.body.rotation.z = damp(this.body.rotation.z, 1.45, 7, dt);
        this.body.position.y = damp(this.body.position.y, 0.3, 6, dt);
        if (this.stateT < dt * 1.5) {
          ctx.vfx.sparks(this.focusPoint(new THREE.Vector3()), 20, '#bfe8ff', 5);
          ctx.bus.emit({ type: 'enemy-dead', pos: this.pos.clone(), kind: 'wolf' });
        }
        if (this.stateT > 3) this.group.position.y -= dt * 0.4;
        if (this.stateT > 5) this.removed = true;
        break;
    }
    // Gallop: front pair and hind pair in alternation, the spine flexing between them.
    this.phase += dt * (3 + gait * 14);
    for (const leg of this.legs) {
      if (this.state === 'dead') {
        leg.upper.rotation.x = damp(leg.upper.rotation.x, leg.front ? 0.9 : -0.9, 5, dt);
        continue;
      }
      const off = (leg.front ? 0 : Math.PI) + (leg.side > 0 ? 0.35 : 0);
      const s = Math.sin(this.phase + off);
      leg.upper.rotation.x = s * 0.75 * gait - crouch * (leg.front ? -0.3 : 0.6);
      leg.lower.rotation.x = (leg.front ? -1 : 1) * Math.max(0, Math.cos(this.phase + off)) * 1.0 * gait + crouch * (leg.front ? 0.2 : -0.9);
    }
    if (this.state !== 'strike' && this.state !== 'dead') this.body.position.y = damp(this.body.position.y, 0.78 - crouch * 0.18 + Math.abs(Math.sin(this.phase)) * 0.06 * gait, 12, dt);
    this.body.rotation.x = damp(this.body.rotation.x, Math.sin(this.phase * 2) * 0.06 * gait + crouch * 0.12, 10, dt);
    this.head.rotation.x = damp(this.head.rotation.x, headPitch - gait * 0.15, 10, dt);
    this.jaw.rotation.x = damp(this.jaw.rotation.x, jawOpen, 18, dt);
    this.tail.rotation.x = Math.sin(time * 3 + this.phase) * 0.2 - gait * 0.3;
    const sq = 1 - this.flash * 0.2;
    this.body.scale.y = (this.maxHp > 100 ? 1.35 : 1) * sq;
  }
}

// ============================================================================ Hollow knights and Ser Ivarr

type DState = 'strafe' | 'backstep' | 'riposte';

/**
 * A knight of the Bell Guard emptied by the Waking Choir: the same longsword forms Calder uses,
 * read from the same attack data, so the duel mirrors the player.
 */
export class DuelKnight extends Enemy {
  readonly rig: Knight;
  private readonly anim: Animator;
  private atk: AttackDef = ATTACKS[0];
  private atkFrom = 0;
  private atkDur = 1;
  private comboLeft = 0;
  private phase = 0;
  private strafe: DState | null = null;
  private strafeT = 0;
  private strafeDir = 1;
  private dodgeCd = 0;
  private ik = 1;
  readonly isBoss: boolean;
  phase2 = false;
  onPhase2: (() => void) | null = null;
  private kneel = true;
  private readonly speedMul: number;

  constructor(opts: { name?: string; hp?: number; boss?: boolean; cloak?: boolean } = {}) {
    super(opts.name ?? 'Hollow Knight', opts.boss ? 'ivarr' : 'hollow', opts.hp ?? 150, 0.5, opts.boss ? 140 : 60, 14);
    this.isBoss = !!opts.boss;
    this.speedMul = this.isBoss ? 1.0 : 0.82;
    this.rig = buildKnight({ hollow: true });
    this.anim = new Animator(this.rig);
    this.group.add(this.rig.root);
    this.rig.sword.visible = true;
    if (opts.cloak) {
      const k = this.rig;
      this.cloth = new Cloth(7, 11, 0.62, 1.42, k.mats.cloak, k.cloakAnchorL, k.cloakAnchorR, 1.55);
      this.cloth.colliders.push(
        { obj: k.j.chest, offset: new THREE.Vector3(0, 0.16, -0.02), r: 0.27 },
        { obj: k.j.hips, offset: new THREE.Vector3(0, -0.12, -0.02), r: 0.29 },
      );
    }
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3).rotateX(-Math.PI / 2), Mats().contactShadow);
    sh.position.y = 0.03;
    this.group.add(sh);
    this.state = 'dormant';
    this.anim.snap(this.kneelPose());
  }

  private kneelPose(): Pose {
    return { hipL: [-1.5, 0, 0.12], hipR: [-0.1, 0, -0.1], kneeL: [1.55, 0, 0], kneeR: [2.25, 0, 0], footR: [0.7, 0, 0], spine: [0.35, 0, 0], head: [0.5, 0, 0], shoulderR: [-0.9, 0, -0.1], elbowR: [-0.6, 0, 0], handR: [-0.3, 0, 0], shoulderL: [-0.9, 0, 0.1], elbowL: [-0.6, 0, 0], rootY: -0.45 };
  }

  focusPoint(t: THREE.Vector3): THREE.Vector3 {
    return t.copy(this.pos).setY(this.pos.y + 1.35);
  }

  protected onStagger(): void {
    this.flash = 1;
    this.comboLeft = 0;
  }

  /** Ser Ivarr reads your swings: a raised guard turns most of a blow aside, then he answers. */
  takeHit(hit: HitInfo): void {
    if (this.isBoss && this.alive && this.state === 'chase' && this.strafe === 'strafe' && Math.random() < (this.phase2 ? 0.45 : 0.3)) {
      const fx = Math.sin(this.yaw);
      const fz = Math.cos(this.yaw);
      const dx = hit.from.x - this.pos.x;
      const dz = hit.from.z - this.pos.z;
      if ((dx * fx + dz * fz) / Math.max(0.01, Math.hypot(dx, dz)) > 0.5) {
        super.takeHit({ ...hit, damage: hit.damage * 0.15, poise: hit.poise * 0.2 });
        this.strafe = 'riposte';
        this.strafeT = 0;
        return;
      }
    }
    super.takeHit(hit);
    if (this.isBoss && !this.phase2 && this.alive && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      this.rig.mats.blade.emissive.set('#ff3a10');
      this.rig.mats.blade.emissiveIntensity = 1.6;
      this.onPhase2?.();
    }
  }

  wake(): void {
    if (this.state === 'dormant') this.setState('emerge');
  }

  private begin(def: AttackDef, ctx: EnemyCtx, windup: number, combo: number): void {
    this.atk = def;
    this.comboLeft = combo;
    this.atkFrom = def.active[0] * 0.7;
    this.atkDur = def.duration * (this.isBoss ? (this.phase2 ? 0.95 : 1.05) : 1.25);
    this.setState('telegraph');
    this.stateT = -windup;
    ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: def.heavy ? 'knight-heavy' : 'knight-swing' });
  }

  protected think(dt: number, time: number, ctx: EnemyCtx): void {
    const { d, ang } = this.toPlayer(ctx);
    this.dodgeCd -= dt;
    const visor = this.rig.mats.dark;
    visor.emissiveIntensity = 2.4 + this.flash * 5 + (this.state === 'telegraph' ? 3 : 0) + (this.phase2 ? 1.5 + Math.sin(time * 8) : 0);
    let pose: Pose = guardPose(time);
    let rate = 10;
    let speed = 0;
    let ikT = 1;
    switch (this.state) {
      case 'dormant':
        pose = this.kneelPose();
        if (d < this.aggro && !this.isBoss) this.wake();
        break;
      case 'emerge':
        pose = track([[0, this.kneelPose()], [0.6, { ...this.kneelPose(), head: [-0.2, 0, 0], spine: [0, 0, 0] }], [1, guardPose(time)]], Math.min(1, this.stateT / 1.3));
        rate = 6;
        this.yaw = dampAngle(this.yaw, ang, 3, dt);
        if (this.stateT > 1.3) {
          this.kneel = false;
          this.setState('chase');
          this.cooldown = 0.6;
        }
        break;
      case 'idle':
        if (d < this.aggro) this.setState('chase');
        break;
      case 'chase': {
        this.yaw = dampAngle(this.yaw, ang, 7, dt);
        if (this.strafe === 'riposte') {
          this.strafe = null;
          this.begin(ATTACKS[1], ctx, 0.12, 1);
          break;
        }
        // Dodge back from the player's swings now and then.
        if (ctx.player.isSwinging() && d < 3.2 && this.dodgeCd <= 0 && ctx.rng() < (this.isBoss ? 0.04 : 0.015)) {
          this.strafe = 'backstep';
          this.strafeT = 0;
          this.dodgeCd = 2.2;
        }
        if (this.strafe === 'backstep') {
          this.strafeT += dt;
          const back = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
          this.vel.copy(back).multiplyScalar(this.strafeT < 0.3 ? 7 : 1);
          pose = { ...guardPose(time), spine: [-0.25, 0, 0], hipL: [-0.6, 0, 0], kneeL: [0.8, 0, 0], hipR: [0.3, 0, 0], kneeR: [0.4, 0, 0], rootY: -0.12 };
          if (this.strafeT > 0.45) this.strafe = null;
          break;
        }
        if (d > 3.8) {
          this.strafe = null;
          speed = (d > 8 ? 4.4 : 2.6) * this.speedMul;
          this.vel.set(Math.sin(this.yaw) * speed, 0, Math.cos(this.yaw) * speed);
          this.phase += gaitRate(speed) * dt;
          const loco = locomotion(this.phase, speed / 5, { armSwing: 0.1 });
          const gp = guardPose(time);
          pose = { ...loco, shoulderR: gp.shoulderR, elbowR: gp.elbowR, handR: gp.handR, shoulderL: gp.shoulderL, elbowL: gp.elbowL };
          if (d > 6 && this.cooldown <= 0 && ctx.rng() < 0.03) this.begin(HEAVY, ctx, 0.25, 0);
        } else {
          // Circle with the guard up.
          if (this.strafe !== 'strafe') {
            this.strafe = 'strafe';
            this.strafeDir = ctx.rng() < 0.5 ? -1 : 1;
          }
          const side = new THREE.Vector3(Math.cos(this.yaw) * this.strafeDir, 0, -Math.sin(this.yaw) * this.strafeDir);
          const close = d < 2.4 ? -1 : 0.3;
          this.vel.copy(side).multiplyScalar(1.3).addScaledVector(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), close);
          this.phase += gaitRate(1.4) * dt;
          const loco = locomotion(this.phase, 0.25, { armSwing: 0 });
          pose = { ...guardPose(time), hipL: loco.hipL, hipR: loco.hipR, kneeL: loco.kneeL, kneeR: loco.kneeR, footL: loco.footL, footR: loco.footR };
          if (this.cooldown <= 0 && ctx.player.state !== 'dead') {
            const r = ctx.rng();
            const maxCombo = this.isBoss ? (this.phase2 ? 3 : 2) : 1;
            if (r < 0.22) this.begin(HEAVY, ctx, this.isBoss ? 0.3 : 0.45, 0);
            else this.begin(ATTACKS[Math.floor(ctx.rng() * 2)], ctx, this.isBoss ? 0.22 : 0.4, Math.floor(ctx.rng() * (maxCombo + 1)));
          }
        }
        break;
      }
      case 'telegraph': {
        this.vel.multiplyScalar(Math.exp(-10 * dt));
        this.yaw = dampAngle(this.yaw, ang, 9, dt);
        pose = track(this.atk.keys, this.atkFrom);
        rate = 12;
        if (this.stateT >= 0) {
          this.setState('strike');
          ctx.bus.emit({ type: 'enemy-attack', pos: this.pos.clone(), kind: this.atk.heavy ? 'boss-sweep' : 'penitent-swing' });
        }
        break;
      }
      case 'strike': {
        const span = 1 - this.atkFrom;
        const k = Math.min(1, this.atkFrom + (this.stateT / this.atkDur) * span / (1 - this.atkFrom));
        pose = track(this.atk.keys, k);
        rate = 24;
        ikT = this.atk.heavy ? 1 : 0;
        const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
        const act = k > this.atk.active[0] && k < this.atk.active[1];
        if (act) this.vel.copy(fwd).multiplyScalar(this.atk.lunge * (this.isBoss ? 1.6 : 1.2));
        else this.vel.multiplyScalar(Math.exp(-8 * dt));
        if (k < this.atk.active[0]) this.yaw = dampAngle(this.yaw, ang, 6, dt);
        if (!this.hitDone && act && this.inArc(ctx, this.atk.reach + 0.3, this.atk.arc + 0.3)) {
          this.hitDone = true;
          const dmg = this.atk.heavy ? (this.isBoss ? 38 : 30) : this.isBoss ? 22 : 16;
          this.strikePlayer(ctx, dmg, this.atk.heavy);
        }
        if (this.atk.heavy && this.phase2 && !this.waveDone && k > this.atk.active[0] + 0.04) {
          this.waveDone = true;
          const p = this.pos.clone().addScaledVector(fwd, 2.4);
          ctx.vfx.ring(p, 0.5, 7, 0.6, '#ff6040', 'shock');
          ctx.shake(0.35);
          this.spawnWave(p, 11, 8, 0.7, 18);
        }
        if (k >= 1) {
          this.waveDone = false;
          if (this.comboLeft > 0) {
            this.begin(ATTACKS[(ATTACKS.indexOf(this.atk) + 1) % ATTACKS.length], ctx, this.isBoss ? 0.08 : 0.2, this.comboLeft - 1);
          } else {
            this.setState('recover');
            this.cooldown = (this.isBoss ? (this.phase2 ? 0.4 : 0.7) : 1.3) + ctx.rng() * 0.8;
          }
        }
        break;
      }
      case 'recover':
        this.vel.multiplyScalar(Math.exp(-7 * dt));
        pose = { ...guardPose(time), spine: [0.25, 0, 0], head: [0.1, 0, 0] };
        rate = 6;
        if (this.stateT > (this.isBoss ? 0.55 : 0.9)) this.setState('chase');
        break;
      case 'stagger':
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        pose = HIT_POSE;
        rate = 18;
        ikT = 0;
        if (this.stateT > (this.isBoss ? 1.2 : 0.9)) this.setState('chase');
        break;
      case 'dead':
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        pose = track(DEATH_KEYS, Math.min(1, this.stateT / 1.6));
        rate = 8;
        ikT = 0;
        visor.emissiveIntensity = Math.max(0, 3 - this.stateT * 1.5);
        if (this.stateT < dt * 1.5) {
          ctx.vfx.sparks(this.focusPoint(new THREE.Vector3()), 26, '#ff7050', 6);
          ctx.bus.emit({ type: 'enemy-dead', pos: this.pos.clone(), kind: this.kind });
        }
        if (!this.isBoss && this.stateT > 4) this.group.position.y -= dt * 0.3;
        if (!this.isBoss && this.stateT > 6.5) this.removed = true;
        break;
    }
    if (this.kneel && this.state === 'dormant') ikT = 0;
    this.anim.apply(pose, dt, rate);
    this.ik = damp(this.ik, ikT, 12, dt);
    this.group.rotation.y = this.yaw;
    this.group.updateMatrixWorld(true);
    this.rig.secondary(dt, speed, this.ik);
    if (this.cloth) this.cloth.wind.set(Math.sin(time * 0.6) * 1.5 + 0.5, 0, 0.8);
  }

  private waveDone = false;

  reset(): void {
    this.hp = this.maxHp;
    this.alive = true;
    this.phase2 = false;
    this.poise = this.maxPoise;
    this.state = 'dormant';
    this.stateT = 0;
    this.removed = false;
    this.kneel = true;
    this.waves.length = 0;
    this.rig.mats.blade.emissive.set('#1c2430');
    this.rig.mats.blade.emissiveIntensity = 0.35;
    this.anim.snap(this.kneelPose());
    this.cloth?.reset();
  }
}

// ============================================================================ Archdeacon Morvane

type MAttack = 'orbs' | 'toll' | 'pillars' | 'sweep' | 'blink' | 'call';

/**
 * Archdeacon Morvane. Phase one: a priest with a bell-staff, keeping his distance. Phase two: he
 * drinks the Heart's light and rises to giant size, the Waking Choir's god-king made flesh.
 */
export class MorvaneBoss extends Enemy {
  readonly rig: MorvaneRig;
  private readonly anim: Animator;
  private readonly orbs: Orbs;
  private attack: MAttack = 'orbs';
  private last: MAttack | null = null;
  private pillars: Array<{ p: THREE.Vector3; t: number; done: boolean }> = [];
  private hover = 0;
  phase2 = false;
  growing = 0;
  awake = false;
  onPhase2: (() => void) | null = null;
  onCall: (() => void) | null = null;
  private size = 1;
  private calledP1 = false;
  private calledP2 = false;

  constructor(private readonly space: () => THREE.Object3D | null) {
    super('Archdeacon Morvane', 'morvane', 1600, 0.9, 200, 0);
    this.rig = buildMorvane(1.22);
    this.anim = new Animator(this.rig);
    this.group.add(this.rig.root);
    this.orbs = new Orbs(space, 'rgba(255,245,200,1)', 'rgba(255,170,40,0)', 'morv-orb');
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2), Mats().contactShadow);
    sh.position.y = 0.03;
    this.group.add(sh);
    this.state = 'dormant';
  }

  focusPoint(t: THREE.Vector3): THREE.Vector3 {
    return t.copy(this.pos).setY(this.pos.y + 1.5 * this.size);
  }

  protected onStagger(): void {
    this.flash = 1;
  }

  takeHit(hit: HitInfo): void {
    if (this.growing > 0) return;
    super.takeHit(hit);
    if (!this.phase2 && this.alive && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      this.growing = 0.001;
      this.setState('recover');
      this.orbs.clear();
      this.onPhase2?.();
    }
  }

  wake(): void {
    this.awake = true;
    this.setState('chase');
    this.cooldown = 1.2;
  }

  private pick(ctx: EnemyCtx, d: number): MAttack {
    const r = ctx.rng();
    if (!this.calledP1 && this.hp < this.maxHp * 0.8) {
      this.calledP1 = true;
      return 'call';
    }
    if (this.phase2 && !this.calledP2 && this.hp < this.maxHp * 0.3) {
      this.calledP2 = true;
      return 'call';
    }
    let a: MAttack;
    if (d < 4.5 * this.size) a = r < 0.45 ? 'sweep' : r < 0.75 ? 'toll' : 'blink';
    else a = r < 0.45 ? 'orbs' : r < 0.8 ? 'pillars' : 'toll';
    if (a === this.last && ctx.rng() < 0.6) a = a === 'orbs' ? 'pillars' : 'orbs';
    return a;
  }

  protected think(dt: number, time: number, ctx: EnemyCtx): void {
    const { d, ang } = this.toPlayer(ctx);
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.rig.glow.emissiveIntensity = 2.4 + this.flash * 5 + (this.state === 'telegraph' ? 3 + Math.sin(time * 20) : 0) + (this.phase2 ? 2 : 0);
    this.rig.halo.rotation.z += dt * (this.phase2 ? 2 : 0.6);
    let pose: Pose = { ...idle(time * 0.8), shoulderR: [-0.35, 0, -0.15], elbowR: [-1.2, 0, 0], handR: [0.1, 0, 0] };
    let rate = 8;
    const spd = this.phase2 ? 1.3 : 1;
    // Phase-two growth: he swells to a giant over a few seconds.
    if (this.growing > 0) {
      this.growing += dt;
      const k = Math.min(1, this.growing / 4);
      this.size = 1 + k * k * (3 - 2 * k) * 1.25;
      pose = { ...idle(time), shoulderR: [-2.8, 0, -0.3], elbowR: [-0.2, 0, 0], shoulderL: [-2.4, 0, 0.6], elbowL: [-0.3, 0, 0], spine: [-0.35, 0, 0], head: [-0.6, 0, 0] };
      this.vel.set(0, 0, 0);
      if (Math.random() < 0.5) ctx.vfx.holyMotes(this.focusPoint(new THREE.Vector3()), 3);
      if (k >= 1) {
        this.growing = 0;
        this.setState('chase');
        this.cooldown = 1;
      }
    } else {
      switch (this.state) {
        case 'dormant':
          pose = { ...idle(time * 0.6), shoulderR: [-0.35, 0, -0.15], elbowR: [-1.2, 0, 0], head: [0.2, 0, 0] };
          break;
        case 'chase': {
          this.yaw = dampAngle(this.yaw, ang, 3 * spd, dt);
          // Keep a preacher's distance in phase one; advance in phase two.
          const want = this.phase2 ? 4 * this.size : 9;
          const sp = d > want + 2 ? 2.2 * spd * (this.phase2 ? 1.6 : 1) : d < want - 3 && !this.phase2 ? -1.6 : 0;
          this.vel.set(Math.sin(this.yaw) * sp, 0, Math.cos(this.yaw) * sp);
          if (sp !== 0) {
            this.hover += dt * gaitRate(Math.abs(sp) / this.size);
            pose = { ...locomotion(this.hover, Math.abs(sp) / 6, { armSwing: 0.1 }), shoulderR: [-0.35, 0, -0.15], elbowR: [-1.2, 0, 0] };
          }
          if (this.cooldown <= 0 && ctx.player.state !== 'dead') {
            this.attack = this.pick(ctx, d);
            this.last = this.attack;
            this.setState('telegraph');
            ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: `morvane-${this.attack}` });
            if (this.attack === 'toll') ctx.vfx.ring(this.pos, 1.5, 11 * this.size, 1.1 / spd, '#ffd070', 'tele');
            if (this.attack === 'pillars') {
              this.pillars = [];
              const n = this.phase2 ? 5 : 3;
              for (let i = 0; i < n; i += 1) {
                const p = ctx.player.pos.clone().add(new THREE.Vector3((ctx.rng() - 0.5) * 6 * (i > 0 ? 1 : 0), 0, (ctx.rng() - 0.5) * 6 * (i > 0 ? 1 : 0)));
                this.pillars.push({ p, t: -0.9 - i * 0.35, done: false });
              }
            }
          }
          break;
        }
        case 'telegraph': {
          this.vel.multiplyScalar(Math.exp(-8 * dt));
          this.yaw = dampAngle(this.yaw, ang, 5, dt);
          const durs: Record<MAttack, number> = { orbs: 0.8, toll: 1.1, pillars: 0.7, sweep: 0.6, blink: 0.35, call: 1.4 };
          rate = 7;
          if (this.attack === 'sweep') pose = { ...idle(time), shoulderR: [-1.0, 0.5, -1.5], elbowR: [-0.6, 0, 0], chest: [0, -0.8, 0], spine: [0.1, -0.4, 0] };
          else if (this.attack === 'toll') pose = { ...idle(time), shoulderR: [-2.9, 0, -0.2], elbowR: [-0.2, 0, 0], shoulderL: [-2.6, 0, 0.3], elbowL: [-0.3, 0, 0], spine: [-0.3, 0, 0], head: [-0.4, 0, 0] };
          else pose = { ...idle(time), shoulderR: [-2.9, 0, -0.2], elbowR: [-0.2, 0, 0], shoulderL: [-1.4, 0, 0.6], elbowL: [-0.6, 0, 0], spine: [-0.25, 0, 0], head: [-0.4, 0, 0] };
          if (this.attack === 'pillars') for (const p of this.pillars) ctx.vfx.ring(p.p, 1.6, 1.6, 0.05, '#ffd070', 'marker');
          if (this.stateT > durs[this.attack] / spd) {
            this.setState('strike');
            ctx.bus.emit({ type: 'enemy-attack', pos: this.pos.clone(), kind: `morvane-${this.attack}` });
          }
          break;
        }
        case 'strike': {
          rate = 16;
          if (this.attack === 'orbs') {
            pose = { ...idle(time), shoulderR: [-1.6, 0, -0.1], elbowR: [-0.1, 0, 0], shoulderL: [-1.5, 0, 0.3], elbowL: [-0.2, 0, 0], spine: [0.2, 0, 0] };
            const n = this.phase2 ? 5 : 3;
            const step = 0.18;
            for (let i = 0; i < n; i += 1) {
              if (this.stateT >= i * step && this.stateT - dt < i * step) {
                const top = this.rig.staffTop.getWorldPosition(new THREE.Vector3());
                const space = this.space();
                if (space) space.worldToLocal(top);
                const spread = (i - (n - 1) / 2) * 0.35;
                const dir = new THREE.Vector3(Math.sin(this.yaw + spread), 0.15, Math.cos(this.yaw + spread)).normalize();
                this.orbs.fire(top, dir.multiplyScalar(this.phase2 ? 13 : 10), 1.2, this.phase2 ? 22 : 16, 1.1 * Math.sqrt(this.size));
              }
            }
            if (this.stateT > n * step + 0.3) this.end(ctx, 0.9);
          } else if (this.attack === 'toll') {
            pose = { ...idle(time), shoulderR: [-0.6, 0, -0.1], elbowR: [-0.1, 0, 0], shoulderL: [-0.5, 0, 0.3], spine: [0.55, 0, 0], head: [0.3, 0, 0], kneeL: [0.4, 0, 0], kneeR: [0.4, 0, 0], rootY: -0.1 };
            if (!this.hitDone && this.stateT > 0.1) {
              this.hitDone = true;
              ctx.vfx.ring(this.pos, 0.8, 13 * this.size, 0.9, '#ffe0a0', 'shock');
              ctx.bus.emit({ type: 'toll', pos: this.pos.clone() });
              ctx.shake(0.5);
              this.spawnWave(this.pos, 13, 13 * this.size, 1.2, this.phase2 ? 30 : 22);
              if (this.phase2) this.spawnWave(this.pos, 8, 10 * this.size, 1.0, 20);
            }
            if (this.stateT > 0.9) this.end(ctx, 1.1);
          } else if (this.attack === 'pillars') {
            pose = { ...idle(time), shoulderR: [-3.0, 0, -0.1], elbowR: [-0.1, 0, 0], shoulderL: [-2.8, 0, 0.3], spine: [-0.3, 0, 0], head: [-0.5, 0, 0] };
            let all = true;
            for (const p of this.pillars) {
              p.t += dt;
              if (p.t < 0) {
                ctx.vfx.ring(p.p, 1.6, 1.6, 0.05, '#ffd070', 'marker');
                all = false;
              } else if (!p.done) {
                p.done = true;
                ctx.vfx.impact(p.p.clone().setY(p.p.y + 1.5), 1.6, '#ffe8b0');
                ctx.vfx.sparks(p.p.clone().setY(p.p.y + 0.5), 30, '#ffd080', 10);
                ctx.vfx.ring(p.p, 0.4, 2.4, 0.5, '#fff0c0', 'shock');
                ctx.shake(0.15);
                if (Math.hypot(ctx.player.pos.x - p.p.x, ctx.player.pos.z - p.p.z) < 1.8) this.strikePlayer(ctx, this.phase2 ? 30 : 24, true, false);
              }
            }
            if (all && this.stateT > 0.4) this.end(ctx, 0.8);
          } else if (this.attack === 'sweep') {
            const k = Math.min(1, this.stateT / 0.4);
            pose = { ...idle(time), shoulderR: [-1.3, 0, 1.1], elbowR: [-0.1, 0, 0], chest: [0.15, 0.9, 0], spine: [0.25, 0.4, 0] };
            if (!this.hitDone && k > 0.2 && k < 0.8 && this.inArc(ctx, 3.4 * this.size, 2.4)) {
              this.hitDone = true;
              this.strikePlayer(ctx, this.phase2 ? 34 : 24, true);
            }
            if (this.phase2 && !this.hitDone && k > 0.5) {
              ctx.vfx.ring(this.pos.clone().addScaledVector(fwd, 3 * this.size), 0.5, 6, 0.5, '#ffd070', 'shock');
            }
            if (this.stateT > 0.5) this.end(ctx, 0.9);
          } else if (this.attack === 'blink') {
            if (!this.hitDone) {
              this.hitDone = true;
              ctx.vfx.holyMotes(this.focusPoint(new THREE.Vector3()), 20);
              const near = ctx.nav.path.samples[Math.max(0, this.pathIndex)];
              const away = Math.sign((this.pos.x - ctx.player.pos.x) * near.tangent.x + (this.pos.z - ctx.player.pos.z) * near.tangent.z) || 1;
              this.pos.copy(near.pos).addScaledVector(near.tangent, away * 10).addScaledVector(near.right, (ctx.rng() - 0.5) * near.width * 0.6);
              this.pathIndex = ctx.nav.resolve(this.pos, 0.8, this.pathIndex);
              ctx.vfx.holyMotes(this.focusPoint(new THREE.Vector3()), 20);
            }
            if (this.stateT > 0.3) this.end(ctx, 0.3);
          } else {
            pose = { ...idle(time), shoulderR: [-2.9, 0, -0.2], elbowR: [-0.2, 0, 0], shoulderL: [-2.9, 0, 0.2], elbowL: [-0.2, 0, 0], spine: [-0.4, 0, 0], head: [-0.6, 0, 0] };
            if (!this.hitDone) {
              this.hitDone = true;
              this.onCall?.();
              for (let i = 0; i < (this.phase2 ? 4 : 3); i += 1) {
                const a = (i / 3) * Math.PI * 2 + this.yaw;
                ctx.spawnMite(this.pos.clone().add(new THREE.Vector3(Math.cos(a) * 6, 0, Math.sin(a) * 6)));
              }
            }
            if (this.stateT > 1.0) this.end(ctx, 0.6);
          }
          break;
        }
        case 'recover':
          this.vel.multiplyScalar(Math.exp(-6 * dt));
          pose = { ...idle(time), shoulderR: [-0.35, 0, -0.15], elbowR: [-1.2, 0, 0], spine: [0.3, 0, 0] };
          if (this.stateT > this.recoverT) this.setState('chase');
          break;
        case 'stagger':
          this.vel.multiplyScalar(Math.exp(-5 * dt));
          pose = { ...idle(time), spine: [0.7, 0.2, 0], head: [0.6, 0, 0.3], shoulderR: [-0.2, 0, -0.5], elbowR: [-0.6, 0, 0], kneeL: [0.6, 0, 0], kneeR: [0.4, 0, 0], rootY: -0.18 };
          if (this.stateT > 2) this.setState('chase');
          break;
        case 'dead':
          this.vel.multiplyScalar(Math.exp(-5 * dt));
          pose = track(
            [
              [0, { ...idle(0), spine: [-0.5, 0, 0], head: [-0.7, 0, 0], shoulderL: [-2.4, 0, 0.6], shoulderR: [-2.4, 0, -0.6] }],
              [0.5, { hipL: [-1.5, 0, 0.1], hipR: [-1.5, 0, -0.1], kneeL: [2.2, 0, 0], kneeR: [2.2, 0, 0], spine: [0.4, 0, 0], head: [0.3, 0, 0], shoulderL: [-0.6, 0, 0.3], shoulderR: [-0.6, 0, -0.3], rootY: -0.6 }],
              [1, { hipL: [-1.5, 0, 0.1], hipR: [-1.5, 0, -0.1], kneeL: [2.2, 0, 0], kneeR: [2.2, 0, 0], spine: [1.0, 0, 0], head: [0.6, 0, 0], shoulderL: [0.1, 0, 0.3], shoulderR: [0.1, 0, -0.3], rootY: -0.62 }],
            ],
            Math.min(1, this.stateT / 3),
          );
          rate = 4;
          this.rig.glow.emissiveIntensity = Math.max(0, 3 - this.stateT);
          if (this.stateT < dt * 1.5) {
            this.orbs.clear();
            ctx.vfx.sparks(this.focusPoint(new THREE.Vector3()), 50, '#ffe0a0', 12);
            ctx.vfx.impact(this.focusPoint(new THREE.Vector3()), 2.5, '#ffe0a0');
            ctx.bus.emit({ type: 'enemy-dead', pos: this.pos.clone(), kind: 'morvane' });
          }
          // He shrinks back to a man as he dies.
          this.size = damp(this.size, 1, 0.8, dt);
          break;
        default:
          break;
      }
    }
    this.orbs.update(dt, ctx, this, '#ffd890', (dmg) => this.strikePlayer(ctx, dmg, false, false));
    this.rig.root.scale.setScalar(this.size);
    this.anim.apply(pose, dt, rate);
  }

  private recoverT = 1;

  private end(ctx: EnemyCtx, recover: number): void {
    this.recoverT = recover / (this.phase2 ? 1.3 : 1);
    this.setState('recover');
    this.cooldown = (this.phase2 ? 0.5 : 0.9) + ctx.rng() * 0.7;
  }

  get scaleNow(): number {
    return this.size;
  }

  reset(): void {
    this.hp = this.maxHp;
    this.alive = true;
    this.phase2 = false;
    this.growing = 0;
    this.awake = false;
    this.size = 1;
    this.calledP1 = this.calledP2 = false;
    this.poise = this.maxPoise;
    this.state = 'dormant';
    this.stateT = 0;
    this.removed = false;
    this.waves.length = 0;
    this.orbs.clear();
    this.pillars = [];
    this.rig.root.scale.setScalar(1);
  }
}
