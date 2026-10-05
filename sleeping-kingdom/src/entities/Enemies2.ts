import * as THREE from 'three';
import { Animator, bakeMeshes, dome, idle, latheG, limb, locomotion, mesh, skeleton, track, type Pose, type Rig } from './Rig';
import { Enemy, type EnemyCtx } from './Enemies';
import { Mats, retro } from '../world/Materials';
import { Tex } from '../world/Textures';
import { clamp, damp, dampAngle, wrapAngle } from '../utils/math';
import type { HitInfo } from '../systems/Combat';

// ============================================================================ textures

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}

let scaleTex: { map: THREE.Texture; glow: THREE.Texture } | null = null;
function dragonScales(): { map: THREE.Texture; glow: THREE.Texture } {
  if (scaleTex) return scaleTex;
  const draw = (glow: boolean) => (c: CanvasRenderingContext2D) => {
    c.fillStyle = glow ? '#000' : '#16110f';
    c.fillRect(0, 0, 128, 128);
    for (let row = 0; row < 12; row += 1) {
      for (let col = -1; col < 9; col += 1) {
        const x = col * 16 + (row % 2) * 8;
        const y = row * 11;
        if (glow) {
          c.strokeStyle = (row * 7 + col * 3) % 5 === 0 ? 'rgba(255,110,30,1)' : 'rgba(150,40,10,0.6)';
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(x + 8, y, 8.5, 0.15 * Math.PI, 0.85 * Math.PI);
          c.stroke();
        } else {
          const g = c.createLinearGradient(0, y - 6, 0, y + 8);
          g.addColorStop(0, '#4a403c');
          g.addColorStop(1, '#141010');
          c.fillStyle = g;
          c.beginPath();
          c.arc(x + 8, y, 8, 0, Math.PI);
          c.fill();
          c.strokeStyle = 'rgba(0,0,0,0.7)';
          c.stroke();
        }
      }
    }
  };
  scaleTex = { map: canvasTex(128, 128, draw(false)), glow: canvasTex(128, 128, draw(true)) };
  return scaleTex;
}

// ============================================================================ Briar Thrall (melee)

/** Antler-skulled thrall in mossy rags with a rusted sickle. Penitent AI, new body. */
export function dressAsThrall(rig: Rig & { censer: THREE.Object3D; maskGlow: THREE.MeshStandardMaterial }): void {
  const m = Mats();
  // Replace the bell mask with a stag skull and antlers.
  rig.j.head.clear();
  rig.j.head.add(mesh(new THREE.SphereGeometry(0.15, 10, 8).scale(0.9, 1, 1.35), m.bone, 0, 0.12, 0.04));
  rig.j.head.add(mesh(new THREE.ConeGeometry(0.08, 0.26, 7), m.bone, 0, 0.06, 0.2, Math.PI / 2 + 0.5));
  for (const sx of [-1, 1]) {
    rig.j.head.add(mesh(new THREE.SphereGeometry(0.035, 6, 5), rig.maskGlow, sx * 0.06, 0.15, 0.17));
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * 0.08, 0.24, 0),
      new THREE.Vector3(sx * 0.25, 0.45, -0.05),
      new THREE.Vector3(sx * 0.32, 0.7, 0.05),
      new THREE.Vector3(sx * 0.45, 0.85, -0.05),
    ]);
    rig.j.head.add(mesh(new THREE.TubeGeometry(c, 10, 0.022, 5), m.bone));
    rig.j.head.add(mesh(new THREE.ConeGeometry(0.018, 0.22, 4), m.bone, sx * 0.3, 0.6, 0.1, 0.6, 0, sx * -0.4));
  }
  rig.maskGlow.color.set('#021006');
  rig.maskGlow.emissive.set('#6aff7a');
  // Sickle instead of a censer.
  rig.censer.clear();
  rig.censer.add(mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.55, 5), m.wood, 0, -0.22, 0));
  const blade = new THREE.TorusGeometry(0.22, 0.02, 4, 12, Math.PI * 1.1);
  rig.censer.add(mesh(blade, m.ironDark, 0.18, -0.48, 0, 0, 0, Math.PI));
  bakeMeshes(rig.j.head);
}

// ============================================================================ Thornwife (witch)

type Bolt = { mesh: THREE.Sprite; pos: THREE.Vector3; vel: THREE.Vector3; life: number; homing: number };
type Spikes = { group: THREE.Group; t: number; hit: boolean };

const WITCH_CAST: Pose = {
  shoulderR: [-2.6, 0, -0.3], elbowR: [-0.4, 0, 0], shoulderL: [-1.2, 0, 0.6], elbowL: [-0.9, 0, 0],
  spine: [-0.15, 0, 0], head: [-0.2, 0, 0], rootY: 0.1,
};
const WITCH_THROW: Pose = {
  shoulderR: [-1.3, 0, 0.1], elbowR: [0, 0, 0], shoulderL: [-1.5, 0, 0.3], elbowL: [-0.2, 0, 0],
  spine: [0.35, 0, 0], head: [0.1, 0, 0], rootY: 0.05,
};

export class Thornwife extends Enemy {
  readonly rig: Rig;
  private readonly anim: Animator;
  private readonly staffGlow: THREE.MeshStandardMaterial;
  private readonly eyeGlow: THREE.MeshStandardMaterial;
  private readonly bolts: Bolt[] = [];
  private readonly spikes: Spikes[] = [];
  private spell: 'bolt' | 'thorns' | 'claw' = 'bolt';
  private readonly target = new THREE.Vector3();
  private blinkCd = 0;
  private hover = 0;
  private readonly hairs: THREE.Object3D[] = [];

