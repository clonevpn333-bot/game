import * as THREE from 'three';
import type { Hero } from '../actors/Hero';
import type { Game } from './Game';
import { G, merge, xf } from '../render/Geo';
import { metalSet, stoneTexture } from '../render/Materials';

const ringGeo = new THREE.RingGeometry(0.86, 1, 48);
const discGeo = new THREE.CircleGeometry(1, 48);

/** Ground telegraph: a pulsing ring + fill that grows toward impact. */
export class Telegraph {
  readonly group = new THREE.Group();
  private readonly ring: THREE.Mesh;
  private readonly fill: THREE.Mesh;
  private readonly ringMat: THREE.MeshBasicMaterial;
  private readonly fillMat: THREE.MeshBasicMaterial;

  constructor(color: THREE.ColorRepresentation = '#ff5a2a') {
    this.ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.2), transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 });
    this.fillMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 });
    this.ring = new THREE.Mesh(ringGeo, this.ringMat);
    this.fill = new THREE.Mesh(discGeo, this.fillMat);
    this.ring.rotation.x = this.fill.rotation.x = -Math.PI / 2;
    this.group.add(this.ring, this.fill);
    this.group.renderOrder = 3;
    this.group.visible = false;
  }

  show(x: number, y: number, z: number, r: number, progress: number, time: number): void {
    this.group.visible = true;
    this.group.position.set(x, y + 0.08, z);
    this.ring.scale.setScalar(r);
    this.fill.scale.setScalar(r * Math.min(1, progress));
    const pulse = 0.55 + 0.45 * Math.sin(time * (8 + progress * 14));
    this.ringMat.opacity = 0.35 + 0.6 * pulse * Math.min(1, progress + 0.3);
    this.fillMat.opacity = 0.12 + progress * 0.3;
  }

  hide(): void {
    this.group.visible = false;
  }
}

interface Rock {
  mesh: THREE.Mesh;
  tele: Telegraph;
  target: THREE.Vector3;
  t: number;
  fall: number;
  r: number;
  landed: boolean;
  life: number;
}

let rockGeo: THREE.BufferGeometry | null = null;
function getRockGeo(): THREE.BufferGeometry {
  if (rockGeo) return rockGeo;
  const parts = [xf(new THREE.DodecahedronGeometry(1, 0), [0, 0, 0], [0.3, 0.2, 0], [1, 0.8, 1.1]), xf(new THREE.DodecahedronGeometry(0.6, 0), [0.7, 0.3, 0.2]), xf(G.box(0.8, 0.5, 1.2), [-0.5, -0.2, 0.3], [0.4, 0.3, 0])];
  rockGeo = merge(parts);
  return rockGeo;
}

/** Falling masonry with telegraphs; landed chunks become temporary obstacles. */
export class Debris {
  private readonly rocks: Rock[] = [];
  private readonly mat: THREE.MeshStandardMaterial;
  constructor(private readonly g: Game, private readonly parent: THREE.Object3D, stone = '#b9a58a') {
    this.mat = new THREE.MeshStandardMaterial({ map: stoneTexture(stone, 11, 4), roughness: 0.9, flatShading: true });
  }

  drop(target: THREE.Vector3, r = 2.4, fallTime = 1.4): void {
    const mesh = new THREE.Mesh(getRockGeo(), this.mat);
    mesh.scale.setScalar(r * 0.8);
    mesh.castShadow = true;
    const tele = new Telegraph();
    this.parent.add(mesh, tele.group);
    mesh.visible = false;
    this.rocks.push({ mesh, tele, target: target.clone(), t: 0, fall: fallTime, r, landed: false, life: 6 });
  }

