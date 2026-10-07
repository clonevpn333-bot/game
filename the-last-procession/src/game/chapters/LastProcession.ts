import * as THREE from 'three';
import { Chapter } from '../Chapter';
import { dollyShot, fixedShot, followShot, orbitShot, trackShot } from '../CameraDirector';
import { Antlered, Carillon, Pilgrim } from '../../world/Processional';
import { Character } from '../../actors/Character';
import { Debris, Shockwaves, Telegraph } from '../Hazards';
import { PlanetMachine } from './TheFall';
import { Birds, fogBank, makeBanner, makeGrass, makeMountainRing, makeTerrain, makeTrees, updateGrass, waveBanner } from '../../world/World';
import { G, bellGeo, merge, xf } from '../../render/Geo';
import { groundTexture, metalSet, toon } from '../../render/Materials';
import { clamp, damp, distXZ, easeInOut, fbm, V3 } from '../../utils/math';
import { hitStop } from '../../actors/Warden';

const GOAL_Z = 425;
const PALM = V3(0, 0, 452); // centre of the Pilgrim's open palm (duel arena)
const PALM_HALF = V3(9, 0, 8);
const PALM_Y = 2.6;

function fieldH(x: number, z: number): number {
  // gentle rolling field rising to low hills at the edges
  const ridge = Math.min(260, Math.max(0, Math.abs(x) - 160) * 0.22);
  return fbm(x * 0.006, z * 0.006, 3) * 3 + ridge + fbm(x * 0.002, z * 0.002, 3) * ridge * 0.6;
}

/** Two instanced armies locked in battle across the field. */
class Army {
  readonly group = new THREE.Group();
  private readonly bodies: THREE.InstancedMesh;
  private readonly spears: THREE.InstancedMesh;
  private readonly base: THREE.Vector3[] = [];
  private readonly ph: number[] = [];
  private readonly m = new THREE.Matrix4();
  constructor(count: number, color: string, origin: THREE.Vector3, facing: number, spreadX: number, depth: number) {
    const body = merge([xf(G.cyl(0.24, 0.32, 1.2, 6), [0, 0.6, 0]), xf(G.sph(0.2, 6, 5), [0, 1.45, 0]), xf(G.cone(0.26, 0.3, 6), [0, 1.66, 0])]);
    this.bodies = new THREE.InstancedMesh(body, toon(color), count);
    this.spears = new THREE.InstancedMesh(xf(G.box(0.05, 2.6, 0.05), [0.3, 1.4, 0.2], [0.3, 0, 0]), toon('#5a4030'), count);
    for (let i = 0; i < count; i++) {
      const x = origin.x + (((i * 0.6180339) % 1) - 0.5) * spreadX;
      const z = origin.z + (((i * 0.7548776) % 1) - 0.5) * depth;
      this.base.push(V3(x, fieldH(x, z), z));
      this.ph.push((i * 1.37) % 6.28);
    }
    this.bodies.castShadow = true;
    this.group.add(this.bodies, this.spears);
    this.group.userData.facing = facing;
    this.update(0);
  }
  update(time: number): void {
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    const f = this.group.userData.facing as number;
    this.base.forEach((b, i) => {
      const surge = Math.sin(time * 0.6 + b.x * 0.02) * 2;
      p.set(b.x + Math.sin(f) * surge, b.y + Math.abs(Math.sin(time * 6 + this.ph[i])) * 0.25, b.z + Math.cos(f) * surge);
      q.setFromAxisAngle(V3(0, 1, 0), f + Math.sin(time * 2 + this.ph[i]) * 0.3);
      this.m.compose(p, q, s);
      this.bodies.setMatrixAt(i, this.m);
      this.spears.setMatrixAt(i, this.m);
    });
    this.bodies.instanceMatrix.needsUpdate = true;
    this.spears.instanceMatrix.needsUpdate = true;
  }
}

type VState = 'idle' | 'approach' | 'windSlam' | 'slam' | 'windSweep' | 'sweep' | 'windToll' | 'toll' | 'recover' | 'stagger' | 'down';

// ============================================================================
// CHAPTER SEVEN — THE LAST PROCESSION
// ============================================================================
export class LastProcession extends Chapter {
  static meta = { num: 'Chapter Seven', title: 'The Last Procession', subtitle: 'The Field of Bells. Every giant in the world, arriving at once.' };
  readonly id = 'finale';
  readonly num = LastProcession.meta.num;
  readonly title = LastProcession.meta.title;
  readonly subtitle = LastProcession.meta.subtitle;
  readonly checkpoints = ['intro', 'battle', 'charge', 'duel', 'farewell', 'walk', 'epilogue'];
  pilgrim!: Pilgrim;
  stag!: Antlered;
  carillon!: Carillon;
  vesk!: Character;
  maren!: Character;
  guards: Character[] = [];
  debris!: Debris;
  waves!: Shockwaves;
  armies: Army[] = [];
  machine!: PlanetMachine;
  private palm!: THREE.Group;
  private hoofTele: Telegraph[] = [];
  private grassMat!: THREE.Material;
  private banners: THREE.Mesh[] = [];
  private birds!: Birds;
  private cracks!: THREE.Mesh;
  private nextShell = 0;
  private epilogue = new THREE.Group();
  // boss
  private vPos = V3();
  private vState: VState = 'idle';
  private vT = 0;
  private vHp = 12;
  private vLastHit = -1;
  private vTolls = 0;
  private vFacing = 0;
  private vCombo = 0;
  private sweepTele!: Telegraph;

