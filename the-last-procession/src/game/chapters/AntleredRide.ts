import * as THREE from 'three';
import { toonMat } from '../../world/Compat2';
import { Chapter } from '../Chapter';
import { dollyShot, fixedShot, followShot, orbitShot, trackShot } from '../Camera';
import { Antlered, Carillon, Pilgrim } from '../../world/Colossus';
import { Horse } from '../../actors/Horse';
import { Actor } from '../../actors/Actor';
import { Birds, fogBank } from '../../world/Props';
import { makeMountainRing, makeTerrain, makeTrees } from '../../world/Compat';
import { Shockwaves, Telegraph } from '../Hazards';
import { G, merge, xf, bellGeo } from '../../world/Compat';
import { stoneTexture } from '../../gfx/Materials';
import { groundTexture } from '../../world/Compat2';
import { clamp, damp, fbm, V3 } from '../../util/math';

const RAVINE = [930, 944];
const RIDGE = 1180;
const HALF = 26; // playable corridor half-width

interface Obstacle {
  x: number;
  z: number;
  r: number;
  kind: 'rock' | 'log';
  mesh: THREE.Object3D;
  hit: boolean;
}

interface Rider {
  horse: Horse;
  char: Actor;
  x: number;
  z: number;
  speed: number;
  state: 'chase' | 'windup' | 'strike' | 'fall' | 'gone';
  t: number;
  side: number;
}

function terrainH(x: number, z: number): number {
  const corridor = Math.max(0, Math.abs(x) - HALF) / 60;
  let h = Math.sin(z * 0.006) * 4 + fbm(x * 0.01, z * 0.01, 3) * 3 + Math.min(1, corridor) * fbm(x * 0.004, z * 0.004, 4) * 30 + corridor * corridor * 0.8;
  if (z > RAVINE[0] && z < RAVINE[1]) h -= 40 * Math.min(1, Math.min(z - RAVINE[0], RAVINE[1] - z) / 2);
  if (z > RIDGE - 60) h += (z - (RIDGE - 60)) * 0.12;
  return h;
}

// ============================================================================
// CHAPTER TWO — BENEATH THE ANTLERED
// ============================================================================
export class AntleredRide extends Chapter {
  static meta = { num: 'Chapter Two', title: 'Beneath the Antlered', subtitle: 'Ride under a walking mountain.' };
  readonly id = 'ride';
  readonly num = AntleredRide.meta.num;
  readonly title = AntleredRide.meta.title;
  readonly subtitle = AntleredRide.meta.subtitle;
  readonly checkpoints = ['intro', 'ride', 'beneath', 'ravine', 'ridge'];
  stag!: Antlered;
  far!: Carillon;
  pilgrimFar!: Pilgrim;
  horse!: Horse;
  waves!: Shockwaves;
  private obstacles: Obstacle[] = [];
  private riders: Rider[] = [];
  private hoofTele: Telegraph[] = [];
  private birds!: Birds;
  // horse state
  private hp = V3();
  private hvy = 0;
  private air = false;
  private hSpeed = 15;
  private stumble = 0;
  private strikeT = -1;
  private slowmo = 0;
  private slowmoDone = false;

