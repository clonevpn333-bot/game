import * as THREE from 'three';
import { Chapter } from '../Chapter';
import { dollyShot, fixedShot, followShot, orbitShot, trackShot } from '../CameraDirector';
import { Antlered, Carillon } from '../../world/Processional';
import { fogBank, makeMountainRing, makeTerrain, makeTrees } from '../../world/World';
import { G, merge, xf } from '../../render/Geo';
import { metalSet, stoneTexture, toon } from '../../render/Materials';
import { Warden } from '../../actors/Warden';
import { clamp, fbm, V3 } from '../../utils/math';

/**
 * The train is simulated in its own moving frame: the cars stay at the origin and
 * the WORLD scrolls past (terrain, viaduct piers, gantries). That keeps the
 * on-foot controller exact on a 70 mph roof.
 */
const CAR_LEN = 24;
const CARS = 6;
const GAP = 3.2;
const ROOF_Y = 6.2;
const TRAIN_SPEED = 32; // m/s apparent world scroll

function carX(i: number): number {
  return -i * (CAR_LEN + GAP); // car 0 = locomotive at front (+x)
}

// ============================================================================
// CHAPTER FOUR — THE IRON PILGRIMAGE
// ============================================================================
export class IronPilgrimage extends Chapter {
  static meta = { num: 'Chapter Four', title: 'The Iron Pilgrimage', subtitle: 'A train across the cloud sea, and a war between giants.' };
  readonly id = 'train';
  readonly num = IronPilgrimage.meta.num;
  readonly title = IronPilgrimage.meta.title;
  readonly subtitle = IronPilgrimage.meta.subtitle;
  readonly checkpoints = ['intro', 'deck', 'roof', 'gantries', 'front', 'halt'];
  private train = new THREE.Group();
  private scroll = new THREE.Group(); // world that moves past the train
  private wheels: THREE.Object3D[] = [];
  private gantries: { obj: THREE.Group; x: number; hit: boolean; prevRel: number }[] = [];
  private piers!: THREE.InstancedMesh;
  private scrollX = 0;
  private trainSpeed = TRAIN_SPEED;
  carillon!: Carillon;
  stag!: Antlered;
  private battleT = 0;
  private battleOn = true;
  private smokeT = 0;
  private sway = 0;