  constructor(private readonly space: THREE.Object3D) {
    super('Thornwife', 'witch', 90, 0.55, 35, 22);
    const m = Mats();
    this.staffGlow = new THREE.MeshStandardMaterial({ color: '#031008', emissive: '#4aff7a', emissiveIntensity: 2.2 });
    this.eyeGlow = new THREE.MeshStandardMaterial({ color: '#031008', emissive: '#9aff6a', emissiveIntensity: 3 });
    const robe = retro(new THREE.MeshStandardMaterial({ map: Tex.cloth(34, 44, 34, 'witchRobe'), roughness: 1, side: THREE.DoubleSide }));
    const skin = retro(new THREE.MeshStandardMaterial({ color: '#8f9c84', roughness: 0.8 }));
    const rig = skeleton({ scale: 1.1, hipY: 0.98, thigh: 0.46, shin: 0.44, spine: 0.27, chest: 0.34, shoulderW: 0.2 });
    this.rig = rig;
    const { j } = rig;
    j.hips.add(mesh(latheG([[0.18, 0.14], [0.22, 0], [0.32, -0.45], [0.46, -0.9], [0.5, -0.98]], 12), robe));
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2;
      const g = new THREE.PlaneGeometry(0.16, 0.3 + (i % 3) * 0.12);
      g.translate(0, -0.15, 0);
      j.hips.add(mesh(g, robe, Math.sin(a) * 0.48, -0.95, Math.cos(a) * 0.48, 0.2, a, 0));
    }
    j.spine.add(mesh(limb(0.17, 0.16, 0.3, 10), robe, 0, 0.3, 0));
    j.chest.add(mesh(latheG([[0.16, -0.04], [0.2, 0.1], [0.3, 0.24], [0.14, 0.36], [0, 0.37]], 12), robe));
    // Face: gaunt, pale, glowing eyes and a long hooked nose.
    j.head.add(mesh(new THREE.SphereGeometry(0.12, 12, 10).scale(0.85, 1.2, 0.95), skin, 0, 0.12, 0.01));
    j.head.add(mesh(new THREE.ConeGeometry(0.03, 0.16, 5), skin, 0, 0.1, 0.16, Math.PI / 2 + 0.6));
    j.head.add(mesh(new THREE.ConeGeometry(0.03, 0.06, 4), skin, 0, -0.01, 0.1, 0.4));
    for (const sx of [-1, 1]) j.head.add(mesh(new THREE.SphereGeometry(0.022, 6, 5), this.eyeGlow, sx * 0.045, 0.15, 0.1));
    // Long grey hair strands.
    const hairMat = retro(new THREE.MeshStandardMaterial({ color: '#9a9a90', roughness: 1, side: THREE.DoubleSide }));
    for (let i = 0; i < 7; i += 1) {
      const g = new THREE.PlaneGeometry(0.06, 0.7);
      g.translate(0, -0.35, 0);
      const h = mesh(g, hairMat, -0.12 + i * 0.04, 0.2, -0.08, 0.15, (i - 3) * 0.25, 0);
      h.userData.keep = true;
      j.head.add(h);
      this.hairs.push(h);
    }
    // Hat: wide drooping brim and a tall, crooked, tattered crown.
    j.head.add(mesh(latheG([[0.5, -0.05], [0.4, 0.0], [0.22, 0.02], [0.16, 0.03]], 18), robe, 0, 0.25, 0));
    const cone = new THREE.ConeGeometry(0.17, 0.75, 10, 6, true);
    const cp = cone.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < cp.count; i += 1) {
      const t = (cp.getY(i) + 0.375) / 0.75;
      cp.setZ(i, cp.getZ(i) - t * t * 0.32);
      cp.setX(i, cp.getX(i) + Math.sin(t * 3) * 0.04);
    }
    cone.computeVertexNormals();
    j.head.add(mesh(cone, robe, 0, 0.62, 0));
    j.head.add(mesh(new THREE.TorusGeometry(0.16, 0.02, 4, 14), Mats().bone, 0, 0.3, 0, Math.PI / 2));
    // Long sleeves and clawed hands.
    for (const side of ['L', 'R'] as const) {
      j[`shoulder${side}`].add(mesh(limb(0.06, 0.07, 0.3), robe));
      j[`elbow${side}`].add(mesh(latheG([[0.06, 0], [0.1, -0.15], [0.16, -0.27]], 9), robe));
      const hand = j[`hand${side}`];
      hand.add(mesh(new THREE.SphereGeometry(0.04, 6, 5), skin, 0, -0.03, 0));
      for (let f = 0; f < 4; f += 1) hand.add(mesh(new THREE.ConeGeometry(0.008, 0.12, 4), Mats().bone, (f - 1.5) * 0.016, -0.11, 0.02, 0.3, 0, 0));
    }
    // Gnarled staff topped with a caged skull of witchfire.
    const staff = new THREE.Group();
    const sc = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -1.0, 0), new THREE.Vector3(0.03, -0.3, 0.02), new THREE.Vector3(-0.03, 0.4, 0), new THREE.Vector3(0.05, 0.85, 0.03)]);
    staff.add(mesh(new THREE.TubeGeometry(sc, 12, 0.022, 5), m.wood));
    staff.add(mesh(new THREE.SphereGeometry(0.08, 8, 6).scale(0.9, 1, 1.15), m.bone, 0.05, 0.95, 0.03));
    staff.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), this.staffGlow, 0.05, 0.95, 0.06));
    staff.position.set(0, -0.06, 0.02);
    staff.rotation.x = Math.PI / 2 - 0.2;
    j.handR.add(staff);
    this.group.add(rig.root);
    rig.root.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    bakeMeshes(rig.root);
    this.anim = new Animator(rig);
    this.state = 'idle';
  }

  focusPoint(t: THREE.Vector3): THREE.Vector3 {
    return t.copy(this.pos).setY(this.pos.y + 1.4 + this.hover);
  }

  protected onStagger(): void {
    this.flash = 1;
  }

  private castBolt(ctx: EnemyCtx): void {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: Tex.radial('rgba(200,255,170,1)', 'rgba(40,255,90,0)', 'wbolt'), blending: THREE.AdditiveBlending, depthWrite: false }));
    sprite.scale.setScalar(1.1);
    const p = this.pos.clone().setY(this.pos.y + 2.1 + this.hover).addScaledVector(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)), 0.6);
    sprite.position.copy(p);
    this.space.add(sprite);
    const dir = ctx.player.pos.clone().setY(ctx.player.pos.y + 1.1).sub(p).normalize();
    this.bolts.push({ mesh: sprite, pos: p, vel: dir.multiplyScalar(12), life: 3, homing: 0.45 });
    ctx.bus.emit({ type: 'enemy-attack', pos: this.pos.clone(), kind: 'witch-bolt' });
  }

  private eruptThorns(ctx: EnemyCtx): void {
    const g = new THREE.Group();
    g.position.copy(this.target);
    const mat = new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.9, emissive: '#0a3010', emissiveIntensity: 0.6 });
    for (let i = 0; i < 9; i += 1) {
      const a = (i / 9) * Math.PI * 2 + ctx.rng();
      const r = i === 0 ? 0 : 0.9 + ctx.rng() * 0.8;
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.4 + ctx.rng(), 5), mat);
      s.position.set(Math.cos(a) * r, -1.4, Math.sin(a) * r);
      s.rotation.set((ctx.rng() - 0.5) * 0.6, 0, (ctx.rng() - 0.5) * 0.6);
      s.castShadow = true;
      g.add(s);
    }
    this.space.add(g);
    this.spikes.push({ group: g, t: 0, hit: false });
    ctx.vfx.dust(this.target, 10, 1.5, '#3a2a1a');
    ctx.bus.emit({ type: 'enemy-attack', pos: this.target.clone(), kind: 'witch-thorns' });
  }

  private blink(ctx: EnemyCtx): void {
    ctx.vfx.dust(this.pos.clone().setY(this.pos.y + 0.8), 18, 0.8, '#1a3a24');
    ctx.vfx.sparks(this.pos.clone().setY(this.pos.y + 1.2), 14, '#7aff8a', 4);
    const near = ctx.nav.path.samples[Math.max(0, this.pathIndex)];
    const away = Math.sign((this.pos.x - ctx.player.pos.x) * near.tangent.x + (this.pos.z - ctx.player.pos.z) * near.tangent.z) || 1;
    const dest = near.pos.clone().addScaledVector(near.tangent, away * (7 + ctx.rng() * 4)).addScaledVector(near.right, (ctx.rng() - 0.5) * near.width * 0.7);
    this.pos.copy(dest);
    this.pathIndex = ctx.nav.resolve(this.pos, 0.5, this.pathIndex);
    ctx.vfx.dust(this.pos.clone().setY(this.pos.y + 0.8), 18, 0.8, '#1a3a24');
    ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: 'witch-blink' });
    this.blinkCd = 4;
  }

  protected think(dt: number, time: number, ctx: EnemyCtx): void {
    const { d, ang } = this.toPlayer(ctx);
    this.blinkCd -= dt;
    this.staffGlow.emissiveIntensity = 2 + (this.state === 'telegraph' ? 6 + Math.sin(time * 30) * 2 : 0) + this.flash * 4;
    this.eyeGlow.emissiveIntensity = 3 + this.flash * 6;
    this.hover = this.alive ? 0.18 + Math.sin(time * 1.6 + this.maxHp) * 0.08 : damp(this.hover, 0, 4, dt);
    this.rig.body.position.y = this.hover;
    for (const [i, h] of this.hairs.entries()) h.rotation.x = 0.15 + Math.sin(time * 2 + i) * 0.08 + (this.vel.length() * 0.06);
    let pose: Pose = idle(time, { hunch: 0.25 });
    pose.shoulderR = [-0.5, 0, -0.15];
    pose.elbowR = [-0.6, 0, 0];
    let rate = 8;
    switch (this.state) {
      case 'idle':
        if (d < this.aggro) {
          this.setState('chase');
          ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: 'witch-cackle' });
        }
        break;
      case 'chase': {
        this.yaw = dampAngle(this.yaw, ang, 6, dt);
        // Keep a casting distance; drift sideways.
        const want = d < 6 ? -2.6 : d > 12 ? 2.4 : 0;
        const strafe = Math.sin(time * 0.8 + this.maxHp) * 1.6;
        this.vel.set(Math.sin(this.yaw) * want + Math.cos(this.yaw) * strafe, 0, Math.cos(this.yaw) * want - Math.sin(this.yaw) * strafe);
        if (d < 3.4 && this.blinkCd <= 0) {
          this.blink(ctx);
          break;
        }
        if (this.cooldown <= 0 && ctx.player.state !== 'dead' && d < 20) {
          const r = ctx.rng();
          this.spell = d < 2.4 ? 'claw' : r < 0.6 ? 'bolt' : 'thorns';
          this.setState('telegraph');
          if (this.spell === 'thorns') {
            this.target.copy(ctx.player.pos);
            ctx.vfx.ring(this.target, 2.2, 2.2, 1.1, '#7aff8a', 'tele');
          }
          ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: `witch-${this.spell}` });
        }
        break;
      }
      case 'telegraph': {
        this.vel.multiplyScalar(Math.exp(-8 * dt));
        this.yaw = dampAngle(this.yaw, ang, 8, dt);
        pose = this.spell === 'claw' ? { ...WITCH_CAST, shoulderL: [-2.2, 0, 0.4] } : WITCH_CAST;
        const dur = this.spell === 'bolt' ? 0.75 : this.spell === 'thorns' ? 1.1 : 0.45;
        if (this.spell === 'bolt' && Math.floor(this.stateT * 20) !== Math.floor((this.stateT - dt) * 20)) {
          ctx.vfx.sparks(this.focusPoint(new THREE.Vector3()).setY(this.pos.y + 2.2 + this.hover), 2, '#8aff9a', 1.5);
        }
        if (this.stateT > dur) this.setState('strike');
        break;
      }
      case 'strike': {
        pose = WITCH_THROW;
        rate = 18;
        if (!this.hitDone) {
          this.hitDone = true;
          if (this.spell === 'bolt') this.castBolt(ctx);
          else if (this.spell === 'thorns') this.eruptThorns(ctx);
          else if (this.inArc(ctx, 2.2, 2)) this.strikePlayer(ctx, 12, false);
        }
        if (this.stateT > 0.45) {
          this.setState('recover');
          this.cooldown = 1.4 + ctx.rng() * 1.4;
        }
        break;
      }
      case 'recover':
        this.vel.multiplyScalar(Math.exp(-5 * dt));
        if (this.stateT > 0.7) this.setState('chase');
        break;
      case 'stagger':
        this.vel.multiplyScalar(Math.exp(-5 * dt));
        pose = { spine: [-0.5, 0.3, 0], head: [-0.5, 0, 0], shoulderL: [-0.6, 0, 1.2], shoulderR: [-0.6, 0, -1.2], rootY: -0.1 };
        rate = 18;
        if (this.stateT > 0.8) {
          if (this.blinkCd <= 0) this.blink(ctx);
          this.setState('chase');
        }
        break;
      case 'dead':
        this.vel.multiplyScalar(Math.exp(-5 * dt));
        pose = track(
          [
            [0, { spine: [-0.6, 0, 0], head: [-0.6, 0, 0], shoulderL: [-2, 0, 0.8], shoulderR: [-2, 0, -0.8] }],
            [1, { hipL: [-1.4, 0, 0.1], hipR: [-1.4, 0, -0.1], kneeL: [2.2, 0, 0], kneeR: [2.2, 0, 0], spine: [1.2, 0, 0], head: [0.6, 0, 0], rootY: -0.62, rootPitch: 0.7 }],
          ],
          Math.min(1, this.stateT / 1.2),
        );
        if (this.stateT < dt * 1.5) {
          ctx.vfx.sparks(this.focusPoint(new THREE.Vector3()), 30, '#7aff8a', 6);
          ctx.vfx.dust(this.pos, 16, 1, '#1a3a24');
          ctx.bus.emit({ type: 'enemy-dead', pos: this.pos.clone(), kind: 'witch' });
        }
        if (this.stateT > 2.5) this.group.scale.setScalar(Math.max(0.01, 1 - (this.stateT - 2.5)));
        if (this.stateT > 3.5) this.removed = true;
        break;
      default:
        break;
    }
    this.anim.apply(pose, dt, rate);
    this.updateBolts(dt, ctx);
  }

  private updateBolts(dt: number, ctx: EnemyCtx): void {
    const pp = ctx.player.pos;
    for (let i = this.bolts.length - 1; i >= 0; i -= 1) {
      const b = this.bolts[i];
      b.life -= dt;
      if (b.homing > 0) {
        b.homing -= dt;
        const want = new THREE.Vector3(pp.x, pp.y + 1.1, pp.z).sub(b.pos).normalize().multiplyScalar(12);
        b.vel.lerp(want, 1 - Math.exp(-3 * dt));
      }
      b.pos.addScaledVector(b.vel, dt);
      b.mesh.position.copy(b.pos);
      b.mesh.scale.setScalar(1 + Math.sin(b.life * 30) * 0.15);
      if (Math.floor(b.life * 30) % 2 === 0) ctx.vfx.sparks(b.pos, 1, '#6aff7a', 0.6);
      const hit = b.pos.distanceTo(new THREE.Vector3(pp.x, pp.y + 1.1, pp.z)) < 0.85;
      const ground = b.pos.y < ctx.nav.path.samples[Math.max(0, ctx.player.pathIndex)].pos.y - 0.5;
      if (hit) this.strikePlayer(ctx, 16, false);
      if (hit || b.life <= 0 || ground) {
        ctx.vfx.sparks(b.pos, 14, '#8aff8a', 5);
        b.mesh.removeFromParent();
        b.mesh.material.dispose();
        this.bolts.splice(i, 1);
      }
    }
    for (let i = this.spikes.length - 1; i >= 0; i -= 1) {
      const s = this.spikes[i];
      s.t += dt;
      const rise = s.t < 0.15 ? s.t / 0.15 : s.t < 1.1 ? 1 : Math.max(0, 1 - (s.t - 1.1) / 0.4);
      s.group.children.forEach((c) => (c.position.y = -1.4 + rise * 1.7));
      if (!s.hit && s.t > 0.05 && s.t < 0.3 && Math.hypot(pp.x - s.group.position.x, pp.z - s.group.position.z) < 2.1) {
        s.hit = true;
        this.strikePlayer(ctx, 22, true);
      }
      if (s.t > 1.6) {
        s.group.removeFromParent();
        this.spikes.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const b of this.bolts) b.mesh.removeFromParent();
    for (const s of this.spikes) s.group.removeFromParent();
  }
}