  build(): void {
    const terrain = makeTerrain({
      size: 4200,
      seg: 160,
      center: new THREE.Vector2(0, 300),
      height: fieldH,
      color: (x, z, h) => {
        const n = fbm(x * 0.01, z * 0.01, 3);
        return new THREE.Color().setHSL(0.07 + n * 0.03 + Math.min(0.1, h * 0.0006), 0.38, 0.24 + n * 0.06 - Math.min(0.08, h * 0.0004));
      },
      map: groundTexture('#6a5038', '#3a2618', 31, 220),
    });
    this.group.add(terrain);
    // glowing fissures: the thing beneath is waking
    const crackParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 40; i++) {
      let x = (Math.sin(i * 12.9) * 0.5) * 300;
      let z = 60 + ((i * 0.618) % 1) * 420;
      let a = i * 2.1;
      for (let k = 0; k < 6; k++) {
        const len = 6 + (k % 3) * 4;
        crackParts.push(xf(G.box(0.5, 0.12, len), [x, fieldH(x, z) + 0.08, z], [0, a, 0]));
        x += Math.sin(a) * len * 0.9;
        z += Math.cos(a) * len * 0.9;
        a += Math.sin(i + k) * 0.9;
      }
    }
    this.cracks = new THREE.Mesh(merge(crackParts), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff4a1a').multiplyScalar(2) }));
    this.group.add(this.cracks);
    const grass = makeGrass(5000, (i) => {
      const x = (((i * 0.618) % 1) - 0.5) * 400;
      const z = -40 + ((i * 0.7548) % 1) * 560;
      return V3(x, fieldH(x, z), z);
    }, '#5a5030', '#d0a860', 1.0);
    this.grassMat = grass.mat;
    this.group.add(grass.mesh);
    // the Field of Bells: ancient bells on posts across the plain
    const bronze = metalSet('bronze');
    const posts: THREE.BufferGeometry[] = [];
    const bells: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 70; i++) {
      const x = (((i * 0.618) % 1) - 0.5) * 520;
      const z = -60 + ((i * 0.38197) % 1) * 600;
      if (Math.abs(x) < 14 && z < GOAL_Z) continue;
      const y = fieldH(x, z);
      posts.push(xf(G.box(0.6, 5, 0.6), [x - 1.4, y + 2.5, z]), xf(G.box(0.6, 5, 0.6), [x + 1.4, y + 2.5, z]), xf(G.box(3.6, 0.5, 0.7), [x, y + 5, z]));
      bells.push(xf(bellGeo(1), [x, y + 2.9, z]));
      if (i < 50) this.colliders.push({ x, z, r: 2 });
    }
    this.group.add(new THREE.Mesh(merge(posts), new THREE.MeshStandardMaterial({ color: '#4a3424', roughness: 0.95 })));
    const bm = new THREE.Mesh(merge(bells), bronze.trim);
    bm.castShadow = true;
    this.group.add(bm);
    this.group.add(makeMountainRing(2600, 30, 700, '#5a3a4a', 7));
    this.group.add(fogBank(20, V3(0, 60, 900), V3(3000, 120, 600), 600, '#e08060', 0.3));
    const treePts: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) treePts.push(V3((i % 2 ? 1 : -1) * (180 + (i * 37) % 200), 0, (i * 53) % 600));
    treePts.forEach((p) => (p.y = fieldH(p.x, p.z)));
    this.group.add(makeTrees(treePts, { leaf: '#5a4a2a', trunk: '#3a2a1a' }, 1.5));
    // armies
    this.armies.push(new Army(380, '#2a4a80', V3(-70, 0, 200), Math.PI / 2, 80, 160));
    this.armies.push(new Army(380, '#8c1f24', V3(70, 0, 200), -Math.PI / 2, 80, 160));
    for (const a of this.armies) this.group.add(a.group);
    for (const [x, z, c] of [[-40, 120, '#2a4f8c'], [-50, 260, '#2a4f8c'], [40, 140, '#8c1f24'], [45, 280, '#8c1f24']] as const) {
      const b = makeBanner(c, 2.2, 6);
      b.group.position.set(x, fieldH(x, z), z);
      this.group.add(b.group);
      this.banners.push(b.cloth);
    }
    // the giants converge
    this.pilgrim = new Pilgrim();
    this.pilgrim.root.position.set(0, 0, 585);
    this.pilgrim.heading = Math.PI;
    this.pilgrim.kneel = 1;
    this.pilgrim.reach = 1;
    this.pilgrim.setGlow('#5a4a3a', 0.3);
    this.stag = new Antlered();
    this.stag.onStomp = (p) => this.giantStomp(p);
    this.carillon = new Carillon(true);
    this.carillon.root.position.set(-520, 0, 640);
    this.carillon.heading = 0.6;
    this.group.add(this.pilgrim.root, this.stag.root, this.carillon.root);
    for (const [x, z, h] of [[1600, 1900, -2.4], [-1900, 1700, 2.2]] as const) {
      const far = new Antlered(true);
      far.root.position.set(x, 0, z);
      far.heading = h;
      far.walk = far.walkTarget = 1;
      this.group.add(far.root);
      this.farGiants.push(far);
    }
    const fp = new Pilgrim(true);
    fp.root.position.set(-1200, 0, 2300);
    fp.heading = 2.6;
    fp.walk = fp.walkTarget = 1;
    this.group.add(fp.root);
    this.farGiants.push(fp);
    // the duel arena: the Pilgrim's open palm resting on the field
    this.palm = new THREE.Group();
    this.palm.position.set(PALM.x, 0, PALM.z);
    const ivory = metalSet('ivory');
    const pm = new THREE.Mesh(merge([xf(G.box(PALM_HALF.x * 2, PALM_Y, PALM_HALF.z * 2), [0, PALM_Y / 2, 0]), xf(G.cyl(PALM_HALF.x, PALM_HALF.x, PALM_Y, 16), [0, PALM_Y / 2, PALM_HALF.z * 0.6], [0, 0, 0], [1, 1, 0.6])]), ivory.hull);
    pm.castShadow = pm.receiveShadow = true;
    const fingers: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 4; i++) fingers.push(xf(G.box(3.4, 3.6, 12), [-6.6 + i * 4.4, 2.4, -PALM_HALF.z - 5], [0.35, 0, 0]));
    fingers.push(xf(G.box(4, 3.4, 10), [PALM_HALF.x + 3, 2.4, 1], [0, -0.9, 0.3]));
    const fm = new THREE.Mesh(merge(fingers), ivory.hull);
    fm.castShadow = true;
    const glyph = new THREE.Mesh(new THREE.RingGeometry(4.5, 5, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').multiplyScalar(1.6), side: THREE.DoubleSide }));
    glyph.rotation.x = -Math.PI / 2;
    glyph.position.y = PALM_Y + 0.05;
    this.palm.add(pm, fm, glyph);
    this.group.add(this.palm);
    this.pilgrim.palmR.visible = false;

    this.vesk = new Character('vesk');
    this.vesk.attachWeapon('hammer');
    this.maren = new Character('maren');
    this.maren.attachWeapon('sword');
    this.group.add(this.vesk.root, this.maren.root);
    this.vesk.root.visible = false;
    this.maren.root.visible = false;
    for (let i = 0; i < 5; i++) {
      const g = new Character('guard');
      g.attachWeapon('halberd');
      g.root.visible = false;
      this.guards.push(g);
      this.group.add(g.root);
    }
    this.debris = new Debris(this.g, this.group, '#3a3030');
    this.waves = new Shockwaves(this.g, this.group);
    for (let i = 0; i < 4; i++) {
      const t = new Telegraph('#ff4a2a');
      this.hoofTele.push(t);
      this.group.add(t.group);
    }
    this.sweepTele = new Telegraph('#ff3a2a');
    this.group.add(this.sweepTele.group);
    this.birds = new Birds(50, V3(0, 0, 400), 260, 110, '#140c10');
    this.group.add(this.birds.mesh);
    this.machine = new PlanetMachine();
    this.machine.group.position.set(0, 6000, 0);
    this.machine.group.visible = false;
    this.group.add(this.machine.group);
    this.buildEpilogue();
    this.bounds = { x0: -60, x1: 60, z0: -20, z1: GOAL_Z + 50 };
  }
  private farGiants: (Antlered | Pilgrim)[] = [];

  private buildEpilogue(): void {
    const e = this.epilogue;
    e.position.set(8000, 0, 0);
    const hill = makeTerrain({ size: 1400, seg: 80, center: new THREE.Vector2(0, 0), height: (x, z) => -(Math.hypot(x, z) ** 2) * 0.0014 + fbm(x * 0.03, z * 0.03, 3), color: (x, z) => new THREE.Color().setHSL(0.27, 0.32, 0.36 + fbm(x * 0.02, z * 0.02, 2) * 0.06) });
    e.add(hill);
    const tree = makeTrees([V3(-5, 0, 4)], { leaf: '#3f6040', trunk: '#4a3020' }, 2);
    e.add(tree);
    const ash = new THREE.Mesh(new THREE.CircleGeometry(0.9, 12), new THREE.MeshBasicMaterial({ color: '#2a2220' }));
    ash.rotation.x = -Math.PI / 2;
    ash.position.set(0, 0.03, 0);
    e.add(ash);
    e.visible = false;
    this.group.add(e);
  }

  ground(x: number, z: number): number {
    if (this.inPalm(x, z)) return PALM_Y + this.palm.position.y;
    return fieldH(x, z);
  }

  private inPalm(x: number, z: number): boolean {
    const p = this.palm.position;
    return Math.abs(x - p.x) < PALM_HALF.x && Math.abs(z - p.z) < PALM_HALF.z;
  }

  private giantStomp(p: THREE.Vector3): void {
    p.y = fieldH(p.x, p.z);
    const d = Math.hypot(p.x - this.hero.pos.x, p.z - this.hero.pos.z);
    this.g.cam.shake(Math.min(0.9, 90 / (d + 40)));
    this.g.audio.sfx('stomp', Math.min(1, 220 / (d + 60)), 0.75);
    this.g.particles.stompDust(p, 18);
    if (this.heroActive && d < 110) this.waves.spawn(p, d + 14, 26);
    if (this.heroActive && d < 13) this.hero.damage(2, p);
  }

  tick(dt: number): void {
    this.pilgrim.update(dt, this.time);
    this.stag.update(dt, this.time);
    this.carillon.update(dt, this.time);
    for (const f of this.farGiants) f.update(dt, this.time);
    for (const a of this.armies) a.update(this.time);
    for (const b of this.banners) waveBanner(b, this.time, 1.4);
    updateGrass(this.grassMat, this.time);
    this.birds.update(dt, this.time);
    this.vesk.update(dt, this.time);
    this.maren.update(dt, this.time);
    for (const g of this.guards) if (g.root.visible) g.update(dt, this.time);
    this.debris.update(dt, this.heroActive ? this.hero : null, this.time, (x, z) => this.ground(x, z));
    this.waves.update(dt, this.heroActive ? this.hero : null);
    if (this.machine.group.visible) this.machine.update(dt, this.time);
    (this.cracks.material as THREE.MeshBasicMaterial).color.setRGB(2 + Math.sin(this.time * 2) * 0.6, 0.5, 0.15);
    if (Math.random() < 0.4) this.g.particles.embers(V3((Math.random() - 0.5) * 200, 0.5, this.hero.pos.z + (Math.random() - 0.3) * 120), 1);
    this.stag.legs.forEach((_, i) => {
      const pr = this.stag.predictLanding(i);
      const t = this.hoofTele[i];
      if (pr && this.heroActive && distXZ(pr.pos, this.hero.pos) < 100) t.show(pr.pos.x, fieldH(pr.pos.x, pr.pos.z), pr.pos.z, 12, pr.progress, this.time);
      else t.hide();
    });
  }

  private battleCam(label = 'battle'): void {
    this.cut(followShot({ target: () => this.hero.pos, yaw: () => 0, distance: 8, height: 3.4, lookHeight: 1.6, lookAhead: 8, fov: 60, lag: 0.12, extraLook: () => this.pilgrim.root.position.clone().add(V3(0, 90, 0)), extraWeight: 0.02 }), 0.6, label);
  }

  private shell(): void {
    const h = this.hero;
    const x = h.pos.x + (Math.random() - 0.5) * 16 + h.vel.x * 0.8;
    const z = h.pos.z + 6 + Math.random() * 18;
    this.debris.drop(V3(x, 0, z), 2.6, 1.5);
    this.g.audio.sfx('cannon', 0.5, 0.9 + Math.random() * 0.3);
  }

  async script(from: string): Promise<void> {
    const ui = this.g.ui;
    const audio = this.g.audio;
    const P = this.pilgrim;
    this.sky('storm');
    audio.setAmbience('wind', 0.7);
    audio.setAmbience('crowd', 0.8);
    audio.setAmbience('rumble', 0.6);
    this.hero.basisYaw = () => 0;
    this.lyraFollowOffset.set(1.3, 0, -1.6);
    this.hero.maxResolve = 4;

    if (this.reached(from, 'intro')) {
      this.checkpoint('intro');
      this.cinematic(true);
      ui.setFadeInstant(1);
      this.music('reveal');
      this.stage(V3(0, fieldH(0, -10), -10), 0, V3(1.4, fieldH(1.4, -11), -11.5), 0);
      this.stag.root.position.set(-260, 0, 300);
      this.stag.heading = 1.6;
      this.stag.walk = this.stag.walkTarget = 1;
      this.cut(dollyShot(V3(0, 200, -260), V3(0, 120, -120), V3(0, 0, 300), V3(0, 60, 500), 10, 48, 40), 0, 'field-aerial');
      this.go(this.fadeIn(2.5));
      await this.card(this.num, this.title, 'The Field of Bells, where every road ends', 3.4);
      await this.wait(3);
      this.cut(fixedShot(V3(-2, fieldH(0, -8) + 1.8, -6.5), V3(0.6, fieldH(0, -10) + 1.6, -10.8), 36), 0, 'field-two');
      this.lyra.lookAtTarget = P.root.position.clone().add(V3(0, 80, 0));
      this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 1.4, 0));
      await this.say('LYRA', "There it is. Kneeling, still waiting. It hasn't moved since the day I fell.");
      await this.say('KAEL', "Both armies between us and it. Every Processional in the world walking in circles around it.");
      await this.say('LYRA', '...You could still turn around.');
      await this.say('KAEL', "I was ordered to escort you. I'm a very literal man.");
      this.hero.char.lookAtTarget = null;
      this.lyra.lookAtTarget = null;
    }

    if (this.reached(from, 'battle')) {
      this.music('battle');
      audio.intensity = 1;
      await this.segment(
        'battle',
        () => {
          this.clearWardens();
          this.debris.clear();
          this.waves.clear();
          this.stage(V3(0, 0, 0), 0, V3(1.3, 0, -1.6), 0);
          this.heroActive = true;
          this.lyraFollow = true;
          this.hero.canAttack = true;
          this.stag.root.position.set(-180, 0, 140);
          this.stag.heading = 1.75;
          this.stag.speed = 11;
          this.stag.walk = this.stag.walkTarget = 1;
          this.nextShell = 2;
          for (const [x, z] of [[-4, 70], [5, 76], [0, 82]]) this.spawnWarden(V3(x, fieldH(x, z), z), Math.PI);
          ui.objective('Cross the Field of Bells');
          this.battleCam();
        },
        (dt) => {
          const h = this.hero;
          this.updateWardens(dt, 1);
          this.nextShell -= dt;
          if (this.nextShell < 0 && h.pos.z > 20) {
            this.nextShell = 1.4 + Math.random();
            this.shell();
          }
          ui.progress(h.pos.z / GOAL_Z);
          if (this.wardens.some((w) => w.state === 'windup')) ui.prompt('dodge', 'Dodge', true);
          else if (this.waves.incoming(h)) ui.prompt('jump', 'Jump the shockwave', true);
          else ui.prompt(null);
          const L = this.g.cam.label;
          if (L === 'battle' && this.g.cam.modeTime > 8 && h.pos.z > 100) {
            this.cut(trackShot(() => h.pos, V3(-26, 14, -10), V3(0, 4, 0), 44, 0.2, () => h.pos.clone().lerp(this.stag.hull.getWorldPosition(new THREE.Vector3()), 0.3)), 0, 'battle-wide');
          } else if (L === 'battle-wide' && this.g.cam.modeTime > 3.4) this.battleCam('battle');
          return h.pos.z > 200 ? 'win' : undefined;
        },
      );
    }

    if (this.reached(from, 'charge')) {
      // Maren's charge: a short cut-in, then on to the Pilgrim
      this.checkpoint('charge');
      this.cinematic(true);
      this.stage(V3(0, fieldH(0, 200), 200), 0, V3(1.3, fieldH(1.3, 198.4), 198.4), 0);
      this.maren.root.visible = true;
      this.maren.place(V3(-14, fieldH(-14, 190), 190), 0.8);
      this.guards.forEach((g, i) => {
        g.root.visible = true;
        g.place(V3(-18 - i * 2.2, fieldH(-18 - i * 2.2, 186 + (i % 2) * 2), 186 + (i % 2) * 2), 0.8);
        g.setMode('locomotion');
        g.speed = 6;
      });
      this.maren.setMode('locomotion');
      this.maren.speed = 6;
      this.cut(dollyShot(V3(-4, 2, 206), V3(-6, 2.4, 204), V3(-14, 2, 190), V3(-4, 2, 198), 3, 44, 40), 0, 'maren-arrives');
      await this.animate(2.4, () => {
        const dt = this.g.realDt * this.g.timeScale;
        this.maren.root.position.x += dt * 4;
        this.maren.root.position.z += dt * 3.4;
        for (const g of this.guards) {
          g.root.position.x += dt * 4;
          g.root.position.z += dt * 3.4;
        }
      });
      this.maren.setMode('idle');
      for (const g of this.guards) g.setMode('idle');
      this.cut(fixedShot(() => this.maren.root.position.clone().add(V3(2.2, 1.7, 2.6)), () => this.maren.root.position.clone().add(V3(0, 1.6, 0)), 34), 0, 'maren-close');
      this.maren.lookAtTarget = this.hero.char.root.position.clone().add(V3(0, 1.6, 0));
      await this.say('MAREN', "You were told to get her out of Aurel, not across a <i>war</i>.");
      await this.say('KAEL', "You said 'don't stop', Captain.");
      await this.say('MAREN', '...I did say that. Go. The Royal Guard holds this line. <i>Go!</i>');
      this.maren.setMode('point');
      this.maren.lookAtTarget = null;
      this.music('battle');
      await this.segment(
        'charge',
        () => {
          this.clearWardens();
          this.debris.clear();
          this.waves.clear();
          this.stage(V3(0, fieldH(0, 205), 205), 0, V3(1.3, fieldH(1.3, 203), 203), 0);
          this.heroActive = true;
          this.lyraFollow = true;
          this.stag.root.position.set(160, 0, 280);
          this.stag.heading = -1.45;
          this.stag.speed = 11;
          this.nextShell = 1;
          for (const [x, z] of [[-3, 300], [4, 306]]) this.spawnWarden(V3(x, fieldH(x, z), z), Math.PI);
          ui.objective('Reach the Pilgrim');
          this.battleCam('battle2');
        },
        (dt) => {
          const h = this.hero;
          this.updateWardens(dt, 2);
          this.nextShell -= dt;
          if (this.nextShell < 0) {
            this.nextShell = 1.1 + Math.random() * 0.8;
            this.shell();
          }
          ui.progress(h.pos.z / GOAL_Z);
          if (this.wardens.some((w) => w.state === 'windup')) ui.prompt('dodge', 'Dodge', true);
          else if (this.waves.incoming(h)) ui.prompt('jump', 'Jump', true);
          else ui.prompt(null);
          if (this.g.cam.label === 'battle2' && h.pos.z > 330 && this.g.cam.modeTime > 5) {
            this.cut(trackShot(() => h.pos, V3(10, 1.2, 14), V3(0, 4, 0), 66, 0.2, () => h.pos.clone().lerp(P.head.getWorldPosition(new THREE.Vector3()), 0.25)), 0, 'charge-front');
          } else if (this.g.cam.label === 'charge-front' && this.g.cam.modeTime > 3.5) this.battleCam('battle3');
          return h.pos.z > GOAL_Z ? 'win' : undefined;
        },
      );
      this.maren.root.visible = false;
      for (const g of this.guards) g.root.visible = false;
    }

    // ---------------------------------------------------------------- the duel on the palm
    if (this.reached(from, 'duel')) {
      this.checkpoint('duel');
      this.cinematic(true);
      this.music('none');
      audio.setAmbience('crowd', 0.3);
      this.clearWardens();
      this.debris.clear();
      this.waves.clear();
      const py = PALM_Y;
      this.stage(V3(0, py, PALM.z - 6), 0, V3(-3, py, PALM.z - 7.5), 0.2);
      this.vesk.root.visible = true;
      this.vesk.place(V3(0, py, PALM.z + 5), Math.PI);
      this.vesk.setMode('idle');
      this.cut(dollyShot(V3(22, py + 2, PALM.z - 14), V3(17, py + 3, PALM.z - 10), V3(0, py + 2, PALM.z), () => this.pilgrim.head.getWorldPosition(new THREE.Vector3()).lerp(V3(0, py + 2, PALM.z + 4), 0.93), 5, 52, 46), 0, 'palm-wide');
      audio.sfx('bell', 1, 0.5);
      await this.say('VESK', 'So. The guard who stole the Bell.');
      this.cut(fixedShot(V3(2.4, py + 2.1, PALM.z + 1.8), V3(0, py + 2.2, PALM.z + 5), 30), 0, 'vesk-close');
      await this.say('VESK', "I have read every record of every Procession. Three hundred years of terror, again and again, forever. She can <i>end</i> it.");
      this.cut(fixedShot(V3(-1.8, py + 1.9, PALM.z - 3.2), V3(0, py + 1.7, PALM.z - 6), 32), 0, 'kael-close');
      await this.say('KAEL', "End it how?");
      this.cut(fixedShot(V3(2.4, py + 2.1, PALM.z + 1.8), V3(0, py + 2.2, PALM.z + 5), 30), 0, 'vesk-close2');
      await this.say('VESK', 'Silence the note and the song is never sung again. No more giants. No more kneeling.');
      this.cut(fixedShot(V3(-4.4, py + 1.8, PALM.z - 5.2), V3(-3, py + 1.5, PALM.z - 7.5), 30), 0, 'lyra-close');
      await this.say('LYRA', "The song isn't the thing you're afraid of. It's the only thing holding it down.");
      this.cut(fixedShot(V3(2.4, py + 2.1, PALM.z + 1.8), V3(0, py + 2.2, PALM.z + 5), 30), 0, 'vesk-close3');
      this.vesk.setMode('raise');
      await this.say('VESK', 'Lies the machine taught you. Stand aside, guard.');
      this.cut(fixedShot(V3(-1.8, py + 1.9, PALM.z - 3.2), V3(0, py + 1.7, PALM.z - 6), 32), 0, 'kael-close2');
      this.hero.char.setMode('attack');
      await this.say('KAEL', "I'm a very literal man, Your Grace. I was told not to.");
      this.music('battle');
      this.hero.maxResolve = 5;
      await this.segment(
        'duel',
        () => {
          this.debris.clear();
          this.waves.clear();
          this.stage(V3(0, py, PALM.z - 5), 0, V3(-7, py, PALM.z - 7), 0.6);
          this.lyra.setMode('cower');
          this.heroActive = true;
          this.hero.canAttack = true;
          this.vPos.set(0, py, PALM.z + 4);
          this.vState = 'approach';
          this.vT = 0;
          this.vHp = 18;
          this.vCombo = 0;
          this.vesk.place(this.vPos, Math.PI);
          this.vesk.root.visible = true;
          this.bounds = { x0: PALM.x - PALM_HALF.x + 0.6, x1: PALM.x + PALM_HALF.x - 0.6, z0: PALM.z - PALM_HALF.z + 0.6, z1: PALM.z + PALM_HALF.z - 0.6 };
          ui.objective('Defeat High Cantor Vesk');
          this.cut(followShot({ target: () => this.hero.pos.clone().lerp(this.vPos, 0.35), yaw: () => Math.atan2(this.vPos.x - this.hero.pos.x, this.vPos.z - this.hero.pos.z), distance: 11, height: 5.5, lookHeight: 1.2, lookAhead: 0, fov: 54, lag: 0.25 }), 0.6, 'duel');
          this.hero.basisYaw = () => this.g.cam.yaw;
        },
        (dt) => this.duelStep(dt),
      );
      this.hero.maxResolve = 4;
      this.sweepTele.hide();
      this.bounds = { x0: -60, x1: 60, z0: -20, z1: GOAL_Z + 50 };
    }

    // ---------------------------------------------------------------- farewell
    if (this.reached(from, 'farewell')) {
      this.checkpoint('farewell');
      if (this.hero.char.weapon) this.hero.char.weapon.visible = false;
      this.cinematic(true);
      this.music('farewell');
      audio.setAmbience('crowd', 0.15);
      audio.setAmbience('rumble', 0.2);
      this.sky('dusk', 6);
      const py = PALM_Y;
      this.vesk.root.visible = true;
      this.vesk.place(V3(1.5, py, PALM.z + 4), Math.PI);
      this.vesk.setMode('kneel');
      this.stage(V3(-0.4, py, PALM.z - 1), 0.4, V3(-2.2, py, PALM.z - 1.6), 0.6);
      this.cut(fixedShot(V3(4.2, py + 1.8, PALM.z + 0.6), V3(1.5, py + 1.2, PALM.z + 4), 34), 0, 'vesk-beaten');
      await this.say('VESK', "If she goes back inside, the cycle goes on. Three hundred more years of fear.");
      this.cut(fixedShot(V3(-4.4, py + 1.8, PALM.z - 3.6), V3(-2.2, py + 1.5, PALM.z - 1.6), 30), 0, 'lyra-answers');
      this.lyra.lookAtTarget = this.vesk.root.position.clone().add(V3(0, 1.2, 0));
      await this.say('LYRA', 'Three hundred more years of the world. Bread, and stars, and people who climb on sleeping giants for dares.');
      await this.say('LYRA', "You were afraid of the wrong thing, Cantor. That's all.");
      this.vesk.root.visible = false;
      this.lyra.lookAtTarget = this.hero.char.root.position.clone().add(V3(0, 1.6, 0));
      this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 1.4, 0));
      this.cut(fixedShot(V3(-1.3, py + 1.7, PALM.z + 2.2), V3(-1.2, py + 1.5, PALM.z - 1.3), 32), 0, 'farewell-two');
      await this.say('LYRA', 'Walk with me a little further?');
      // the hand rises toward the open chest
      P.chestOpen = 0;
      audio.sfx('creak', 1, 0.5);
      this.cut(dollyShot(V3(30, 4, PALM.z - 40), V3(50, 60, PALM.z - 90), () => this.palm.position.clone().add(V3(0, 3, 0)), () => P.torso.getWorldPosition(new THREE.Vector3()).add(V3(0, 30, 0)), 9, 46, 40), 0, 'hand-rise');
      const kp = this.hero.char.root.position.clone();
      const lp = this.lyra.root.position.clone();
      const lift = this.palmLift();
      await this.animate(9, (k) => {
        const e = easeInOut(k);
        this.palm.position.y = e * lift.y;
        this.palm.position.z = PALM.z + e * lift.dz;
        P.chestOpen = clamp(k * 1.4 - 0.3, 0, 1);
        P.setGlow('#9ff7ff', 0.3 + k * 3);
        this.hero.char.root.position.set(kp.x, kp.y + this.palm.position.y, kp.z + e * lift.dz);
        this.lyra.root.position.set(lp.x, lp.y + this.palm.position.y, lp.z + e * lift.dz);
        this.hero.char.groundY = this.lyra.groundY = this.palm.position.y + PALM_Y;
      });
    }

    if (this.reached(from, 'walk')) {
      this.checkpoint('walk');
      if (this.hero.char.weapon) this.hero.char.weapon.visible = false;
      this.music('farewell');
      this.sky('dusk');
      P.chestOpen = 1;
      P.setGlow('#9ff7ff', 3.3);
      const lift = this.palmLift();
      this.palm.position.set(PALM.x, lift.y, PALM.z + lift.dz);
      const py = lift.y + PALM_Y;
      const pz = PALM.z + lift.dz;
      const cradle = P.cradleAnchor.getWorldPosition(new THREE.Vector3());
      // a slow, quiet walk across the palm to the cradle door
      await this.segment(
        'walk',
        () => {
          this.stage(V3(-0.4, py, pz - 6), 0, V3(-1.6, py, pz - 6.4), 0);
          this.heroActive = true;
          this.lyraFollow = true;
          this.lyraFollowOffset.set(-1.1, 0, -0.2);
          this.hero.canAttack = false;
          this.hero.canDodge = false;
          this.hero.canJump = false;
          this.hero.walkOnly = true;
          this.hero.tuning.walkSpeed = 1.7;
          this.hero.basisYaw = () => 0;
          this.bounds = { x0: -4, x1: 4, z0: pz - PALM_HALF.z + 0.6, z1: pz + PALM_HALF.z - 0.6 };
          ui.objective('Walk with her');
          this.cut(trackShot(() => this.hero.pos, V3(-12, 3, 4), V3(0, 1.4, 0), 40, 0.4, () => this.hero.pos.clone().add(V3(0, 1.6, 2)).lerp(cradle, 0.1)), 1, 'walk-side');
          this.walkLines = 0;
        },
        () => {
          const h = this.hero;
          const z0 = pz - 6;
          const k = (h.pos.z - z0) / 10;
          if (this.walkLines === 0 && k > 0.15) {
            this.walkLines = 1;
            this.bark('LYRA', "I'm glad it was you who caught me.", 3);
          } else if (this.walkLines === 1 && k > 0.55) {
            this.walkLines = 2;
            this.bark('KAEL', 'Technically you floated. I just stood under you.', 3);
          }
          ui.prompt(k < 0.1 ? 'move' : null, 'Walk');
          return k > 0.95 ? 'win' : undefined;
        },
        { resolve: false },
      );
      this.hero.walkOnly = false;
      this.hero.canDodge = this.hero.canJump = true;
      this.hero.tuning.walkSpeed = 2.8;
      this.lyraFollow = false;
      this.heroActive = false;
      this.cinematic(true);
      const hp = this.hero.pos.clone();
      this.lyra.place(hp.clone().add(V3(-1.3, 0, 0.6)), Math.PI / 2);
      this.hero.char.targetYaw = -Math.PI / 2;
      this.lyra.lookAtTarget = hp.clone().add(V3(0, 1.6, 0));
      this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 1.4, 0));
      this.cut(fixedShot(hp.clone().add(V3(1.2, 1.7, 2.8)), hp.clone().add(V3(-0.8, 1.5, 0.4)), 30), 0, 'last-two');
      await this.say('LYRA', "Three hundred years. Will you count for me, Kael? Just the beginning. So it isn't quiet.");
      const c = await this.choose(['"I\'ll count. Every single one."', '"I\'ll be here when you wake. Someone will be."', '"...Don\'t go."']);
      this.cut(fixedShot(hp.clone().add(V3(-2.6, 1.7, 2.2)), hp.clone().add(V3(-1.3, 1.4, 0.6)), 28), 0, 'lyra-last');
      if (c === 0) await this.say('LYRA', 'Then I\'ll listen for you. Under all the clocks.');
      else if (c === 1) await this.say('LYRA', "Then tell them about the bread. And the stars that stay put. Tell them I liked it here.");
      else {
        await this.say('LYRA', "<i>(she smiles — and it hurts)</i> I have to. But I'm not going back in a box. I'm going back as a song.");
        await this.say('LYRA', "You taught me the difference.");
      }
      this.cut(fixedShot(hp.clone().add(V3(1.2, 1.7, 2.8)), hp.clone().add(V3(-0.8, 1.5, 0.4)), 30), 0, 'last-two-b');
      await this.say('KAEL', '...One.');
      // she steps into the light
      this.lyra.lookAtTarget = null;
      this.hero.char.lookAtTarget = cradle.clone();
      this.cut(dollyShot(hp.clone().add(V3(0.5, 1.6, -4)), hp.clone().add(V3(0.5, 1.8, -6)), cradle.clone().setY(hp.y + 1.6), cradle, 6, 40, 36), 0, 'into-light');
      await this.walkTo(this.lyra, V3(cradle.x, hp.y, Math.min(cradle.z, hp.z + 6)), 1.2);
      audio.sfx('choir', 1);
      audio.sfx('shimmer', 1);
      await this.animate(2, (k) => {
        this.lyra.setGlow(2 + k * 6);
        this.lyra.root.position.y = hp.y + k * 3;
        if (Math.random() < 0.8) this.g.particles.motes(this.lyra.root.position.clone().add(V3(0, 1, 0)), '#9ff7ff', 2, 0.8);
      });
      this.lyra.root.visible = false;
      await this.flash(1, 1.6);
      await this.animate(3, (k) => (P.chestOpen = 1 - k));
      audio.sfx('bell', 1, 0.5);
    }

    if (this.reached(from, 'epilogue')) {
      this.checkpoint('epilogue');
      this.cinematic(true);
      this.music('reveal');
      // the Pilgrim stands, and every Processional walks again
      P.kneel = 1;
      P.chestOpen = 0;
      P.setGlow('#9ff7ff', 3);
      this.palm.visible = false;
      this.pilgrim.palmR.visible = true;
      P.reach = 0;
      this.hero.object.visible = false;
      this.lyra.root.visible = false;
      this.cut(dollyShot(V3(60, 4, 320), V3(80, 30, 280), V3(0, 60, 585), V3(0, 140, 585), 7, 50, 44), 0, 'stand');
      audio.sfx('creak', 1, 0.45);
      await this.animate(6, (k) => {
        P.kneel = 1 - k;
        this.g.cam.shake(0.02);
      });
      audio.sfx('stomp', 1, 0.6);
      P.heading = Math.PI - 0.6;
      P.walk = P.walkTarget = 1;
      this.stag.walk = this.stag.walkTarget = 1;
      this.carillon.walk = this.carillon.walkTarget = 1;
      await this.wait(2.5);
      // the planet machine completes
      this.sky('space');
      const M = this.machine;
      M.group.visible = true;
      M.reveal = 1;
      M.xray = 1;
      M.coreWake = 1;
      M.complete = 0;
      const c0 = M.group.position;
      this.cut(orbitShot(() => c0, 380, 140, 0.2, 1.2, 16, 38), 0, 'world-machine');
      audio.sfx('choir', 1);
      await this.animate(6, (k) => {
        M.complete = easeInOut(k);
        M.coreWake = 1 - k * 0.9;
      });
      await this.wait(2);
      await this.animate(3, (k) => (M.xray = 1 - k));
      await this.fadeOut(2);
      M.group.visible = false;
      // epilogue: dawn on the hill
      this.music('farewell');
      this.sky('dawn');
      this.epilogue.visible = true;
      const e = this.epilogue.position;
      this.stage(V3(e.x + 0.6, 0, e.z + 1.2), Math.PI, null, 0);
      this.hero.char.setMode('sit', 0);
      this.hero.char.groundY = 0;
      const walker = new Pilgrim(true);
      walker.root.position.set(e.x - 300, 0, e.z - 1700);
      walker.heading = -1.3;
      walker.walk = walker.walkTarget = 1;
      walker.setGlow('#9ff7ff', 2.5);
      this.group.add(walker.root);
      this.farGiants.push(walker);
      this.cut(dollyShot(V3(e.x + 3, 1.6, e.z + 4.5), V3(e.x + 2, 2.2, e.z + 6.5), V3(e.x + 0.6, 1, e.z + 1.2), V3(e.x - 200, 120, e.z - 1500), 10, 38, 36), 0, 'dawn');
      await this.fadeIn(2.5);
      await this.wait(3);
      await this.caption('Some time later.', 2.6);
      this.cut(fixedShot(V3(e.x - 1.2, 1.4, e.z + 3.6), V3(e.x + 0.6, 1.1, e.z + 1.2), 30), 0, 'kael-dawn');
      this.hero.char.lookAtTarget = walker.root.position.clone().add(V3(0, 120, 0));
      await this.say('KAEL', '...Nine billion, four hundred sixty-seven million...', { hold: 3 });
      this.cut(dollyShot(V3(e.x + 2, 1.5, e.z + 5), V3(e.x + 1, 1.5, e.z + 7), V3(e.x - 300, 100, e.z - 1700), () => walker.root.position.clone().add(V3(0, 110, 0)), 7, 26, 22), 0, 'pilgrim-away');
      await this.wait(2);
      // the cradle answers: two pulses of light
      for (let i = 0; i < 2; i++) {
        await this.animate(0.8, (k) => walker.setGlow('#9ff7ff', 2.5 + Math.sin(k * Math.PI) * 10));
        audio.sfx('shimmer', 0.7, 1 + i * 0.25);
        await this.wait(0.4);
      }
      this.cut(fixedShot(V3(e.x - 1.2, 1.4, e.z + 3.6), V3(e.x + 0.6, 1.1, e.z + 1.2), 30), 0, 'kael-smile');
      await this.say('KAEL', '<i>(he smiles)</i> ...and twelve.', { hold: 2.6 });
      await this.fadeOut(2.5);
      // title + credits
      this.music('credits');
      ui.chapterCard('· Fin ·', 'The Last Procession', 'every three hundred years, they wake — and someone counts');
      await this.wait(5);
      ui.chapterCard(null);
      await this.wait(1);
      let rolled = false;
      ui.rollCredits(
          [
            ['A film you played', ['Directed by you, at every step']],
            ['Starring', ['Kael — a very literal man', 'Lyra — the missing note', 'Captain Maren — who said "don\'t stop"', 'High Cantor Vesk — afraid of the wrong thing']],
            ['And', ['The Pilgrim', 'The Antlered', 'The Carillon', 'and every Processional that ever walked']],
            ['Built with', ['Three.js · WebGL · Web Audio', 'Every model, sky, sound and note generated in code']],
            ['Thank you for walking with us', ['See you in three hundred years']],
          ],
          () => (rolled = true),
      );
      await this.wait(4);
      await this.until(() => rolled || this.g.input.consume('advance'));
      ui.showScreen(ui.creditsEl, false);
    }
  }
  private walkLines = 0;

  /** Where the palm must rise so its far edge meets the open cradle. */
  private palmLift(): { y: number; dz: number } {
    this.pilgrim.root.updateMatrixWorld(true);
    const c = this.pilgrim.cradleAnchor.getWorldPosition(new THREE.Vector3());
    return { y: c.y - PALM_Y - 1.2, dz: c.z - PALM_HALF.z - 2.5 - PALM.z };
  }

  // ---------------------------------------------------------------- Vesk boss
  private duelStep(dt: number) {
    const ui = this.g.ui;
    const h = this.hero;
    const V = this.vesk;
    this.vT += dt;
    const phase = this.vHp > 12 ? 1 : this.vHp > 6 ? 2 : 3;
    const speedK = phase === 1 ? 1 : phase === 2 ? 0.82 : 0.7;
    const to = h.pos.clone().sub(this.vPos).setY(0);
    const dist = to.length();
    const dir = dist > 0.01 ? to.clone().divideScalar(dist) : V3(0, 0, -1);
    // Kael's blade
    const hb = h.hitbox();
    if (hb && hb.id !== this.vLastHit && hb.center.distanceTo(this.vPos.clone().setY(this.vPos.y + 1.2)) < hb.radius + 0.7 && this.vState !== 'down') {
      this.vLastHit = hb.id;
      const armored = this.vState.startsWith('wind');
      if (armored) {
        this.g.audio.sfx('clang', 1, 1.2);
        this.g.particles.sparks(this.vPos.clone().add(V3(0, 1.6, 0)), '#ffe0a0', 10);
        ui.prompt('dodge', 'He\'s braced — wait for the opening', true);
      } else {
        this.vHp--;
        this.g.audio.sfx('hit', 1.2, 0.8);
        this.g.particles.sparks(this.vPos.clone().add(V3(0, 1.4, 0)), '#ff9a6a', 14);
        hitStop.value = 0.07;
        this.g.cam.shake(0.25);
        if (this.vState === 'recover' && this.vT > 0.6) {
          this.vState = 'stagger';
          this.vT = 0;
          V.setMode('hurt', 0.05);
        }
        if (this.vHp === 12 || this.vHp === 6) {
          this.g.audio.sfx('bell', 1, 0.45);
          this.bark('VESK', this.vHp === 12 ? 'You fight for a machine that never asked for you!' : 'Enough! Let the bell ring for <i>you!</i>', 2.4);
          this.vState = 'windToll';
          this.vT = 0;
          V.setMode('raise', 0.2);
        }
      }
    }
    const face = Math.atan2(dir.x, dir.z);
    switch (this.vState) {
      case 'approach': {
        this.vFacing = face;
        V.setMode(dist > 3.6 ? 'locomotion' : 'idle');
        if (dist > 3.6) this.vPos.addScaledVector(dir, Math.min(dist - 3.4, 2.6 * dt * (phase === 3 ? 1.5 : 1)));
        V.speed = dist > 3.6 ? 2.6 : 0;
        if (this.vT > 1.1 * speedK) {
          const r = (this.vCombo++ + phase) % 3;
          if (dist < 4.6 && r !== 2) {
            this.vState = 'windSweep';
            V.setMode('raise', 0.15);
          } else if (r === 2 && phase >= 2) {
            this.vState = 'windToll';
            V.setMode('raise', 0.2);
          } else {
            this.vState = 'windSlam';
            V.setMode('raise', 0.2);
          }
          this.vT = 0;
          this.g.audio.sfx('creak', 0.7, 1.6);
        }
        break;
      }
      case 'windSlam':
        V.setGlow(2 + this.vT * 6);
        this.sweepTele.show(this.vPos.x, this.vPos.y, this.vPos.z, 3, this.vT / (0.9 * speedK), this.time);
        if (this.vT > 0.9 * speedK) {
          this.vState = 'slam';
          this.vT = 0;
          V.attackVariant = 2;
          V.setMode('attack', 0.04);
          this.sweepTele.hide();
          this.waves.spawn(this.vPos.clone(), 22, 13);
          this.g.audio.sfx('boom', 0.9);
          this.g.cam.shake(0.6);
          this.g.particles.impactDust(this.vPos.clone(), 1.6);
          if (dist < 3) h.damage(1, this.vPos);
        }
        break;
      case 'windSweep':
        this.vFacing = face;
        V.setGlow(2 + this.vT * 6);
        this.sweepTele.show(this.vPos.x, this.vPos.y, this.vPos.z, 4.6, this.vT / (0.7 * speedK), this.time);
        if (this.vT > 0.7 * speedK) {
          this.vState = 'sweep';
          this.vT = 0;
          V.attackVariant = 0;
          V.setMode('attack', 0.04);
          this.sweepTele.hide();
          this.g.audio.sfx('swing', 1.4, 0.6);
        }
        break;
      case 'sweep':
        if (this.vT > 0.08 && this.vT < 0.2 && dist < 4.8) {
          if (h.damage(1, this.vPos)) this.g.particles.sparks(h.pos.clone().add(V3(0, 1.2, 0)), '#ff7a5a');
        }
        if (this.vT > 0.35) {
          this.vState = phase === 3 && this.vCombo % 2 === 0 ? 'windSlam' : 'recover';
          this.vT = 0;
          V.setMode(this.vState === 'recover' ? 'idle' : 'raise', 0.15);
        }
        break;
      case 'slam':
        if (this.vT > 0.4) {
          this.vState = 'recover';
          this.vT = 0;
          V.setMode('idle', 0.2);
        }
        break;
      case 'windToll':
        V.setGlow(2 + this.vT * 5);
        if (this.vT > 1.0 * speedK) {
          this.vState = 'toll';
          this.vT = 0;
          this.vTolls = 0;
          V.attackVariant = 2;
        }
        break;
      case 'toll':
        if (this.vT > this.vTolls * 0.65 && this.vTolls < 3) {
          this.vTolls++;
          V.restartMode(0.04);
          V.setMode('attack', 0.04);
          this.waves.spawn(this.vPos.clone(), 24, 12);
          this.g.audio.sfx('bell', 1, 0.6 + this.vTolls * 0.1);
          this.g.cam.shake(0.35);
        }
        if (this.vT > 2.2) {
          this.vState = 'recover';
          this.vT = 0;
          V.setMode('kneel', 0.2);
        }
        break;
      case 'recover':
        V.setGlow(1.2);
        if (this.vT > 1.4 * speedK + (V.mode === 'kneel' ? 0.6 : 0)) {
          this.vState = 'approach';
          this.vT = 0;
          V.setMode('idle', 0.2);
        }
        break;
      case 'stagger':
        if (this.vT > 0.5) {
          this.vPos.addScaledVector(dir, -1.5);
          this.vState = 'approach';
          this.vT = -0.3;
        }
        break;
      case 'down':
        break;
    }
    this.vPos.x = clamp(this.vPos.x, PALM.x - PALM_HALF.x + 1, PALM.x + PALM_HALF.x - 1);
    this.vPos.z = clamp(this.vPos.z, PALM.z - PALM_HALF.z + 1, PALM.z + PALM_HALF.z - 1);
    // keep Kael and Vesk from overlapping
    if (dist < 1.4) h.pos.addScaledVector(dir, 1.4 - dist);
    V.root.position.copy(this.vPos);
    V.targetYaw = this.vFacing;
    V.groundY = this.vPos.y;
    if (this.vState === 'windSweep' || this.vState === 'windSlam') ui.prompt('dodge', 'Dodge!', true);
    else if (this.waves.incoming(h)) ui.prompt('jump', 'Jump the ring', true);
    else if (this.vState === 'recover' || this.vState === 'stagger') ui.prompt('attack', 'Strike now!', false);
    else ui.prompt(null);
    ui.progress(1 - this.vHp / 18);
    if (h.pos.y < PALM_Y - 1.5) return 'fail' as const;
    if (this.vHp <= 0) {
      this.vState = 'down';
      V.setMode('kneel', 0.2);
      this.g.audio.sfx('clang', 1, 0.5);
      return 'win' as const;
    }
    void damp;
    return undefined;
  }
}