  build(): void {
    this.addLeviathan(new THREE.Vector3(0, 0, 700), 1000, 420);
    this.addSeraph(new THREE.Vector3(300, 0, 900), 520, 1);
    const tex = groundTexture('#a88f5a', '#6c5a36', 21, 260);
    const terrain = makeTerrain({
      size: 3200,
      seg: 200,
      center: new THREE.Vector2(0, 700),
      height: terrainH,
      color: (x, z, h) => {
        const road = Math.abs(x + Math.sin(z * 0.01) * 3) < 5;
        if (road) return new THREE.Color('#b59a72');
        const n = fbm(x * 0.02, z * 0.02, 2);
        return new THREE.Color().setHSL(0.13 + n * 0.03 + Math.max(0, h) * 0.0012, 0.45, 0.46 + n * 0.08 - Math.max(0, -h) * 0.01);
      },
      map: tex,
      grass: (x, z) => (Math.abs(x + Math.sin(z * 0.01) * 3) < 6 || (z > RAVINE[0] - 2 && z < RAVINE[1] + 2) ? 0 : 1),
      grassColor: '#7a7a34',
    });
    this.group.add(terrain.mesh);
    this.addGrass(terrain, { root: '#5a5a24', tip: '#e6cc7a', patch: '#a8b858', height: 1.1, flowers: ['#ffffff', '#f4c840', '#d86a8a'] });
    const treePts: THREE.Vector3[] = [];
    for (let i = 0; i < 140; i++) {
      const z = -100 + ((i * 0.618) % 1) * 1500;
      const side = i % 2 ? 1 : -1;
      const x = side * (40 + ((i * 0.37) % 1) * 300);
      treePts.push(V3(x, terrainH(x, z), z));
    }
    this.group.add(makeTrees(treePts, { leaf: '#4e6b34', trunk: '#4a3020' }, 1.6));
    this.group.add(makeMountainRing(2400, 30, 620, '#6d6a8c', 2));
    this.group.add(fogBank(14, V3(0, 60, 1400), V3(2600, 80, 400), 700, '#ffe2b8', 0.25));
    // standing bell-shrines along the road: human-scale landmarks
    const stone = toonMat({ map: stoneTexture('#c9b896', 4, 5), roughness: 0.9 });
    const bronze = toonMat({ color: '#b88a3a', metalness: 0.85, roughness: 0.35 });
    const shrines: THREE.BufferGeometry[] = [];
    const bells: THREE.BufferGeometry[] = [];
    for (let z = 60; z < 1100; z += 130) {
      for (const side of [-1, 1]) {
        const x = side * (HALF + 6);
        const y = terrainH(x, z);
        shrines.push(xf(G.box(1.2, 7, 1.2), [x - 1.6, y + 3.5, z]), xf(G.box(1.2, 7, 1.2), [x + 1.6, y + 3.5, z]), xf(G.box(4.8, 0.9, 1.6), [x, y + 7.3, z]));
        bells.push(xf(bellGeo(0.8), [x, y + 5.2, z]));
      }
    }
    const sm = new THREE.Mesh(merge(shrines), stone);
    const bm = new THREE.Mesh(merge(bells), bronze);
    sm.castShadow = bm.castShadow = true;
    this.group.add(sm, bm);

    // obstacles: boulders and fallen logs
    const rockGeo = merge([xf(new THREE.DodecahedronGeometry(1.2, 0), [0, 0.6, 0], [0.2, 0.4, 0], [1.2, 0.8, 1])]);
    const rockMat = toonMat({ map: stoneTexture('#9a8e7e', 6, 3), roughness: 0.95, flatShading: true });
    const logGeo = xf(G.cyl(0.55, 0.55, 9, 8), [0, 0.55, 0], [0, 0, Math.PI / 2]);
    const logMat = toonMat({ color: '#5a4030', roughness: 1 });
    const place = (kind: 'rock' | 'log', x: number, z: number) => {
      const mesh = new THREE.Mesh(kind === 'rock' ? rockGeo : logGeo, kind === 'rock' ? rockMat : logMat);
      mesh.position.set(x, terrainH(x, z), z);
      mesh.rotation.y = kind === 'log' ? (x > 0 ? 0.2 : -0.2) : x;
      mesh.castShadow = true;
      this.group.add(mesh);
      this.obstacles.push({ x, z, r: kind === 'rock' ? 1.6 : 4.5, kind, mesh, hit: false });
    };
    const pattern: [string, number, number][] = [
      ['rock', 0, 120], ['rock', -8, 150], ['log', 6, 185], ['rock', 12, 215], ['log', -6, 250], ['rock', 4, 290], ['rock', -12, 300],
      ['log', 0, 360], ['rock', 9, 420], ['rock', -5, 470], ['log', -4, 540], ['rock', 14, 600], ['log', 5, 660], ['rock', -9, 720],
      ['log', 0, 790], ['rock', 7, 850], ['rock', -3, 880], ['log', 7, 1010], ['rock', -10, 1050], ['log', -2, 1090],
    ];
    for (const [k, x, z] of pattern) place(k as 'rock' | 'log', x, z);

    this.horse = new Horse();
    this.group.add(this.horse.root);
    this.horse.onHoof = () => this.g.audio.sfx('hoof', 0.6, 0.9 + Math.random() * 0.2);
    this.stag = new Antlered();
    this.group.add(this.stag.root);
    this.stag.onStomp = (p) => this.onStomp(p);
    this.far = new Carillon(true);
    this.far.root.position.set(1500, 0, 2100);
    this.far.heading = -2.6;
    this.far.walk = this.far.walkTarget = 1;
    this.pilgrimFar = new Pilgrim(true);
    this.pilgrimFar.root.position.set(-700, 0, -1200);
    this.pilgrimFar.heading = 0.4;
    this.pilgrimFar.walk = this.pilgrimFar.walkTarget = 1;
    this.group.add(this.far.root, this.pilgrimFar.root);
    this.waves = new Shockwaves(this.g, this.group);
    for (let i = 0; i < 4; i++) {
      const t = new Telegraph('#ff5a2a');
      this.hoofTele.push(t);
      this.group.add(t.group);
    }
    this.birds = new Birds(30, V3(0, 0, 600), 300, 70);
    this.group.add(this.birds.mesh);
  }