// ============================================================================ Vharoth, the Ash-Drake

type DrakeAttack = 'bite' | 'breath' | 'tail' | 'buffet' | 'flight';

type Wing = {
  side: number;
  root: THREE.Group;
  bones: THREE.Mesh[];
  membrane: THREE.Mesh;
};

const UP = new THREE.Vector3(0, 1, 0);

export class AshDrake extends Enemy {
  private readonly body = new THREE.Group();
  private readonly neck: THREE.Group[] = [];
  private readonly tail: THREE.Group[] = [];
  private readonly head = new THREE.Group();
  private readonly jaw = new THREE.Group();
  private readonly mouth = new THREE.Object3D();
  private readonly legs: Array<{ hip: THREE.Group; knee: THREE.Group; foot: THREE.Group; front: boolean; side: number }> = [];
  private readonly wings: Wing[] = [];
  private readonly scaleMat: THREE.MeshStandardMaterial;
  private readonly throatMat: THREE.MeshStandardMaterial;
  private readonly eyeMat: THREE.MeshStandardMaterial;
  readonly fireLight = new THREE.PointLight('#ff7a30', 0, 30, 1.6);
  private attack: DrakeAttack = 'bite';
  private walkPhase = 0;
  private fold = 1;
  private flap = 0;
  private flapPhase = 0;
  private jawOpen = 0;
  private fly = 0;
  private headYaw = 0;
  private headPitch = 0;
  private bodyPitch = 0;
  private breathYaw = 0;
  private tickT = 0;
  private flightT = 0;
  private readonly flightFrom = new THREE.Vector3();
  private readonly flightTo = new THREE.Vector3();
  private sinceFlight = 0;
  phase2 = false;
  flying = false;
  perch = new THREE.Vector3();
  landAt = new THREE.Vector3();
  onPhase2: (() => void) | null = null;
  onRoar: (() => void) | null = null;
  private readonly tmpA = new THREE.Vector3();