  update(dt: number, hero: Hero | null, time: number, ground: (x: number, z: number) => number): void {
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const k = this.rocks[i];
      k.t += dt;
      const gy = ground(k.target.x, k.target.z);
      if (!k.landed) {
        const p = k.t / k.fall;
        k.tele.show(k.target.x, gy, k.target.z, k.r * 1.25, p, time);
        if (p > 0.45) {
          k.mesh.visible = true;
          const fp = (p - 0.45) / 0.55;
          k.mesh.position.set(k.target.x, gy + 70 * (1 - fp * fp) + k.r * 0.4, k.target.z);
          k.mesh.rotation.x += dt * 3;
          k.mesh.rotation.z += dt * 2;
        }
        if (p >= 1) {
          k.landed = true;
          k.tele.hide();
          k.mesh.position.y = gy + k.r * 0.35;
          this.g.particles.impactDust(k.mesh.position, k.r * 0.9);
          this.g.particles.sparks(k.mesh.position, '#ffcf8a', 6);
          const d = hero ? hero.pos.distanceTo(k.mesh.position) : 99;
          this.g.audio.sfx('crash', Math.min(1, 14 / (d + 4)));
          this.g.cam.shake(Math.min(0.5, 6 / (d + 6)));
          if (hero && d < k.r * 1.25 + 0.3) hero.damage(1, k.target);
        }
      } else {
        k.life -= dt;
        if (k.life < 1) k.mesh.position.y -= dt * k.r;
        if (k.life <= 0) {
          k.mesh.removeFromParent();
          k.tele.group.removeFromParent();
          this.rocks.splice(i, 1);
        }
      }
    }
  }

  /** Landed rocks block movement. */
  collide(p: THREE.Vector3, r: number): void {
    for (const k of this.rocks) {
      if (!k.landed || k.life < 1) continue;
      const dx = p.x - k.target.x;
      const dz = p.z - k.target.z;
      const d = Math.hypot(dx, dz);
      const min = k.r * 0.75 + r;
      if (d < min && d > 1e-4) {
        p.x = k.target.x + (dx / d) * min;
        p.z = k.target.z + (dz / d) * min;
      }
    }
  }

  clear(): void {
    for (const k of this.rocks) {
      k.mesh.removeFromParent();
      k.tele.group.removeFromParent();
    }
    this.rocks.length = 0;
  }
}

interface Wave {
  mesh: THREE.Mesh;
  c: THREE.Vector3;
  r: number;
  speed: number;
  max: number;
  hit: boolean;
}

/** Expanding ground shockwaves from giant footfalls: jump over them. */
export class Shockwaves {
  private readonly waves: Wave[] = [];
  private readonly mat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(1.6), transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
  private readonly geo = new THREE.TorusGeometry(1, 0.03, 4, 96);
  constructor(private readonly g: Game, private readonly parent: THREE.Object3D) {}

  spawn(c: THREE.Vector3, max = 60, speed = 22): void {
    const mesh = new THREE.Mesh(this.geo, this.mat.clone());
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(c).setY(c.y + 0.5);
    this.parent.add(mesh);
    this.waves.push({ mesh, c: c.clone(), r: 1, speed, max, hit: false });
  }

  update(dt: number, hero: Hero | null): void {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const w = this.waves[i];
      const prev = w.r;
      w.r += w.speed * dt;
      w.mesh.scale.set(w.r, w.r, 1 + w.r * 0.02);
      (w.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - w.r / w.max);
      if (Math.random() < 0.5) {
        const a = Math.random() * Math.PI * 2;
        this.g.particles.emit('dust', new THREE.Vector3(w.c.x + Math.cos(a) * w.r, w.c.y + 0.4, w.c.z + Math.sin(a) * w.r), 1, { color: '#d8c4a4', size: 2.5, life: 1, speed: 1, alpha: 0.4 });
      }
      if (hero && !w.hit) {
        const d = Math.hypot(hero.pos.x - w.c.x, hero.pos.z - w.c.z);
        if (d >= prev - 0.6 && d <= w.r + 0.6 && hero.grounded) {
          w.hit = true;
          if (hero.damage(1, w.c)) {
            hero.vel.y = 6;
            hero.onGround = false;
          }
        }
      }
      if (w.r >= w.max) {
        w.mesh.removeFromParent();
        (w.mesh.material as THREE.Material).dispose();
        this.waves.splice(i, 1);
      }
    }
  }

  /** Is a wave about to reach the hero (for the JUMP prompt)? */
  incoming(hero: Hero): boolean {
    for (const w of this.waves) {
      const d = Math.hypot(hero.pos.x - w.c.x, hero.pos.z - w.c.z);
      if (!w.hit && d > w.r && d - w.r < 12) return true;
    }
    return false;
  }

  clear(): void {
    for (const w of this.waves) w.mesh.removeFromParent();
    this.waves.length = 0;
  }
}

export { metalSet };