  ground(x: number, z: number): number {
    return terrainH(x, z);
  }

  private onStomp(p: THREE.Vector3): void {
    p.y = terrainH(p.x, p.z);
    const d = Math.hypot(p.x - this.hp.x, p.z - this.hp.z);
    this.g.cam.shake(Math.min(1, 90 / (d + 40)));
    this.g.audio.sfx('stomp', Math.min(1, 200 / (d + 60)), 0.8 + Math.random() * 0.2);
    this.g.particles.stompDust(p, 14);
    if (this.heroActive && d < 140) this.waves.spawn(p, d + 12, 30);
    if (this.heroActive && d < 13 && !this.air) this.hit(2, p);
  }

  private hit(n: number, from: THREE.Vector3): void {
    if (this.hero.invuln > 0) return;
    this.hero.resolve = Math.max(0, this.hero.resolve - n);
    this.hero.invuln = 1.2;
    this.stumble = 0.6;
    this.g.audio.sfx('hurt');
    this.g.cam.shake(0.4);
    this.g.particles.impactDust(this.hp.clone(), 1);
    void from;
  }

  tick(dt: number): void {
    this.stag.update(dt, this.time);
    this.far.update(dt, this.time);
    this.pilgrimFar.update(dt, this.time);
    this.horse.update(dt);
    this.birds.update(dt, this.time);
    this.waves.update(dt, null);
    this.stag.legs.forEach((_, i) => {
      const pr = this.stag.predictLanding(i);
      const t = this.hoofTele[i];
      if (pr && this.heroActive && Math.abs(pr.pos.z - this.hp.z) < 120) t.show(pr.pos.x, terrainH(pr.pos.x, pr.pos.z), pr.pos.z, 12, pr.progress, this.time);
      else t.hide();
    });
    for (const r of this.riders) this.updateRiderVisual(r, dt);
    // dust behind the gallop
    if (this.horse.speed > 5 && Math.random() < 0.7 && !this.air) this.g.particles.emit('dust', this.hp.clone().add(V3(0, 0.3, -1.2)), 1, { color: '#cdb28a', size: 1.6, sizeEnd: 2.6, life: 1.2, speed: 1.2, alpha: 0.4 });
    this.focus.copy(this.hp);
  }

  /** Seat Kael (and Lyra) on the horse each frame. */
  private seat(): void {
    this.horse.root.updateMatrixWorld(true);
    const s = this.horse.saddle.getWorldPosition(new THREE.Vector3());
    const b = this.horse.pillion.getWorldPosition(new THREE.Vector3());
    const yaw = this.horse.root.rotation.y;
    const k = this.hero.char;
    k.root.position.copy(s).add(V3(0, -0.6, 0));
    k.yaw = k.targetYaw = yaw;
    k.groundY = this.hp.y;
    this.lyra.root.position.copy(b).add(V3(0, -0.55, 0));
    this.lyra.yaw = this.lyra.targetYaw = yaw;
    this.lyra.groundY = this.hp.y;
    this.hero.pos.copy(k.root.position);
  }