  constructor() {
    super('Vharoth, the Ash-Drake', 'dragon', 2600, 3.4, 420, 0);
    const tex = dragonScales();
    this.scaleMat = retro(new THREE.MeshStandardMaterial({ map: tex.map, emissiveMap: tex.glow, emissive: '#ff6a20', emissiveIntensity: 0.9, roughness: 0.6, metalness: 0.2 }));
    this.throatMat = new THREE.MeshStandardMaterial({ color: '#200400', emissive: '#ff7a20', emissiveIntensity: 0.5 });
    this.eyeMat = new THREE.MeshStandardMaterial({ color: '#200800', emissive: '#ffb030', emissiveIntensity: 4 });
    const bone = Mats().bone;
    const horn = retro(new THREE.MeshStandardMaterial({ color: '#2a2420', roughness: 0.7 }));
    this.group.add(this.body);
    this.body.position.y = 3.4;
    // Torso and belly.
    const torso = new THREE.SphereGeometry(1, 20, 14);
    torso.scale(2.0, 1.75, 4.1);
    this.body.add(mesh(torso, this.scaleMat));
    const belly = new THREE.SphereGeometry(1, 16, 10);
    belly.scale(1.65, 1.3, 3.6);
    this.body.add(mesh(belly, bone, 0, -0.55, 0.2));
    this.body.add(mesh(new THREE.SphereGeometry(1.5, 14, 10).scale(1.2, 1, 1.1), this.scaleMat, 0, 0.3, 2.9));
    for (let i = 0; i < 9; i += 1) this.body.add(mesh(new THREE.ConeGeometry(0.28, 1.3 - i * 0.05, 5), horn, 0, 1.65, 3 - i * 0.75, -0.5));
    // Neck: chain of segments rising from the chest.
    let parent: THREE.Object3D = this.body;
    for (let i = 0; i < 6; i += 1) {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? 0.9 : 0, i === 0 ? 3.4 : 0.92);
      parent.add(seg);
      const r = 1.05 - i * 0.07;
      seg.add(mesh(new THREE.SphereGeometry(r, 12, 9).scale(1, 0.95, 1.25), this.scaleMat, 0, 0, 0.5));
      seg.add(mesh(new THREE.ConeGeometry(0.18, 0.8, 5), horn, 0, r * 0.95, 0.4, -0.6));
      this.neck.push(seg);
      parent = seg;
    }
    // Head: long skull, hinged jaw, horns, glowing eyes, burning throat.
    this.head.position.set(0, 0, 1.1);
    this.head.scale.setScalar(1.35);
    parent.add(this.head);
    const skull = latheG([[0.0001, -0.3], [0.62, 0], [0.7, 0.5], [0.58, 1.2], [0.4, 1.9], [0.16, 2.4], [0.0001, 2.5]], 14).rotateX(Math.PI / 2);
    skull.scale(1, 0.72, 1);
    this.head.add(mesh(skull, this.scaleMat, 0, 0.1, 0));
    this.head.add(mesh(new THREE.SphereGeometry(0.42, 10, 8), this.throatMat, 0, -0.25, 0.5));
    this.jaw.position.set(0, -0.2, 0.15);
    this.head.add(this.jaw);
    const jawG = latheG([[0.0001, -0.2], [0.5, 0], [0.48, 0.7], [0.32, 1.5], [0.12, 2.2], [0.0001, 2.3]], 12).rotateX(Math.PI / 2);
    jawG.scale(0.95, 0.35, 1);
    this.jaw.add(mesh(jawG, this.scaleMat, 0, -0.08, 0));
    for (let i = 0; i < 8; i += 1) {
      for (const sx of [-1, 1]) {
        const z = 0.5 + i * 0.22;
        const w = 0.42 - i * 0.04;
        this.head.add(mesh(new THREE.ConeGeometry(0.045, 0.22, 4), bone, sx * w, -0.12, z, Math.PI));
        this.jaw.add(mesh(new THREE.ConeGeometry(0.04, 0.18, 4), bone, sx * (w - 0.04), 0.08, z));
      }
    }
    for (const sx of [-1, 1]) {
      this.head.add(mesh(new THREE.SphereGeometry(0.09, 8, 6), this.eyeMat, sx * 0.42, 0.28, 0.9));
      this.head.add(mesh(new THREE.ConeGeometry(0.1, 0.5, 5), horn, sx * 0.45, 0.42, 0.8, -0.9, 0, sx * -0.3));
      const hc = new THREE.CatmullRomCurve3([
        new THREE.Vector3(sx * 0.4, 0.45, 0.2),
        new THREE.Vector3(sx * 0.7, 0.9, -0.6),
        new THREE.Vector3(sx * 0.8, 1.1, -1.6),
        new THREE.Vector3(sx * 0.6, 1.5, -2.4),
      ]);
      this.head.add(mesh(new THREE.TubeGeometry(hc, 14, 0.12, 6), horn));
      this.head.add(mesh(new THREE.ConeGeometry(0.12, 0.7, 5), horn, sx * 0.6, -0.1, -0.1, 0.4, 0, sx * 1.4));
    }
    this.mouth.position.set(0, -0.1, 2.3);
    this.head.add(this.mouth);
    this.head.add(this.fireLight);
    this.fireLight.position.set(0, 0, 3);
    // Tail.
    parent = this.body;
    for (let i = 0; i < 12; i += 1) {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? 0.1 : 0, i === 0 ? -3.6 : -1.0);
      parent.add(seg);
      const r = 0.95 - i * 0.07;
      seg.add(mesh(new THREE.SphereGeometry(Math.max(0.12, r), 10, 8).scale(1, 0.9, 1.3), this.scaleMat, 0, 0, -0.5));
      seg.add(mesh(new THREE.ConeGeometry(0.16, 0.7 - i * 0.03, 5), horn, 0, Math.max(0.12, r) * 0.9, -0.4, -0.6));
      this.tail.push(seg);
      parent = seg;
    }
    parent.add(mesh(new THREE.ConeGeometry(0.5, 1.6, 4).scale(1, 1, 0.25), horn, 0, 0, -1.4, -Math.PI / 2));
    // Legs.
    for (const front of [true, false]) {
      for (const side of [-1, 1]) {
        const hip = new THREE.Group();
        hip.position.set(side * 1.6, -0.6, front ? 2.3 : -2.2);
        this.body.add(hip);
        hip.add(mesh(new THREE.SphereGeometry(0.75, 10, 8), this.scaleMat));
        hip.add(mesh(limb(0.55, 0.38, 1.6, 10), this.scaleMat));
        const knee = new THREE.Group();
        knee.position.y = -1.6;
        hip.add(knee);
        knee.add(mesh(limb(0.38, 0.28, 1.3, 9), this.scaleMat));
        const foot = new THREE.Group();
        foot.position.y = -1.35;
        knee.add(foot);
        foot.add(mesh(new THREE.SphereGeometry(0.4, 9, 7).scale(1.1, 0.5, 1.4), this.scaleMat, 0, -0.1, 0.25));
        for (let c = -1; c <= 1; c += 1) foot.add(mesh(new THREE.ConeGeometry(0.09, 0.55, 5), bone, c * 0.22, -0.18, 0.75, Math.PI / 2 + 0.4));
        this.legs.push({ hip, knee, foot, front, side });
      }
    }
    // Wings.
    const memMat = new THREE.MeshStandardMaterial({ color: '#2e0c0a', emissive: '#4a0c04', emissiveIntensity: 0.2, side: THREE.DoubleSide, roughness: 0.8, transparent: true, opacity: 0.92 });
    for (const side of [-1, 1]) {
      const root = new THREE.Group();
      root.position.set(side * 1.3, 1.2, 1.6);
      this.body.add(root);
      const bones: THREE.Mesh[] = [];
      for (let b = 0; b < 6; b += 1) {
        const bm = new THREE.Mesh(new THREE.CylinderGeometry(b < 2 ? 0.22 : 0.09, b < 2 ? 0.18 : 0.04, 1, 6), horn);
        bm.castShadow = true;
        bm.userData.keep = true;
        root.add(bm);
        bones.push(bm);
      }
      const mg = new THREE.BufferGeometry();
      mg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3 * 3), 3));
      const membrane = new THREE.Mesh(mg, memMat);
      membrane.castShadow = true;
      membrane.frustumCulled = false;
      membrane.userData.keep = true;
      root.add(membrane);
      this.wings.push({ side, root, bones, membrane });
    }
    this.group.traverse((o) => {
      const me = o as THREE.Mesh;
      if (me.isMesh) me.castShadow = true;
    });
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(9, 14).rotateX(-Math.PI / 2), Mats().contactShadow);
    sh.position.y = 0.05;
    this.group.add(sh);
    bakeMeshes(this.body);
    this.state = 'dormant';
  }

  focusPoint(t: THREE.Vector3): THREE.Vector3 {
    return t.copy(this.pos).setY(this.pos.y + this.body.position.y + 0.6);
  }

  mouthWorld(t: THREE.Vector3): THREE.Vector3 {
    return this.mouth.getWorldPosition(t);
  }

  protected onStagger(): void {
    this.flash = 1;
  }

  takeHit(hit: HitInfo): void {
    if (this.flying) return;
    super.takeHit(hit);
    if (!this.phase2 && this.hp < this.maxHp * 0.5 && this.alive) {
      this.phase2 = true;
      this.onPhase2?.();
    }
  }

  /** Bone placement between two points (wing rig). */
  private setBone(m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
    const d = this.tmpA.subVectors(b, a);
    const len = d.length();
    m.position.copy(a).addScaledVector(d, 0.5);
    m.quaternion.setFromUnitVectors(UP, d.divideScalar(Math.max(1e-4, len)));
    m.scale.set(1, len, 1);
  }

  private updateWings(): void {
    const f = this.fold;
    for (const w of this.wings) {
      const s = w.side;
      const L = (x: number, y: number, z: number) => new THREE.Vector3(x * s, y, z);
      const lerpV = (a: THREE.Vector3, b: THREE.Vector3) => a.lerp(b, f);
      const S = new THREE.Vector3(0, 0, 0);
      const E = lerpV(L(3.6, 0.8, -0.4), L(1.2, 0.9, -1.4));
      const W = lerpV(L(7.4, 1.2, 0.4), L(1.9, 0.3, -3.8));
      const tipsSpread = [L(13.5, 1.0, -0.8), L(12.5, 0.4, -4.2), L(10, 0.0, -6.8), L(6.6, -0.2, -8.2)];
      const tipsFold = [L(2.4, 0.4, -7.2), L(2.5, -0.5, -6.8), L(2.4, -1.3, -6.0), L(2.2, -1.8, -4.8)];
      const tips = tipsSpread.map((t, i) => t.lerp(tipsFold[i], f));
      const B = L(0.6 + f * 1.2, -0.4 - f * 0.8, -5.0);
      // Flap: rotate everything about the root's Z axis, scaled by distance from the body.
      const flap = this.flap * s;
      const rot = (p: THREE.Vector3) => {
        const k = Math.min(1, Math.abs(p.x) / 6);
        const a = flap * (0.6 + 0.4 * k);
        const c = Math.cos(a);
        const sn = Math.sin(a);
        return new THREE.Vector3(p.x * c - p.y * sn, p.x * sn + p.y * c, p.z);
      };
      const e = rot(E);
      const wr = rot(W);
      const t = tips.map(rot);
      this.setBone(w.bones[0], S, e);
      this.setBone(w.bones[1], e, wr);
      for (let i = 0; i < 4; i += 1) this.setBone(w.bones[2 + i], wr, t[i]);
      const tri = [
        [S, e, B], [e, wr, B], [wr, t[3], B], [wr, t[2], t[3]], [wr, t[1], t[2]], [wr, t[0], t[1]], [S, e, wr], [wr, t[3], B],
      ];
      const attr = w.membrane.geometry.attributes.position as THREE.BufferAttribute;
      tri.forEach((tr, i) => {
        for (let k = 0; k < 3; k += 1) {
          // Scalloped trailing edge: pull finger-to-finger midpoints inward slightly.
          const p = tr[k];
          attr.setXYZ(i * 3 + k, p.x, p.y, p.z);
        }
      });
      attr.needsUpdate = true;
      w.membrane.geometry.computeVertexNormals();
    }
  }

  private headTowards(ctx: EnemyCtx, dt: number, extraYaw = 0, pitchTarget = 0): void {
    const { ang } = this.toPlayer(ctx);
    const rel = clamp(wrapAngle(ang - this.yaw) + extraYaw, -1.4, 1.4);
    this.headYaw = damp(this.headYaw, rel, 5, dt);
    this.headPitch = damp(this.headPitch, pitchTarget, 4, dt);
  }

  protected think(dt: number, time: number, ctx: EnemyCtx): void {
    const { d, ang } = this.toPlayer(ctx);
    const relAng = Math.abs(wrapAngle(ang - this.yaw));
    const spd = this.phase2 ? 1.25 : 1;
    this.sinceFlight += dt;
    this.scaleMat.emissiveIntensity = 0.7 + (this.phase2 ? 0.6 + Math.sin(time * 3) * 0.3 : 0) + this.flash * 2;
    let walk = 0;
    let foldTarget = 1;
    let flapAmp = 0;
    let jawTarget = 0.05 + Math.max(0, Math.sin(time * 0.7)) * 0.05;
    let throat = 0.4;
    let bodyPitchTarget = 0;
    let pitchTarget = -0.1;
    this.fireLight.intensity = damp(this.fireLight.intensity, 0, 6, dt);
    switch (this.state) {
      case 'dormant':
        // Perched on the great skull, wings half-mantled.
        foldTarget = 0.7;
        flapAmp = 0.05;
        pitchTarget = 0.25;
        this.headTowards(ctx, dt, 0, 0.25);
        break;
      case 'emerge': {
        // Intro: roar, take off from the perch, glide down into the arena.
        const t = this.stateT;
        this.headTowards(ctx, dt, 0, -0.3);
        if (t < 1.8) {
          jawTarget = 0.9;
          throat = 2;
          bodyPitchTarget = -0.3;
          foldTarget = 0.3;
          if (t < dt * 1.5) this.onRoar?.();
        } else {
          const k = clamp((t - 1.8) / 3.2, 0, 1);
          foldTarget = 0;
          flapAmp = 0.7;
          const e = k * k * (3 - 2 * k);
          this.pos.lerpVectors(this.perch, this.landAt, e);
          this.fly = (1 - e) * (this.perch.y - this.landAt.y) + Math.sin(e * Math.PI) * 6;
          this.yaw = dampAngle(this.yaw, Math.atan2(this.landAt.x - this.perch.x, this.landAt.z - this.perch.z), 3, dt);
          if (k >= 1) {
            this.fly = 0;
            ctx.vfx.dust(this.pos, 40, 6, '#5a4a40');
            ctx.vfx.ring(this.pos, 1, 14, 0.8, '#ffb060', 'shock');
            ctx.shake(0.8);
            ctx.bus.emit({ type: 'slam', pos: this.pos.clone(), radius: 6 });
            this.pathIndex = -1;
            this.setState('chase');
          }
        }
        break;
      }
      case 'chase': {
        this.headTowards(ctx, dt);
        this.yaw = dampAngle(this.yaw, ang, 1.4 * spd, dt);
        const sp = d > 9 ? 4.2 * spd : 0;
        this.vel.set(Math.sin(this.yaw) * sp, 0, Math.cos(this.yaw) * sp);
        walk = sp / 4;
        if (walk > 0 && Math.floor(this.walkPhase / Math.PI) !== Math.floor((this.walkPhase + dt * 5.5) / Math.PI)) {
          ctx.shake(0.12);
          ctx.bus.emit({ type: 'footstep', pos: this.pos.clone(), heavy: true });
        }
        if (this.cooldown <= 0 && ctx.player.state !== 'dead') {
          const r = ctx.rng();
          let next: DrakeAttack | null = null;
          if ((this.phase2 && this.sinceFlight > 18) || this.sinceFlight > 34) next = 'flight';
          else if (relAng > 1.9 && d < 11) next = 'tail';
          else if (d < 5.5 && relAng < 1.2) next = r < 0.45 ? 'buffet' : 'bite';
          else if (d < 9 && relAng < 1) next = r < 0.55 ? 'bite' : 'breath';
          else if (d < 16 && relAng < 0.8 && r < 0.6) next = 'breath';
          if (next) {
            this.attack = next;
            this.setState('telegraph');
            this.vel.set(0, 0, 0);
            ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: `dragon-${next}` });
          }
        }
        break;
      }
      case 'telegraph': {
        this.vel.multiplyScalar(Math.exp(-6 * dt));
        const durs: Record<DrakeAttack, number> = { bite: 0.6, breath: 1.05, tail: 0.55, buffet: 0.5, flight: 0.8 };
        if (this.attack !== 'tail') this.yaw = dampAngle(this.yaw, ang, 2.2, dt);
        if (this.attack === 'bite') {
          this.headTowards(ctx, dt, 0, 0.35);
          jawTarget = 0.7;
        } else if (this.attack === 'breath') {
          this.headTowards(ctx, dt, 0, 0.55);
          bodyPitchTarget = -0.25;
          jawTarget = 0.3;
          throat = 1 + this.stateT * 5;
          this.breathYaw = -0.55;
          if (Math.floor(this.stateT * 12) !== Math.floor((this.stateT - dt) * 12)) ctx.vfx.sparks(this.mouthWorld(new THREE.Vector3()), 3, '#ffb050', 2);
        } else if (this.attack === 'tail') {
          for (const [i, s] of this.tail.entries()) s.rotation.y = damp(s.rotation.y, 0.12 * (i < 6 ? 1 : 0.5), 6, dt);
        } else if (this.attack === 'buffet') {
          foldTarget = 0.35;
          bodyPitchTarget = -0.2;
        } else {
          foldTarget = 0.1;
          walk = 0;
          bodyPitchTarget = 0.15;
        }
        if (this.stateT > durs[this.attack] / spd) {
          this.setState('strike');
          this.tickT = 0;
          ctx.bus.emit({ type: 'enemy-attack', pos: this.pos.clone(), kind: `dragon-${this.attack}` });
          if (this.attack === 'flight') {
            this.flying = true;
            this.flightT = 0;
            this.flightFrom.copy(this.pos);
            const dir = ctx.player.pos.clone().sub(this.pos).setY(0).normalize();
            this.flightTo.copy(ctx.player.pos).addScaledVector(dir, 22);
          }
        }
        break;
      }
      case 'strike':
        this.strike(dt, time, ctx, d);
        foldTarget = this.attack === 'flight' ? 0 : this.attack === 'buffet' ? 0 : 1;
        flapAmp = this.attack === 'flight' ? 0.85 : this.attack === 'buffet' ? 1.2 : 0;
        jawTarget = this.attack === 'bite' ? (this.stateT < 0.15 ? 0.9 : 0.05) : this.attack === 'breath' || this.attack === 'flight' ? 0.85 : 0.1;
        throat = this.attack === 'breath' || this.attack === 'flight' ? 5 : 0.5;
        pitchTarget = this.attack === 'bite' ? -0.1 : this.attack === 'breath' ? 0.45 : this.attack === 'flight' ? 0.9 : 0;
        break;
      case 'recover':
        this.vel.multiplyScalar(Math.exp(-4 * dt));
        this.headTowards(ctx, dt, 0, -0.05);
        this.fly = damp(this.fly, 0, 4, dt);
        if (this.stateT > this.recoverTime) this.setState('chase');
        break;
      case 'stagger':
        this.vel.multiplyScalar(Math.exp(-4 * dt));
        jawTarget = 0.6;
        pitchTarget = 0.7;
        bodyPitchTarget = 0.12;
        this.headPitch = damp(this.headPitch, 0.8, 3, dt);
        if (this.stateT > 2.6) this.setState('chase');
        break;
      case 'dead': {
        this.vel.multiplyScalar(Math.exp(-3 * dt));
        foldTarget = 0.2;
        jawTarget = 0.5;
        throat = Math.max(0, 2 - this.stateT);
        this.fly = damp(this.fly, -1.9, 1.2, dt);
        this.headPitch = damp(this.headPitch, 0.6, 1.5, dt);
        bodyPitchTarget = 0.05;
        this.eyeMat.emissiveIntensity = Math.max(0, 4 - this.stateT * 1.4);
        this.scaleMat.emissiveIntensity = Math.max(0, 1.2 - this.stateT * 0.3);
        if (this.stateT < dt * 1.5) {
          ctx.vfx.sparks(this.focusPoint(new THREE.Vector3()), 60, '#ffa040', 12);
          ctx.vfx.impact(this.focusPoint(new THREE.Vector3()), 2.5, '#ff9040');
          ctx.bus.emit({ type: 'enemy-dead', pos: this.pos.clone(), kind: 'dragon' });
        }
        if (this.stateT > 1.5 && this.stateT - dt <= 1.5) {
          ctx.vfx.dust(this.pos, 50, 7, '#4a3a30');
          ctx.shake(0.9);
          ctx.bus.emit({ type: 'slam', pos: this.pos.clone(), radius: 8 });
        }
        break;
      }
      default:
        break;
    }
    if (this.state === 'strike') this.headPitch = damp(this.headPitch, pitchTarget, 4, dt);
    // ---------------------------------------------------------- procedural animation
    this.fold = damp(this.fold, foldTarget, 4, dt);
    this.flapPhase += dt * (flapAmp > 0.5 ? 6.5 : 3);
    this.flap = Math.sin(this.flapPhase) * flapAmp * 0.9 + (1 - this.fold) * 0.15;
    if (flapAmp > 0.5 && Math.floor(this.flapPhase / (Math.PI * 2)) !== Math.floor((this.flapPhase - dt * 6.5) / (Math.PI * 2))) {
      ctx.bus.emit({ type: 'enemy-telegraph', pos: this.pos.clone(), kind: 'dragon-flap' });
    }
    this.jawOpen = damp(this.jawOpen, jawTarget, 12, dt);
    this.jaw.rotation.x = this.jawOpen * 0.75;
    this.throatMat.emissiveIntensity = damp(this.throatMat.emissiveIntensity, throat, 6, dt);
    this.bodyPitch = damp(this.bodyPitch, bodyPitchTarget, 3, dt);
    this.walkPhase += dt * walk * 5.5;
    const breathe = Math.sin(time * 1.4) * 0.03;
    this.body.position.y = 3.4 + this.fly + Math.abs(Math.sin(this.walkPhase)) * 0.12 * walk + breathe;
    this.body.rotation.x = this.bodyPitch + (this.flying ? -0.1 : 0);
    this.body.rotation.z = Math.sin(this.walkPhase) * 0.04 * walk + (this.flying ? Math.sin(time * 1.3) * 0.12 : 0);
    this.body.scale.set(1 + breathe * 0.5, 1 + breathe, 1);
    // Neck curve: rises from the chest, then distributes the look direction.
    const n = this.neck.length;
    this.neck.forEach((seg, i) => {
      seg.rotation.x = (i === 0 ? -0.95 : i < 3 ? -0.05 : 0.32) + this.headPitch * 0.18 + Math.sin(time * 1.1 + i * 0.4) * 0.02;
      seg.rotation.y = (this.headYaw / n) * 1.2;
    });
    this.head.rotation.x = 0.45 + this.headPitch * 0.4;
    // Tail sway.
    this.tail.forEach((seg, i) => {
      if (this.state === 'telegraph' && this.attack === 'tail') return;
      if (!(this.state === 'strike' && this.attack === 'tail')) seg.rotation.y = Math.sin(time * 1.2 - i * 0.45) * 0.06 * (1 + i * 0.1);
      seg.rotation.x = (i === 0 ? -0.22 : i < 5 ? 0.04 : 0.02) + (this.state === 'dead' ? 0.02 : 0);
    });
    // Legs: diagonal gait; tuck while flying.
    for (const leg of this.legs) {
      const off = (leg.front ? 0 : Math.PI) + (leg.side > 0 ? 0 : Math.PI);
      const s = Math.sin(this.walkPhase + off);
      const tuck = clamp(this.fly / 4, 0, 1);
      leg.hip.rotation.x = s * 0.5 * walk + (leg.front ? -0.25 : 0.35) * (1 - tuck) + tuck * (leg.front ? -0.9 : 1.1) - this.bodyPitch * (leg.front ? 1 : -0.4);
      leg.knee.rotation.x = (leg.front ? 0.55 : -0.7) * (1 - tuck) + Math.max(0, Math.cos(this.walkPhase + off)) * 0.5 * walk * (leg.front ? 1 : -1) + tuck * (leg.front ? 1.4 : -1.4);
      leg.foot.rotation.x = -leg.hip.rotation.x - leg.knee.rotation.x;
    }
    this.updateWings();
  }

  private recoverTime = 1.2;

  private endAttack(ctx: EnemyCtx, recover: number): void {
    this.recoverTime = recover / (this.phase2 ? 1.25 : 1);
    this.setState('recover');
    this.cooldown = (this.phase2 ? 0.6 : 1.1) + ctx.rng();
  }

  private breathTick(ctx: EnemyCtx, dt: number, damage: number, groundTarget?: THREE.Vector3): void {
    const mouth = this.mouthWorld(new THREE.Vector3());
    const space = this.group.parent;
    if (space) space.worldToLocal(mouth);
    const dir = groundTarget
      ? groundTarget.clone().sub(mouth).normalize()
      : new THREE.Vector3(Math.sin(this.yaw + this.headYaw * 0.9), -0.32, Math.cos(this.yaw + this.headYaw * 0.9)).normalize();
    // Flames.
    for (let i = 0; i < 6; i += 1) {
      const v = dir.clone().multiplyScalar(16 + ctx.rng() * 8).add(new THREE.Vector3((ctx.rng() - 0.5) * 3, (ctx.rng() - 0.5) * 2, (ctx.rng() - 0.5) * 3));
      ctx.vfx.flame(mouth, v);
    }
    this.fireLight.intensity = 60;
    // Damage: player within the cone.
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = 0.22;
      const pp = ctx.player.pos;
      const to = new THREE.Vector3(pp.x - mouth.x, pp.y + 1 - mouth.y, pp.z - mouth.z);
      const dist = to.length();
      const cos = to.normalize().dot(dir);
      if (dist < 15 && cos > 0.9) {
        const landed = ctx.player.takeHit({ damage, poise: 0, from: this.pos.clone(), heavy: false, noStagger: true });
        if (landed) ctx.shake(0.12);
      }
    }
  }

  private strike(dt: number, time: number, ctx: EnemyCtx, d: number): void {
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    switch (this.attack) {
      case 'bite': {
        const k = this.stateT / 0.4;
        this.vel.copy(fwd).multiplyScalar(k < 0.5 ? 9 : 0);
        this.headPitch = damp(this.headPitch, -0.2, 10, dt);
        if (!this.hitDone && k > 0.25) {
          const head = this.head.getWorldPosition(new THREE.Vector3());
          this.group.parent?.worldToLocal(head);
          if (head.setY(ctx.player.pos.y).distanceTo(ctx.player.pos) < 3.6 || (d < 6 && Math.abs(wrapAngle(Math.atan2(ctx.player.pos.x - this.pos.x, ctx.player.pos.z - this.pos.z) - this.yaw)) < 0.5)) {
            this.hitDone = true;
            this.strikePlayer(ctx, 30, true);
          }
        }
        if (this.stateT > 0.55) this.endAttack(ctx, 1.0);
        break;
      }
      case 'breath': {
        const dur = 2.4;
        const k = this.stateT / dur;
        this.breathYaw = -0.6 + k * 1.2;
        this.headYaw = damp(this.headYaw, this.breathYaw, 6, dt);
        this.breathTick(ctx, dt, 8);
        if (this.stateT > dur) this.endAttack(ctx, 1.4);
        break;
      }
      case 'tail': {
        const k = Math.min(1, this.stateT / 0.55);
        this.yaw += dt * 5.2 * (k < 1 ? 1 : 0);
        this.tail.forEach((seg, i) => (seg.rotation.y = -0.25 * Math.sin(k * Math.PI) * (1 + i * 0.05)));
        if (!this.hitDone && k > 0.3 && d < 11.5) {
          this.hitDone = true;
          this.strikePlayer(ctx, 30, true);
        }
        if (this.stateT > 0.8) this.endAttack(ctx, 1.2);
        break;
      }
      case 'buffet': {
        if (!this.hitDone && this.stateT > 0.1) {
          this.hitDone = true;
          ctx.vfx.dust(this.pos.clone().addScaledVector(fwd, 4), 30, 4, '#5a4a40');
          ctx.vfx.ring(this.pos.clone().addScaledVector(fwd, 3), 1, 9, 0.5, '#d0c0a0', 'shock');
          ctx.shake(0.4);
          if (d < 7.5) this.strikePlayer(ctx, 14, true);
        }
        if (this.stateT > 0.7) this.endAttack(ctx, 0.9);
        break;
      }
      case 'flight': {
        this.flightT += dt;
        const up = 1.6;
        const run = 2.6;
        const t = this.flightT;
        this.vel.set(0, 0, 0);
        if (t < up) {
          this.fly = damp(this.fly, 11, 2.5, dt);
          this.yaw = dampAngle(this.yaw, Math.atan2(this.flightTo.x - this.flightFrom.x, this.flightTo.z - this.flightFrom.z), 3, dt);
          if (t < dt * 1.5) ctx.vfx.dust(this.pos, 30, 5, '#5a4a40');
          // Mark the strafing line on the ground.
          if (Math.floor(t * 6) !== Math.floor((t - dt) * 6)) {
            const k = (Math.floor(t * 6) + 1) / 10;
            ctx.vfx.ring(this.flightFrom.clone().lerp(this.flightTo, k), 2.6, 2.6, up - t + run * k, '#ff5a2a', 'marker');
          }
        } else if (t < up + run) {
          const k = (t - up) / run;
          this.pos.lerpVectors(this.flightFrom, this.flightTo, k);
          this.fly = 9 + Math.sin(k * Math.PI) * 1.5;
          const ground = this.pos.clone().addScaledVector(fwd, 3);
          this.breathTick(ctx, dt, 12, ground);
          if (Math.floor(t * 10) !== Math.floor((t - dt) * 10)) ctx.vfx.ring(ground, 0.5, 3, 0.5, '#ff8a3a', 'shock');
          const pp = ctx.player.pos;
          if (Math.hypot(pp.x - ground.x, pp.z - ground.z) < 3 && Math.floor(t * 4) !== Math.floor((t - dt) * 4)) {
            ctx.player.takeHit({ damage: 14, poise: 0, from: ground.clone(), heavy: false, noStagger: true });
          }
        } else {
          this.fly = damp(this.fly, 0, 3.5, dt);
          if (this.fly < 0.3) {
            this.fly = 0;
            this.flying = false;
            this.sinceFlight = 0;
            this.pathIndex = -1;
            ctx.vfx.dust(this.pos, 40, 6, '#5a4a40');
            ctx.vfx.ring(this.pos, 1, 12, 0.7, '#ffb060', 'shock');
            ctx.shake(0.7);
            ctx.bus.emit({ type: 'slam', pos: this.pos.clone(), radius: 5 });
            if (d < 6) this.strikePlayer(ctx, 24, true);
            this.endAttack(ctx, 1.6);
          }
        }
        void time;
        break;
      }
    }
  }

  reset(): void {
    this.hp = this.maxHp;
    this.alive = true;
    this.phase2 = false;
    this.flying = false;
    this.poise = this.maxPoise;
    this.state = 'dormant';
    this.stateT = 0;
    this.removed = false;
    this.fly = 0;
    this.sinceFlight = 0;
    this.eyeMat.emissiveIntensity = 4;
    this.waves.length = 0;
  }

  wake(): void {
    this.setState('emerge');
  }

  /** Scripted fly-by (not part of combat): wings beating, jaw agape. */
  cinematicFly(dt: number, time: number, pos: THREE.Vector3, yaw: number): void {
    this.pos.copy(pos);
    this.group.rotation.y = yaw;
    this.fold = damp(this.fold, 0, 3, dt);
    this.flapPhase += dt * 5;
    this.flap = Math.sin(this.flapPhase) * 0.8;
    this.fly = 0;
    this.jaw.rotation.x = 0.4 + Math.sin(time * 2) * 0.2;
    this.body.position.y = 3.4;
    this.body.rotation.z = Math.sin(time * 0.8) * 0.15;
    this.tail.forEach((seg, i) => (seg.rotation.y = Math.sin(time * 1.5 - i * 0.4) * 0.08));
    for (const leg of this.legs) {
      leg.hip.rotation.x = leg.front ? -0.9 : 1.1;
      leg.knee.rotation.x = leg.front ? 1.4 : -1.4;
    }
    this.updateWings();
  }
}

/** Pose helper re-export for witches that need a shared look. */
export const witchIdle = (t: number): Pose => ({ ...idle(t, { hunch: 0.3 }), ...locomotion(0, 0) });
export { dome };