  build(): void {
    const M = metalSet('iron');
    const bronze = metalSet('bronze');
    const paint = toon('#2a3f6a');
    const paint2 = toon('#7a2a24');
    const gold = new THREE.MeshStandardMaterial({ color: '#d6a24a', metalness: 0.9, roughness: 0.3 });
    const windowMat = new THREE.MeshStandardMaterial({ color: '#2a2030', emissive: '#ffcf7a', emissiveIntensity: 0.9 });
    // ---- the train
    for (let i = 0; i < CARS; i++) {
      const car = new THREE.Group();
      car.position.x = carX(i);
      const loco = i === 0;
      const body: THREE.BufferGeometry[] = [];
      const trim: THREE.BufferGeometry[] = [];
      const wins: THREE.BufferGeometry[] = [];
      const dark: THREE.BufferGeometry[] = [];
      if (loco) {
        body.push(xf(G.cyl(2.3, 2.3, CAR_LEN * 0.62, 14), [2, 3.6, 0], [0, 0, Math.PI / 2]));
        body.push(xf(G.box(8, 5.6, 4.8), [-7.5, 3.7, 0]));
        body.push(xf(G.box(9, 0.5, 5.2), [-7.5, 6.6, 0]));
        dark.push(xf(G.cyl(0.9, 1.2, 3.6, 10), [8, 7, 0]));
        trim.push(xf(G.cyl(1.25, 1.25, 0.5, 10), [8, 8.9, 0]));
        trim.push(xf(G.cone(2.6, 3.2, 12), [11.8, 3.2, 0], [0, 0, -Math.PI / 2]));
        for (let k = 0; k < 4; k++) trim.push(xf(G.cyl(2.36, 2.36, 0.25, 14), [-2 + k * 3.6, 3.6, 0], [0, 0, Math.PI / 2]));
        wins.push(xf(G.box(4, 1.6, 4.9), [-7.5, 4.8, 0]));
        dark.push(xf(G.sph(0.7, 8, 6), [12.9, 3.2, 0]));
      } else {
        body.push(xf(G.box(CAR_LEN - 1, 4.2, 4.6), [0, 3.5, 0]));
        body.push(xf(G.cyl(2.5, 2.5, CAR_LEN - 0.6, 12, false), [0, 5.6, 0], [0, 0, Math.PI / 2], [1, 0.25, 1]));
        for (let k = 0; k < 7; k++) wins.push(xf(G.box(1.6, 1.2, 4.7), [-9 + k * 3, 4.1, 0]));
        trim.push(xf(G.box(CAR_LEN - 0.8, 0.3, 4.8), [0, 1.5, 0]));
        trim.push(xf(G.box(CAR_LEN - 0.8, 0.2, 4.8), [0, 5.55, 0]));
        // roof walkway + vents (cover and texture for the fight)
        dark.push(xf(G.box(CAR_LEN - 2, 0.15, 1.6), [0, ROOF_Y, 0]));
        for (let k = 0; k < 3; k++) dark.push(xf(G.box(1.2, 0.6, 1.2), [-7 + k * 7, ROOF_Y + 0.3, 1.8 * (k % 2 ? 1 : -1)]));
      }
      dark.push(xf(G.box(CAR_LEN - 2, 1.2, 3.6), [0, 1.0, 0]));
      if (i === CARS - 1) {
        // rear observation platform with a brass railing
        dark.push(xf(G.box(3.4, 0.3, 4.6), [-CAR_LEN / 2 - 1.4, 1.85, 0]));
        trim.push(xf(G.box(0.12, 1.1, 4.6), [-CAR_LEN / 2 - 3.0, 2.5, 0]), xf(G.box(3.2, 0.1, 0.12), [-CAR_LEN / 2 - 1.4, 3.0, 2.25]), xf(G.box(3.2, 0.1, 0.12), [-CAR_LEN / 2 - 1.4, 3.0, -2.25]));
      }
      const wheelGeo = xf(G.cyl(0.85, 0.85, 0.4, 14), [0, 0, 0], [Math.PI / 2, 0, 0]);
      for (const wx of [-8, -6, 6, 8]) {
        for (const wz of [-1.7, 1.7]) {
          const w = new THREE.Mesh(wheelGeo, M.dark);
          w.position.set(wx, 0.85, wz);
          car.add(w);
          this.wheels.push(w);
        }
      }
      const add = (list: THREE.BufferGeometry[], m: THREE.Material) => {
        if (!list.length) return;
        const mesh = new THREE.Mesh(merge(list), m);
        mesh.castShadow = mesh.receiveShadow = true;
        car.add(mesh);
      };
      add(body, loco ? M.hull : i % 2 ? paint : paint2);
      add(trim, loco ? bronze.trim : gold);
      add(wins, windowMat);
      add(dark, M.dark);
      this.train.add(car);
    }
    // track bed + viaduct deck that scrolls
    this.group.add(this.train);
    this.group.add(this.scroll);
    const deckMat = new THREE.MeshStandardMaterial({ map: stoneTexture('#a49480', 12, 4), roughness: 0.9 });
    const deckLen = 600;
    for (let k = -1; k < 3; k++) {
      const deck = new THREE.Mesh(merge([xf(G.box(deckLen, 1.6, 9), [0, -0.8, 0]), xf(G.box(deckLen, 1.4, 0.6), [0, 0.7, 4.3]), xf(G.box(deckLen, 1.4, 0.6), [0, 0.7, -4.3])]), deckMat);
      deck.position.x = k * deckLen;
      deck.receiveShadow = true;
      deck.userData.loop = deckLen * 4;
      this.scroll.add(deck);
    }
    const rails = new THREE.Mesh(merge([xf(G.box(2400, 0.2, 0.2), [0, 0.15, 1.2]), xf(G.box(2400, 0.2, 0.2), [0, 0.15, -1.2])]), M.trim);
    this.group.add(rails);
    // viaduct piers plunging into the cloud sea
    const pierGeo = merge([xf(G.box(7, 160, 8), [0, -80, 0]), xf(G.cyl(5, 5, 6, 3, false), [0, -4, 0], [0, 0, 0], [1.2, 1, 1.6])]);
    this.piers = new THREE.InstancedMesh(pierGeo, deckMat, 24);
    this.piers.receiveShadow = true;
    this.group.add(this.piers);
    // signal gantries (slide under them!)
    const gantryGeo = merge([xf(G.box(0.8, 12, 0.8), [0, 6, 5.2]), xf(G.box(0.8, 12, 0.8), [0, 6, -5.2]), xf(G.box(1.2, 1.4, 11.2), [0, ROOF_Y + 1.6, 0])]);
    const lampGeo = xf(G.box(0.5, 0.5, 0.5), [0, ROOF_Y + 2.6, 3]);
    const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3a2a').multiplyScalar(3) });
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      const m = new THREE.Mesh(gantryGeo, M.dark);
      m.castShadow = true;
      g.add(m, new THREE.Mesh(lampGeo, lampMat));
      g.visible = false;
      this.group.add(g);
      this.gantries.push({ obj: g, x: 9999, hit: false, prevRel: 999 });
    }
    // the cloud sea and distant peaks
    const clouds = makeTerrain({
      size: 9000,
      seg: 90,
      height: (x, z) => -60 + fbm(x * 0.002, z * 0.002, 4) * 26,
      color: (x, z) => new THREE.Color().setHSL(0.6, 0.18, 0.62 + fbm(x * 0.003, z * 0.003, 2) * 0.12),
    });
    (clouds.material as THREE.MeshStandardMaterial).roughness = 1;
    this.group.add(clouds);
    this.group.add(makeMountainRing(3200, 26, 900, '#8090b0', 4));
    this.group.add(fogBank(18, V3(0, -20, 1400), V3(5000, 30, 1600), 500, '#ffffff', 0.45));
    // a rocky spur the viaduct passes (scale cue near track)
    const spur = makeTerrain({ size: 400, seg: 40, center: new THREE.Vector2(0, -260), height: (x, z) => -40 + Math.max(0, 80 - Math.hypot(x, z + 260) * 0.5) + fbm(x * 0.03, z * 0.03, 3) * 12, color: () => new THREE.Color('#8a8070') });
    this.group.add(spur);
    const pines: THREE.Vector3[] = [];
    for (let i = 0; i < 30; i++) pines.push(V3(-120 + i * 8, 0 + Math.sin(i) * 5, -200 - (i % 5) * 12));
    this.group.add(makeTrees(pines, { leaf: '#3a5a40', trunk: '#4a3020' }, 1.8));