  private spawnRider(side: number, behind = 40): void {
    const horse = new Horse('#2e2420', '#111', '#8c1f24');
    const char = new Actor('warden');
    char.attachWeapon('halberd');
    char.setMode('ride', 0);
    this.group.add(horse.root, char.root);
    this.riders.push({ horse, char, x: side * 12, z: this.hp.z - behind, speed: this.hSpeed + 6, state: 'chase', t: 0, side });
  }

  private clearRiders(): void {
    for (const r of this.riders) {
      r.horse.root.removeFromParent();
      r.char.root.removeFromParent();
    }
    this.riders = [];
  }

  private updateRiders(dt: number): void {
    for (const r of this.riders) {
      r.t += dt;
      const targetX = this.hp.x + r.side * 2.6;
      const targetZ = this.hp.z + 0.4;
      switch (r.state) {
        case 'chase': {
          r.speed = this.hSpeed + clamp((targetZ - r.z) * 0.9, -6, 9);
          r.x += (targetX - r.x) * damp(1.4, dt);
          if (Math.abs(targetZ - r.z) < 2 && Math.abs(targetX - r.x) < 1.2 && r.t > 2) {
            r.state = 'windup';
            r.t = 0;
            r.char.setMode('raise', 0.2);
            this.g.audio.sfx('creak', 0.5, 2);
          }
          break;
        }
        case 'windup':
          r.speed = this.hSpeed + (targetZ - r.z) * 2;
          r.x += (targetX - r.x) * damp(3, dt);
          r.char.setGlow(1.4 + r.t * 5);
          if (r.t > 0.9) {
            r.state = 'strike';
            r.t = 0;
            r.char.attackVariant = r.side > 0 ? 1 : 0;
            r.char.setMode('attack', 0.05);
            this.g.audio.sfx('swing', 1.1, 0.7);
          }
          break;
        case 'strike':
          r.speed = this.hSpeed;
          if (r.t > 0.12 && r.t < 0.2 && Math.abs(r.x - this.hp.x) < 3.6 && Math.abs(r.z - this.hp.z) < 3.2 && !this.air) {
            this.hit(1, V3(r.x, 0, r.z));
            r.t = 0.2;
          }
          if (r.t > 0.4) {
            r.state = 'chase';
            r.t = 0;
            r.char.setMode('ride', 0.2);
            r.char.setGlow(1.4);
            r.side *= Math.random() < 0.5 ? -1 : 1;
          }
          break;
        case 'fall':
          r.speed *= Math.exp(-dt * 1.5);
          r.x += r.side * dt * 6;
          if (r.t > 3) r.state = 'gone';
          break;
        case 'gone':
          r.horse.root.visible = false;
          r.char.root.visible = false;
          break;
      }
      r.z += r.speed * dt;
      // Kael's sword
      if (this.strikeT > 0.08 && this.strikeT < 0.26 && (r.state === 'chase' || r.state === 'windup' || r.state === 'strike') && Math.abs(r.x - this.hp.x) < 4.2 && Math.abs(r.z - this.hp.z) < 3.6) {
        r.state = 'fall';
        r.t = 0;
        r.char.setMode('dead', 0.1);
        this.g.audio.sfx('clang', 1, 0.8);
        this.g.audio.sfx('hit', 1);
        this.g.particles.sparks(V3(r.x, this.hp.y + 2, r.z));
        this.g.cam.shake(0.3);
        this.g.timeScale = 0.25;
        setTimeout(() => (this.g.timeScale = this.slowmo > 0 ? 0.45 : 1), 180);
      }
    }
  }

  private updateRiderVisual(r: Rider, dt: number): void {
    if (r.state === 'gone') return;
    const y = terrainH(r.x, r.z);
    r.horse.root.position.set(r.x, y, r.z);
    r.horse.root.rotation.y = r.state === 'fall' ? r.side * 0.6 : 0;
    r.horse.speed = r.speed;
    r.horse.update(dt);
    r.horse.root.updateMatrixWorld(true);
    const s = r.horse.saddle.getWorldPosition(new THREE.Vector3());
    if (r.state === 'fall') {
      r.char.root.position.lerp(V3(r.x + r.side * 2, y, r.z - 2), damp(3, dt));
    } else r.char.root.position.copy(s).add(V3(0, -0.6, 0));
    r.char.yaw = r.char.targetYaw = r.horse.root.rotation.y;
    r.char.groundY = y;
    r.char.update(dt, this.time);
  }

  private resetHorse(z: number, x = 0): void {
    this.hp.set(x, terrainH(x, z), z);
    this.hvy = 0;
    this.air = false;
    this.hSpeed = 15;
    this.stumble = 0;
    this.strikeT = -1;
    this.horse.root.position.copy(this.hp);
    this.horse.root.rotation.set(0, 0, 0);
    this.horse.speed = this.hSpeed;
    this.horse.jump = 0;
    this.hero.object.visible = true;
    this.lyra.root.visible = true;
    this.hero.char.setMode('ride', 0);
    this.lyra.setMode('ride', 0);
    this.heroActive = false; // horse drives position, not the on-foot controller
    this.seat();
    for (const o of this.obstacles) o.hit = false;
  }

  /** Horse controller: auto-gallop with steer, spur, rein, jump and strike. */
  private ride(dt: number): void {
    const input = this.g.input;
    const mv = input.move;
    const want = 15 + mv.y * 4.5 - (this.stumble > 0 ? 7 : 0);
    this.hSpeed += (want - this.hSpeed) * damp(2.5, dt);
    this.stumble = Math.max(0, this.stumble - dt);
    this.hero.invuln = Math.max(0, this.hero.invuln - dt);
    const lateral = -mv.x * 10;
    this.hp.x = clamp(this.hp.x + lateral * dt, -HALF, HALF);
    this.hp.z += this.hSpeed * dt;
    const gy = terrainH(this.hp.x, this.hp.z);
    if (!this.air && input.consume('jump')) {
      this.hvy = 9.5;
      this.air = true;
      this.g.audio.sfx('jump', 1.2);
      this.g.audio.sfx('hoof', 1);
    }
    if (this.air) {
      this.hvy -= 24 * dt;
      this.hp.y += this.hvy * dt;
      this.horse.jump = clamp(1 - this.hvy / 9.5, 0.01, 1) * 0.5;
      if (this.hp.y <= gy && this.hvy < 0) {
        this.hp.y = gy;
        this.air = false;
        this.horse.jump = 0;
        this.g.audio.sfx('land', 1);
        this.g.particles.impactDust(this.hp.clone(), 0.8);
      }
    } else {
      // follow terrain; fall into the ravine if we drove into it
      if (gy < this.hp.y - 1.5) {
        this.air = true;
        this.hvy = 0;
      } else this.hp.y = gy;
    }
    if (input.consume('attack') && this.strikeT < 0) {
      this.strikeT = 0;
      this.hero.char.attackVariant = this.hero.char.attackVariant ? 0 : 1;
      this.hero.char.setMode('attack', 0.05);
      this.g.audio.sfx('swing', 1, 1.1);
    }
    if (this.strikeT >= 0) {
      this.strikeT += dt;
      if (this.strikeT > 0.4) {
        this.strikeT = -1;
        this.hero.char.setMode('ride', 0.15);
      }
    }
    // obstacles
    for (const o of this.obstacles) {
      if (o.hit) continue;
      const dz = Math.abs(o.z - this.hp.z);
      const dx = Math.abs(o.x - this.hp.x);
      const clear = this.hp.y - terrainH(this.hp.x, this.hp.z) > 1.0;
      if (dz < 1.4 && dx < o.r && !clear) {
        o.hit = true;
        this.hit(1, V3(o.x, 0, o.z));
        this.g.audio.sfx('crash', 0.7);
      }
    }
    this.horse.root.position.copy(this.hp);
    this.horse.root.rotation.y = clamp(-mv.x * 0.25, -0.3, 0.3);
    this.horse.root.rotation.z = mv.x * 0.06;
    this.horse.speed = this.hSpeed;
    this.hero.char.body.visible = this.hero.invuln <= 0 || Math.floor(this.hero.invuln * 14) % 2 === 0;
    this.seat();
    // shockwave contact (only when grounded)
    this.checkWaves();
  }