    // the duel: Carillon vs Antlered on the plain beyond
    this.carillon = new Carillon();
    this.stag = new Antlered();
    this.carillon.root.position.set(300, -60, 1300);
    this.stag.root.position.set(-200, -60, 1150);
    this.group.add(this.carillon.root, this.stag.root);
    this.carillon.onStomp = (p) => this.distantStomp(p);
    this.stag.onStomp = (p) => this.distantStomp(p);
    this.bounds = { x0: carX(CARS - 1) - CAR_LEN / 2 + 0.5, x1: CAR_LEN / 2 + 0.5, z0: -2.0, z1: 2.0 };
  }

  private distantStomp(p: THREE.Vector3): void {
    const d = p.distanceTo(this.g.cam.camera.position);
    this.g.cam.shake(Math.min(0.35, 300 / (d + 300)));
    this.g.audio.sfx('stomp', Math.min(0.8, 600 / (d + 200)), 0.7);
    this.g.particles.stompDust(p, 30);
  }

  /** Train roof walking surface: cars with gaps between them. */
  ground(x: number, z: number): number {
    for (let i = 0; i < CARS; i++) {
      const cx = carX(i);
      const half = i === 0 ? CAR_LEN * 0.55 : CAR_LEN / 2 - 0.4;
      if (x > cx - half && x < cx + half && Math.abs(z) < 2.4) {
        if (i === 0) return x > cx - 3.5 ? 6.2 : ROOF_Y + 0.6;
        return ROOF_Y + 0.08;
      }
    }
    return -50;
  }

  tick(dt: number): void {
    // scrolling world
    this.scrollX += this.trainSpeed * dt;
    this.scroll.children.forEach((c) => {
      c.position.x -= this.trainSpeed * dt;
      const loop = (c.userData.loop as number) ?? 2400;
      if (c.position.x < -loop / 2) c.position.x += loop;
    });
    const m = new THREE.Matrix4();
    for (let i = 0; i < 24; i++) {
      const x = (((i * 60 - this.scrollX) % 1440) + 1440) % 1440 - 720;
      m.makeTranslation(x, -1.5, 0);
      this.piers.setMatrixAt(i, m);
    }
    this.piers.instanceMatrix.needsUpdate = true;
    for (const w of this.wheels) w.rotation.z -= (this.trainSpeed / 0.85) * dt;
    for (const gn of this.gantries) {
      if (gn.x < 9000) {
        gn.x -= this.trainSpeed * dt;
        gn.obj.position.x = gn.x;
        gn.obj.visible = gn.x > -200 && gn.x < 400;
      }
    }
    // train sway + smoke
    this.sway += dt;
    this.train.position.y = Math.sin(this.sway * 9) * 0.03;
    this.train.rotation.x = Math.sin(this.sway * 2.3) * 0.006;
    this.smokeT -= dt;
    if (this.smokeT < 0 && this.trainSpeed > 2) {
      this.smokeT = 0.05;
      this.g.particles.emit('dust', V3(8, 9.4, 0), 1, { color: '#d8d0c8', color2: '#8a8a90', size: 2, sizeEnd: 5, life: 2.4, speed: 4, dir: V3(-1, 0.8, 0), drag: 0.6, alpha: 0.55 });
    }
    // the giants' battle (scripted choreography loop)
    this.battleT += dt;
    if (this.battleOn) this.updateBattle(dt);
    this.carillon.update(dt, this.time);
    this.stag.update(dt, this.time);
  }

  private updateBattle(dt: number): void {
    const C = this.carillon;
    const S = this.stag;
    const t = this.battleT % 30;
    // circle each other, then the stag rears and charges into the temple
    const ang = this.battleT * 0.05;
    const cx = 100 + Math.cos(ang) * 260;
    const cz = 1250 + Math.sin(ang) * 120;
    C.walkTarget = 0.6;
    C.speed = 5;
    C.heading = Math.atan2(S.root.position.x - C.root.position.x, S.root.position.z - C.root.position.z);
    C.holdPosition = false;
    S.walkTarget = t > 18 && t < 22 ? 0 : 1;
    S.speed = t > 22 && t < 26 ? 18 : 10;
    S.rear = t > 18 && t < 22 ? Math.sin(((t - 18) / 4) * Math.PI) : 0;
    const want = Math.atan2(cx - S.root.position.x, cz - S.root.position.z);
    const toC = Math.atan2(C.root.position.x - S.root.position.x, C.root.position.z - S.root.position.z);
    const target = t > 20 && t < 26 ? toC : want;
    let d = target - S.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    S.heading += d * Math.min(1, dt * 0.6);
    // keep them apart a little (impact!)
    const sep = C.root.position.clone().sub(S.root.position).setY(0);
    if (sep.length() < 150) {
      sep.normalize();
      S.root.position.addScaledVector(sep, -dt * 40);
      C.root.position.addScaledVector(sep, dt * 12);
      if (Math.random() < dt * 2) {
        this.g.audio.sfx('clang', 0.5, 0.25);
        this.g.audio.sfx('bell', 0.5, 0.5);
        this.g.particles.sparks(S.head.getWorldPosition(new THREE.Vector3()), '#ffd27a', 30);
      }
    }
  }

  private spawnGantry(ahead: number): void {
    const g = this.gantries.find((x) => x.x > 9000 || x.x < -150);
    if (!g) return;
    g.x = ahead;
    g.hit = false;
    g.prevRel = 999;
    g.obj.position.set(ahead, 0, 0);
    g.obj.visible = true;
  }

  private roofCam(label = 'roof'): void {
    this.cut(followShot({ target: () => this.hero.pos, yaw: () => Math.PI / 2, distance: 9, height: 4.5, lookHeight: 1, lookAhead: 4, fov: 58, lag: 0.12, side: 2.5, extraLook: () => this.carillon.root.position.clone().add(V3(0, 150, 0)), extraWeight: 0.02 }), 0.6, label);
  }

  private battleCut(): void {
    // a brief spectacle insert of the giants' duel, framed past the train
    this.cut(dollyShot(() => this.hero.pos.clone().add(V3(-6, 3, -10)), () => this.hero.pos.clone().add(V3(-4, 4, -12)), () => this.stag.root.position.clone().add(V3(0, 110, 0)), () => this.carillon.root.position.clone().add(V3(0, 120, 0)), 3, 36, 30), 0, 'battle-insert');
  }

  async script(from: string): Promise<void> {
    const ui = this.g.ui;
    const audio = this.g.audio;
    this.sky('morning');
    audio.setAmbience('rail', 1);
    audio.setAmbience('wind', 0.6);
    this.hero.basisYaw = () => Math.PI / 2;
    this.lyraFollowOffset.set(0.8, 0, -2.2);
    const deckX = carX(CARS - 1) - CAR_LEN / 2 - 1.4; // rear observation platform

    if (this.reached(from, 'intro')) {
      this.checkpoint('intro');
      this.cinematic(true);
      ui.setFadeInstant(1);
      this.music('train');
      this.stage(V3(deckX, 2.2, 0.9), -Math.PI / 2, V3(deckX, 2.2, -0.9), -Math.PI / 2);
      this.cut(dollyShot(V3(120, 40, 160), V3(40, 20, 90), V3(-40, 4, 0), V3(-80, 6, 0), 8, 40, 34), 0, 'train-aerial');
      this.go(this.fadeIn(2));
      await this.card(this.num, this.title, 'The Meridian Express, crossing the Cloud Sea viaduct', 3.2);
      await this.wait(2.5);
    }

    if (this.reached(from, 'deck')) {
      this.checkpoint('deck');
      this.cinematic(true);
      this.music('train');
      this.stage(V3(deckX + 0.4, 2.0, 1.0), -Math.PI / 2 + 0.6, V3(deckX + 0.2, 2.0, -0.9), -Math.PI / 2 + 0.8);
      this.hero.char.root.position.y = 2.0;
      this.lyra.root.position.y = 2.0;
      this.hero.char.groundY = 2.0;
      this.lyra.groundY = 2.0;
      this.lyra.lookAtTarget = this.carillon.root.position.clone().add(V3(0, 150, 0));
      this.cut(fixedShot(V3(deckX - 3.4, 3.6, 2.4), V3(deckX, 3.2, 0), 40), 0, 'deck-two');
      await this.say('LYRA', 'Trains are Processionals for people.');
      await this.say('KAEL', 'Trains generally stay on the tracks. And don\'t step on anyone.');
      await this.say('LYRA', '...Generally?');
      await this.say('KAEL', "There was an incident in Varrow. It's a long story. A cow was involved.");
      this.cut(dollyShot(V3(deckX - 2, 3.4, -2.6), V3(deckX - 2.6, 3.8, -3.4), () => this.carillon.root.position.clone().add(V3(0, 120, 0)), () => this.stag.root.position.clone().add(V3(0, 100, 0)), 5, 30, 26), 0, 'deck-giants');
      await this.say('LYRA', "Kael — they're fighting. The Carillon and the Antlered. They've never fought, not in ten thousand years...");
      await this.say('LYRA', "They're fighting over which one gets to reach me first.");
      this.cut(fixedShot(V3(deckX - 3.4, 3.6, 2.4), V3(deckX, 3.2, 0), 40), 0, 'deck-two-b');
      audio.sfx('whoosh', 1);
      await this.wait(0.4);
      this.hero.char.lookAtTarget = V3(deckX + 20, 30, 10);
      await this.say('KAEL', 'Gliders. Bellwardens are dropping onto the roof. Lyra, inside. Lock the door.');
      await this.say('LYRA', 'And you?');
      await this.say('KAEL', "I'm going to go have a conversation about tickets.");
      this.hero.char.lookAtTarget = null;
      this.lyra.lookAtTarget = null;
    }

    // ---------------------------------------------------------------- roof fight, car by car
    if (this.reached(from, 'roof')) {
      this.music('action');
      audio.intensity = 1;
      await this.segment(
        'roof',
        () => {
          this.clearWardens();
          this.stage(V3(carX(5) - 8, ROOF_Y + 0.08, 0), Math.PI / 2, null, 0);
          this.lyra.root.visible = false;
          this.heroActive = true;
          this.hero.canAttack = true;
          for (const [i, dx] of [[5, 6], [4, -4], [4, 4]] as const) this.spawnWarden(V3(carX(i) + dx, ROOF_Y + 0.08, (Math.random() - 0.5) * 2), -Math.PI / 2);
          ui.objective('Clear the roof — reach the locomotive');
          this.roofCam();
          this.battleT = 0;
        },
        (dt) => {
          const alive = this.updateWardens(dt, 1);
          for (const w of this.wardens) if (w.alive && w.pos.y < ROOF_Y - 2) w.kill();
          const h = this.hero;
          ui.progress((h.pos.x - carX(5)) / (carX(0) - carX(5)));
          const gapAhead = [1, 2, 3, 4, 5].some((i) => {
            const gx = carX(i) + CAR_LEN / 2 + GAP / 2 - 0.4;
            return gx - h.pos.x > 0 && gx - h.pos.x < 4;
          });
          if (this.wardens.some((w) => w.state === 'windup')) ui.prompt('dodge', 'Dodge', true);
          else if (gapAhead) ui.prompt('jump', 'Jump the gap', false);
          else ui.prompt(null);
          if (this.g.cam.label === 'roof' && this.g.cam.modeTime > 9) {
            this.battleCut();
          } else if (this.g.cam.label === 'battle-insert' && this.g.cam.modeTime > 3) this.roofCam();
          if (h.pos.y < 0) return 'fail';
          return alive === 0 && h.pos.x > carX(3) - 4 ? 'win' : undefined;
        },
      );
    }

    if (this.reached(from, 'gantries')) {
      await this.segment(
        'gantries',
        () => {
          this.clearWardens();
          this.stage(V3(carX(3) - 2, ROOF_Y + 0.08, 0), Math.PI / 2, null, 0);
          this.lyra.root.visible = false;
          this.heroActive = true;
          for (const g of this.gantries) {
            g.x = 9999;
            g.obj.visible = false;
          }
          this.spawnGantry(160);
          this.spawnGantry(320);
          this.spawnGantry(470);
          this.spawnWarden(V3(carX(2) + 4, ROOF_Y + 0.08, 0.5), -Math.PI / 2);
          this.spawnWarden(V3(carX(1) - 2, ROOF_Y + 0.08, -0.5), -Math.PI / 2);
          ui.objective('Slide under the signal gantries');
          this.cut(trackShot(() => this.hero.pos, V3(-7, 2.4, 6.5), V3(0, 1, 0), 56, 0.1, () => this.hero.pos.clone().add(V3(5, 0.5, 0))), 0.6, 'gantry-side');
        },
        (dt) => {
          this.updateWardens(dt, 1);
          for (const w of this.wardens) if (w.alive && w.pos.y < ROOF_Y - 2) w.kill();
          const h = this.hero;
          ui.progress((h.pos.x - carX(5)) / (carX(0) - carX(5)));
          let warn = false;
          for (const g of this.gantries) {
            if (g.x > 9000) continue;
            const rel = g.x - h.pos.x;
            if (rel > 0 && rel < 34) warn = true;
            // the crossbar sweeps the roof: anyone standing gets hit (crossing test is frame-rate safe)
            const crossed = g.prevRel > 0 && rel <= 0;
            g.prevRel = rel;
            if (!g.hit && crossed) {
              g.hit = true;
              if (!h.dodging) {
                h.damage(1, V3(h.pos.x + 2, h.pos.y, 0));
                this.g.audio.sfx('clang', 1, 0.6);
              } else {
                this.g.audio.sfx('whoosh', 1);
                this.g.cam.punch(-4);
              }
              for (const w of this.wardens) {
                if (w.alive && Math.abs(g.x - w.pos.x) < 3) {
                  w.kill();
                  this.g.audio.sfx('hit', 0.8);
                }
              }
            }
          }
          if (warn) ui.prompt('dodge', 'Slide!', true);
          else ui.prompt(null);
          if (h.pos.y < 0) return 'fail';
          const done = this.gantries.every((g) => g.x > 9000 || g.x < h.pos.x - 10);
          return done && h.pos.x > carX(1) ? 'win' : undefined;
        },
      );
      for (const g of this.gantries) g.x = 9999;
    }

    if (this.reached(from, 'front')) {
      await this.segment(
        'front',
        () => {
          this.clearWardens();
          this.stage(V3(carX(1) - 4, ROOF_Y + 0.08, 0), Math.PI / 2, null, 0);
          this.lyra.root.visible = false;
          this.heroActive = true;
          for (let i = 0; i < 3; i++) this.spawnWarden(V3(carX(1) + 4 + i * 2.5, ROOF_Y + 0.08, (i - 1) * 1.2), -Math.PI / 2);
          ui.objective('Hold the front car');
          this.roofCam('roof-front');
        },
        (dt) => {
          const alive = this.updateWardens(dt, 2);
          for (const w of this.wardens) if (w.alive && w.pos.y < ROOF_Y - 2) w.kill();
          if (this.wardens.some((w) => w.state === 'windup')) ui.prompt('dodge', 'Dodge', true);
          else ui.prompt(null);
          if (this.hero.pos.y < 0) return 'fail';
          return alive === 0 ? 'win' : undefined;
        },
      );
    }

    // ---------------------------------------------------------------- the Carillon steps over the line
    this.checkpoint('halt');
    this.cinematic(true);
    this.clearWardens();
    this.music('reveal');
    const C = this.carillon;
    this.battleOn = false;
    this.stag.walkTarget = 0;
    C.root.position.set(345, 0, 120);
    C.heading = -Math.PI / 2 - 0.15;
    C.walk = C.walkTarget = 1;
    C.speed = 9;
    this.stage(V3(carX(1) + 6, ROOF_Y + 0.08, 0), Math.PI / 2, V3(carX(1) + 4, ROOF_Y + 0.08, -1.2), Math.PI / 2);
    this.lyra.root.visible = true;
    this.cut(dollyShot(V3(carX(1) - 4, ROOF_Y + 2.5, -5), V3(carX(1) - 2, ROOF_Y + 2, -4), V3(carX(1) + 8, ROOF_Y + 1.6, 0), () => C.root.position.clone().add(V3(0, 160, 0)), 5, 46, 40), 0, 'roof-look');
    await this.say('LYRA', "I couldn't stay inside. Kael — look.");
    this.cut(dollyShot(V3(-60, 20, -70), V3(-40, 30, -60), () => C.root.position.clone().add(V3(0, 100, 0)), () => C.root.position.clone().add(V3(0, 130, 0)), 7, 50, 44), 0, 'carillon-steps');
    await this.until(() => C.root.position.x < 260);
    // its leg comes down across the viaduct: brakes!
    audio.sfx('creak', 1, 1.6);
    audio.sfx('crash', 1, 0.5);
    this.g.cam.shake(1);
    await this.animate(4, (k) => {
      this.trainSpeed = TRAIN_SPEED * (1 - k);
      if (Math.random() < 0.6) this.g.particles.sparks(V3(-30 * Math.random(), 0.6, 2.2), '#ffcf7a', 3);
      if (Math.random() < 0.15) this.g.cam.shake(0.2);
    });
    C.walkTarget = 0;
    audio.setAmbience('rail', 0);
    this.cut(fixedShot(V3(carX(1) + 8, ROOF_Y + 1.8, 3.5), V3(carX(1) + 5, ROOF_Y + 1.5, -0.5), 36), 0, 'roof-two');
    this.lyra.lookAtTarget = C.root.position.clone().add(V3(0, 160, 0));
    this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 1.5, 0));
    await this.say('LYRA', "It isn't attacking. It stopped for me. It's... waiting.");
    await this.say('KAEL', "You want to go to it.");
    await this.say('LYRA', 'I want to know why it carried me for three hundred years. Will you come?');
    await this.say('KAEL', "...I was ordered to escort you. Nobody said where to.");
    this.cut(orbitShot(V3(carX(1) + 5, ROOF_Y + 1, 0), 18, 3, 2.6, 3.6, 7, 50, V3(60, 60, 0)), 0, 'roof-orbit');
    await this.wait(5);
    await this.fadeOut(1.4);
    this.trainSpeed = TRAIN_SPEED;
    void clamp;
  }
}

export { Warden };