  private checkWaves(): void {
    const w = this.waves as unknown as { waves: { c: THREE.Vector3; r: number; hit: boolean }[] };
    for (const wave of w.waves) {
      if (wave.hit) continue;
      const d = Math.hypot(this.hp.x - wave.c.x, this.hp.z - wave.c.z);
      if (Math.abs(d - wave.r) < 1.2 && !this.air) {
        wave.hit = true;
        this.hit(1, wave.c);
      }
    }
  }

  private chaseCam(label = 'ride-chase'): void {
    this.cut(followShot({ target: () => this.hp, yaw: () => 0, distance: 10, height: 3.8, lookHeight: 2.6, lookAhead: 14, fov: 62, lag: 0.08 }), 0, label);
  }

  private nextHoofDanger(): boolean {
    let danger = false;
    this.stag.legs.forEach((_, i) => {
      const pr = this.stag.predictLanding(i);
      if (pr && pr.progress > 0.3 && Math.abs(pr.pos.x - this.hp.x) < 13 && pr.pos.z - this.hp.z > -10 && pr.pos.z - this.hp.z < 25) danger = true;
    });
    return danger;
  }

  async script(from: string): Promise<void> {
    const ui = this.g.ui;
    const audio = this.g.audio;
    const S = this.stag;
    this.sky('goldenPlains');
    audio.setAmbience('wind', 0.5);

    if (this.reached(from, 'intro')) {
      this.checkpoint('intro');
      this.cinematic(true);
      ui.setFadeInstant(1);
      this.music('ride');
      this.resetHorse(-20);
      this.hSpeed = 0;
      this.horse.speed = 0;
      S.root.position.set(-260, 0, 260);
      S.heading = 1.2;
      S.walk = S.walkTarget = 1;
      this.cut(dollyShot(V3(30, 4, -60), V3(14, 3, -40), V3(0, 3, -20), V3(-120, 140, 240), 7, 44, 38), 0, 'open-plains');
      this.go(this.fadeIn(1.4));
      await this.card(this.num, this.title, 'The Kestrel Plains, half a day east of Aurel', 3);
      await this.wait(1.5);
      this.cut(fixedShot(() => this.hp.clone().add(V3(2.2, 2.6, 3.4)), () => this.hp.clone().add(V3(0, 2.4, -0.3)), 34), 0, 'riders-close');
      await this.say('LYRA', "That one's different. It has a forest on its back. And houses. Someone used to <i>live</i> there.");
      await this.say('KAEL', "The Antlered. It slept outside my village my whole life. We climbed its hooves for dares.");
      await this.say('KAEL', "Twenty years it never moved. Now it's crossing the plains to find you.");
      await this.say('LYRA', '...Should I apologize to it?');
      this.cut(dollyShot(() => this.hp.clone().add(V3(-6, 1, 18)), () => this.hp.clone().add(V3(-4, 1.5, 14)), () => this.hp.clone().add(V3(0, 2, 0)), () => this.hp.clone().add(V3(0, 2, 0)), 3, 50, 46), 0, 'riders-front');
      await this.say('KAEL', 'Riders. Bellwardens, behind us. Hold on — <i>hyah!</i>');
    }

    if (this.reached(from, 'ride')) {
      this.music('ride');
      audio.intensity = 0.9;
      await this.segment(
        'ride',
        () => {
          this.clearRiders();
          this.waves.clear();
          this.resetHorse(0);
          S.root.position.set(-210, 0, 120);
          S.heading = 1.1;
          S.walk = S.walkTarget = 1;
          S.speed = 11;
          this.slowmoDone = false;
          ui.objective('Outrun the Bellwardens');
          this.chaseCam();
          this.spawnRider(1, 30);
          this.spawnRider(-1, 55);
        },
        (dt) => {
          this.ride(dt);
          this.updateRiders(dt);
          ui.progress(this.hp.z / RIDGE);
          const near = this.riders.find((r) => (r.state === 'chase' || r.state === 'windup') && Math.abs(r.z - this.hp.z) < 5);
          const rock = this.obstacles.find((o) => !o.hit && o.z - this.hp.z > 0 && o.z - this.hp.z < 22 && Math.abs(o.x - this.hp.x) < o.r + 1);
          if (rock) ui.prompt('jump', rock.kind === 'log' ? 'Jump the log' : 'Jump', true);
          else if (near) ui.prompt('attack', near.state === 'windup' ? 'Strike first!' : 'Strike', near.state === 'windup');
          else ui.prompt(null);
          // cinematic: a low tracking shot when riders draw level
          const L = this.g.cam.label;
          if (L === 'ride-chase' && near && this.g.cam.modeTime > 3) {
            this.cut(trackShot(() => this.hp, V3(-9, 1.4, 4), V3(0, 2, 0), 48, 0.08, () => this.hp.clone().add(V3(0, 2.2, 2))), 0, 'ride-side');
          } else if (L === 'ride-side' && this.g.cam.modeTime > 3.2) this.chaseCam('ride-chase');
          return this.hp.z > 330 ? 'win' : undefined;
        },
        { onFoot: false },
      );
    }

    if (this.reached(from, 'beneath')) {
      this.music('ride');
      audio.intensity = 1;
      await this.segment(
        'beneath',
        () => {
          this.clearRiders();
          this.waves.clear();
          this.resetHorse(330);
          // the stag swings onto the road ahead and keeps walking: we ride in under it
          S.root.position.set(0, 0, 420);
          S.heading = 0;
          S.speed = 9;
          S.walk = S.walkTarget = 1;
          this.slowmo = 0;
          this.slowmoDone = false;
          ui.objective('Ride between its legs');
          this.cut(dollyShot(V3(30, 70, 520), V3(20, 60, 500), () => this.hp.clone(), () => this.hp.clone().add(V3(0, 10, 60)), 3.2, 48, 44), 0, 'stag-wide');
        },
        (dt) => {
          this.ride(dt);
          ui.progress(this.hp.z / RIDGE);
          const L = this.g.cam.label;
          if (L === 'stag-wide' && this.g.cam.modeTime > 3) this.chaseCam('ride-chase');
          // beneath the belly: slow motion, camera looking up
          const rel = this.hp.z - S.root.position.z;
          if (!this.slowmoDone && Math.abs(rel) < 20 && Math.abs(this.hp.x) < 14) {
            this.slowmoDone = true;
            this.slowmo = 2.4;
            this.g.timeScale = 0.45;
            audio.sfx('choir', 0.8);
            audio.sfx('bell', 0.6, 0.6);
            this.cut(trackShot(() => this.hp, V3(6, 0.8, 8), V3(0, 2, 0), 74, 0.05, () => this.hp.clone().lerp(S.spine.getWorldPosition(new THREE.Vector3()), 0.6)), 0, 'belly');
          }
          if (this.slowmo > 0) {
            this.slowmo -= this.g.realDt;
            this.g.pipeline.grade.uniforms.uDesat.value = 0.25;
            if (this.slowmo <= 0) {
              this.g.timeScale = 1;
              this.g.pipeline.grade.uniforms.uDesat.value = 0;
              this.chaseCam('ride-chase');
            }
          }
          if (this.nextHoofDanger()) ui.prompt('move', 'Steer clear of the hoof', true);
          else ui.prompt(null);
          return this.hp.z > 760 ? 'win' : undefined;
        },
        { onFoot: false },
      );
      this.g.timeScale = 1;
      this.g.pipeline.grade.uniforms.uDesat.value = 0;
    }

    if (this.reached(from, 'ravine')) {
      this.music('ride');
      await this.segment(
        'ravine',
        () => {
          this.clearRiders();
          this.waves.clear();
          this.resetHorse(760);
          S.root.position.set(-60, 0, 900);
          S.heading = 0.5;
          S.speed = 10;
          ui.objective('Leap the ravine');
          this.chaseCam();
          this.spawnRider(-1, 25);
          this.spawnRider(1, 45);
        },
        (dt) => {
          this.ride(dt);
          this.updateRiders(dt);
          ui.progress(this.hp.z / RIDGE);
          const toGap = RAVINE[0] - this.hp.z;
          const near = this.riders.find((r) => (r.state === 'chase' || r.state === 'windup') && Math.abs(r.z - this.hp.z) < 5);
          if (toGap > 0 && toGap < 22) ui.prompt('jump', 'Leap!', true);
          else if (near) ui.prompt('attack', 'Strike', near.state === 'windup');
          else ui.prompt(null);
          const L = this.g.cam.label;
          if (toGap > 0 && toGap < 40 && L === 'ride-chase') {
            this.cut(trackShot(() => this.hp, V3(-14, 2, 6), V3(0, 1, 0), 52, 0.06, () => this.hp.clone().add(V3(0, 0, 8))), 0, 'ravine-side');
          } else if (L === 'ravine-side' && this.hp.z > RAVINE[1] + 25) this.chaseCam('ride-chase');
          if (this.hp.y < terrainH(0, 0) - 18) return 'fail';
          return this.hp.z > RIDGE - 40 ? 'win' : undefined;
        },
        { onFoot: false },
      );
    }

    // ---------------------------------------------------------------- the ridge at dusk
    this.checkpoint('ridge');
    this.cinematic(true);
    this.clearRiders();
    this.music('campfire');
    this.sky('dusk', 4);
    audio.setAmbience('wind', 0.3);
    const rz = RIDGE - 20;
    this.resetHorse(rz);
    this.horse.speed = 0;
    this.hSpeed = 0;
    this.stage(V3(-1.5, terrainH(-1.5, rz + 4), rz + 4), 0.3, V3(1.2, terrainH(1.2, rz + 4.5), rz + 4.5), 0.1);
    this.hero.char.setMode('idle');
    this.lyra.setMode('idle');
    this.horse.root.position.set(-5, terrainH(-5, rz), rz);
    this.horse.root.rotation.y = 0.5;
    S.root.position.set(220, 0, rz + 520);
    S.heading = 0.9;
    S.walk = S.walkTarget = 1;
    this.cut(dollyShot(V3(-4, terrainH(-4, rz - 8) + 2.4, rz - 8), V3(-3, terrainH(-3, rz - 6) + 2.0, rz - 5), V3(0, 2, rz + 6), () => S.root.position.clone().add(V3(0, 100, 0)), 8, 44, 40), 0, 'ridge-back');
    await this.wait(3);
    this.cut(fixedShot(V3(-3.2, terrainH(0, rz + 4) + 1.9, rz + 7.2), V3(0, terrainH(0, rz + 4) + 1.5, rz + 4.2), 36), 0, 'ridge-two');
    this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 1.4, 0));
    this.lyra.lookAtTarget = S.root.position.clone().add(V3(0, 100, 0));
    await this.say('LYRA', "It wasn't chasing us.");
    await this.say('KAEL', 'It felt like chasing.');
    await this.say('LYRA', "It was <i>following</i>. They all are. I can hear them, Kael — like a song with one note missing.");
    this.lyra.lookAtTarget = this.hero.char.root.position.clone().add(V3(0, 1.6, 0));
    await this.say('LYRA', 'And every one of them is turning toward the note.');
    await this.say('KAEL', '...Then we keep moving until someone tells us what the song is for.');
    this.cut(orbitShot(V3(0, terrainH(0, rz + 4) + 1, rz + 4), 22, 6, -0.4, 0.4, 8, 44, V3(0, 20, 120)), 1.5, 'ridge-orbit');
    await this.wait(5);
    await this.fadeOut(1.6);
  }

  dispose(): void {
    this.clearRiders();
    super.dispose();
  }
}
