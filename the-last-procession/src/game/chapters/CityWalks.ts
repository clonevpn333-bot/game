import * as THREE from 'three';
import { AurelChapter } from './Prologue';
import { dollyShot, fixedShot, followShot, orbitShot, trackShot } from '../CameraDirector';
import { AUREL, aurelGround } from '../../world/Aurel';
import { Debris, Shockwaves, Telegraph } from '../Hazards';
import { Horse } from '../../actors/Horse';
import { clamp, V3 } from '../../utils/math';

const EAST = Math.PI / 2;

// ============================================================================
// CHAPTER ONE — THE CITY WALKS
// ============================================================================
export class CityWalks extends AurelChapter {
  static meta = { num: 'Chapter One', title: 'The City Walks', subtitle: 'Escape Aurel while the Pilgrim strides through it.' };
  readonly id = 'city';
  readonly num = CityWalks.meta.num;
  readonly title = CityWalks.meta.title;
  readonly subtitle = CityWalks.meta.subtitle;
  readonly checkpoints = ['intro', 'escape', 'alley', 'stride', 'bridge', 'gate'];
  debris!: Debris;
  waves!: Shockwaves;
  horse!: Horse;
  private footTele: Telegraph[] = [];
  private nextDrop = 0;
  private bridgeFront = -1;
  private sectionFall: number[] = [];
  private lyraGlide = false;
  private barricade!: THREE.Group;
  private stompHurts = 0; // radius of direct footfall damage (0 = off)
  private shotTimer = 0;

  build(): void {
    this.buildAurelSet(false);
    this.debris = new Debris(this.g, this.group);
    this.waves = new Shockwaves(this.g, this.group);
    for (let i = 0; i < 2; i++) {
      const t = new Telegraph('#ff4a2a');
      this.footTele.push(t);
      this.group.add(t.group);
    }
    this.horse = new Horse();
    this.horse.root.position.set(AUREL.gateX + 34, 0, 3);
    this.horse.root.rotation.y = EAST;
    this.group.add(this.horse.root);
    // barricade of carts + crates across the avenue
    this.barricade = new THREE.Group();
    const wood = new THREE.MeshStandardMaterial({ color: '#6a4528', roughness: 0.9 });
    const cloth = new THREE.MeshStandardMaterial({ color: '#8c1f24', roughness: 0.9 });
    for (let z = -7; z <= 7; z += 3.5) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6 + Math.abs(z) * 0.08, 2.4), wood);
      crate.position.set(0, 0.8, z);
      crate.rotation.y = z * 0.2;
      crate.castShadow = true;
      this.barricade.add(crate);
    }
    const banner = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 16), cloth);
    banner.position.set(-0.8, 2.2, 0);
    this.barricade.add(banner);
    this.barricade.position.set(178, 0, 0);
    this.group.add(this.barricade);
    // city collision: building footprints along the avenue + plaza ring
    for (const r of this.set.city.rects(0.2)) this.solids.push(r);
    this.bounds = { x0: -40, x1: AUREL.gateX + 60, z0: -AUREL.avenueHalf + 0.5, z1: AUREL.avenueHalf - 0.5 };
    this.pilgrim.onStomp = (p) => this.onStomp(p);
  }

  ground(x: number, z: number): number {
    return aurelGround(this.set, x, z);
  }

  collide(p: THREE.Vector3, r: number): void {
    super.collide(p, r);
    this.debris.collide(p, r);
  }

  private onStomp(p: THREE.Vector3): void {
    this.stomp(p);
    // the giant flattens whatever it steps on
    const crushed = this.set.city.crush(p.x, p.z, 16);
    for (const c of crushed) this.g.particles.impactDust(c, 6);
    if (crushed.length) this.g.audio.sfx('crash', 0.8, 0.7);
    const d = Math.hypot(p.x - this.hero.pos.x, p.z - this.hero.pos.z);
    if (this.heroActive && d < 120) this.waves.spawn(p, d + 18, 24);
    if (this.heroActive && this.stompHurts > 0 && d < this.stompHurts) {
      this.hero.damage(2, p);
      this.hero.vel.y = 8;
      this.hero.onGround = false;
    }
    // masonry shaken loose rains into the avenue near Kael
    if (this.heroActive && d < 110 && this.nextDrop >= 0) {
      for (let i = 0; i < 2; i++) this.dropNear(10 + Math.random() * 14);
    }
  }

  private dropNear(ahead: number): void {
    const x = this.hero.pos.x + ahead;
    if (x > AUREL.canal0 - 6 && x < AUREL.canal1 + 4) return;
    const z = (Math.random() * 2 - 1) * (AUREL.avenueHalf - 2);
    this.debris.drop(V3(x, 0, z), 1.8 + Math.random() * 1.2, 1.25 + Math.random() * 0.4);
  }

  tick(dt: number): void {
    super.tick(dt);
    this.horse.update(dt);
    this.debris.update(dt, this.heroActive ? this.hero : null, this.time, (x, z) => this.ground(x, z));
    this.waves.update(dt, this.heroActive ? this.hero : null);
    // footfall telegraphs from the exact predicted landing spots
    this.pilgrim.legs.forEach((_, i) => {
      const t = this.footTele[i];
      const pr = this.pilgrim.predictLanding(i);
      if (pr && this.stompHurts > 0 && Math.hypot(pr.pos.x - this.hero.pos.x, pr.pos.z - this.hero.pos.z) < 90) t.show(pr.pos.x, 0, pr.pos.z, 14, pr.progress, this.time);
      else t.hide();
    });
    // bridge collapse
    for (let i = 0; i < this.set.bridge.length; i++) {
      if (this.set.bridgeAlive[i] || this.sectionFall[i] === undefined) continue;
      this.sectionFall[i] += dt;
      const m = this.set.bridge[i];
      m.position.y -= dt * (4 + this.sectionFall[i] * 16);
      m.rotation.z += dt * (i % 2 ? 0.6 : -0.5);
      m.visible = m.position.y > -30;
    }
    if (this.lyraGlide && this.lyra.root.visible) {
      const lp = this.lyra.root.position;
      if (this.ground(lp.x, lp.z) < -1) {
        lp.y = Math.max(lp.y, this.hero.pos.y + 0.2);
        if (Math.random() < 0.5) this.g.particles.motes(lp.clone().add(V3(0, 0.6, 0)), '#9ff7ff', 1, 0.4);
      }
    }
  }

  private collapseSection(i: number): void {
    if (i < 0 || i >= this.set.bridge.length || !this.set.bridgeAlive[i]) return;
    this.set.bridgeAlive[i] = false;
    this.sectionFall[i] = 0;
    const m = this.set.bridge[i];
    this.g.particles.impactDust(m.position.clone(), 3);
    this.g.audio.sfx('crash', 0.7, 0.8 + Math.random() * 0.3);
    this.g.cam.shake(0.15);
  }

  private resetBridge(): void {
    const A = AUREL;
    const secLen = (A.canal1 - A.canal0) / A.bridgeSections;
    this.set.bridge.forEach((m, i) => {
      m.position.set(A.canal0 + secLen * (i + 0.5), 0, 0);
      m.rotation.set(0, 0, 0);
      m.visible = true;
      this.set.bridgeAlive[i] = true;
    });
    this.sectionFall = [];
    this.bridgeFront = -1;
  }

  private followCam(label = 'follow', dist = 6.8, height = 2.6): void {
    this.cut(
      followShot({ target: () => this.hero.pos, yaw: () => EAST, distance: dist, height, lookHeight: 1.7, lookAhead: 7, fov: 60, lag: 0.12, extraLook: () => this.pilgrim.root.position.clone().add(V3(0, 120, 0)), extraWeight: 0.03 }),
      0,
      label,
    );
  }

  private chaseFront(): void {
    // running toward camera, the giant looming behind them
    this.cut(trackShot(() => this.hero.pos, V3(10, 1.2, -4.5), V3(0, 1.6, 0), 66, 0.15, () => this.hero.pos.clone().add(V3(0, 3, 0)).lerp(this.pilgrim.pelvis.getWorldPosition(new THREE.Vector3()), 0.05)), 0, 'chase-front');
  }

  private sideWide(): void {
    this.cut(trackShot(() => this.hero.pos, V3(4, 9, -34), V3(0, 6, 0), 46, 0.25, () => this.hero.pos.clone().lerp(this.pilgrim.root.position.clone().add(V3(0, 70, 0)), 0.42)), 0, 'side-wide');
  }

  async script(from: string): Promise<void> {
    const P = this.pilgrim;
    const ui = this.g.ui;
    const audio = this.g.audio;
    this.sky('sunset');
    audio.setAmbience('wind', 0.35);
    audio.setAmbience('rumble', 0.5);
    audio.setAmbience('crowd', 0.3);
    this.hero.basisYaw = () => EAST;
    this.lyraFollowOffset.set(1.2, 0, -1.8);

    if (this.reached(from, 'intro')) {
      this.checkpoint('intro');
      this.cinematic(true);
      ui.setFadeInstant(1);
      this.music('action');
      audio.intensity = 0.7;
      P.root.position.set(-30, 0, 120);
      P.heading = EAST;
      P.walk = P.walkTarget = 1;
      this.stage(V3(36, 0, 0), EAST, V3(34.5, 0, -1.6), EAST);
      this.cut(dollyShot(V3(60, 1.2, 5), V3(56, 1.6, 4), V3(30, 30, 40), () => P.root.position.clone().add(V3(0, 150, 0)), 5, 64, 56), 0, 'open-low');
      this.go(this.fadeIn(1));
      await this.card(this.num, this.title, 'The Pilgrim follows her. Through walls, through houses, through everything.', 3);
      this.cut(fixedShot(V3(39, 1.6, 2.4), V3(35.5, 1.5, -0.4), 36), 0, 'two-shot');
      this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 1.4, 0));
      this.lyra.lookAtTarget = P.root.position.clone().add(V3(0, 150, 0));
      await this.say('LYRA', "It's coming after me. I can hear it — it's calling my name. I didn't know I <i>had</i> a name.");
      await this.say('KAEL', "Then let it call. Stay behind me. Run when I run.");
      this.hero.char.lookAtTarget = null;
      this.lyra.lookAtTarget = null;
    }

    if (this.reached(from, 'escape')) {
      this.music('action');
      audio.intensity = 0.8;
      await this.segment(
        'escape',
        () => {
          this.debris.clear();
          this.waves.clear();
          this.stage(V3(42, 0, 0), EAST, V3(40, 0, -1.6), EAST);
          this.heroActive = true;
          this.lyraFollow = true;
          this.hero.canAttack = true;
          P.root.position.set(this.hero.pos.x - 30, 0, 70);
          P.heading = EAST;
          P.walk = P.walkTarget = 1;
          P.kneel = 0;
          P.chestOpen = 0;
          this.stompHurts = 0;
          this.nextDrop = 1.5;
          ui.objective('Escape to the East Gate');
          this.chaseFront();
          this.shotTimer = 0;
        },
        (dt) => {
          const h = this.hero;
          P.speed = clamp(8 + (h.pos.x + 10 - P.root.position.x) * 0.25, 5, 13);
          this.nextDrop -= dt;
          if (this.nextDrop < 0 && h.pos.x > 70) {
            this.nextDrop = 1.1 + Math.random() * 0.6;
            this.dropNear(12 + Math.random() * 12);
          }
          ui.progress((h.pos.x - 40) / (AUREL.gateX - 40));
          // authored camera rhythm while running
          this.shotTimer += dt;
          const L = this.g.cam.label;
          if (L === 'chase-front' && (this.shotTimer > 4.5 || h.pos.x > 66)) {
            this.followCam();
            this.shotTimer = 0;
          } else if (L === 'follow' && this.shotTimer > 7 && h.pos.x > 90 && h.pos.x < 125) {
            this.sideWide();
            this.shotTimer = 0;
          } else if (L === 'side-wide' && this.shotTimer > 3.2) {
            this.followCam('follow-b');
            this.shotTimer = 0;
          }
          if (this.waves.incoming(h)) ui.prompt('jump', 'Jump the shockwave', true);
          else if (this.shotTimer < 3 && L === 'follow') ui.prompt('move', 'Run');
          else ui.prompt(null);
          return h.pos.x > 150 ? 'win' : undefined;
        },
      );
    }

    if (this.reached(from, 'alley')) {
      this.music('action');
      await this.segment(
        'alley',
        () => {
          this.debris.clear();
          this.waves.clear();
          this.stage(V3(150, 0, 0), EAST, V3(148, 0, -1.6), EAST);
          this.heroActive = true;
          this.lyraFollow = true;
          this.hero.canAttack = true;
          P.root.position.set(170, 0, 92);
          P.heading = EAST;
          P.walkTarget = 0.35;
          P.speed = 6;
          this.solids = this.solids.filter((s) => s !== barricadeRect);
          this.solids.push(barricadeRect);
          this.barricade.visible = true;
          this.barricade.rotation.set(0, 0, 0);
          this.stompHurts = 0;
          for (let i = 0; i < 3; i++) {
            const w = this.spawnWarden(V3(168 + i * 2, 0, -4 + i * 4), -EAST);
            w.aggression = 0.9 + i * 0.1;
          }
          ui.objective('Cut through the Bellwardens');
          this.cut(followShot({ target: () => this.hero.pos, yaw: () => EAST, distance: 8.5, height: 5.2, lookHeight: 0.8, lookAhead: 4, fov: 56, lag: 0.15 }), 0.8, 'combat');
          this.shotTimer = 0;
        },
        (dt) => {
          const alive = this.updateWardens(dt, 1);
          this.shotTimer += dt;
          const winding = this.wardens.some((w) => w.state === 'windup');
          if (winding) ui.prompt('dodge', 'Dodge the swing', true);
          else if (this.shotTimer < 6) ui.prompt('attack', 'Strike');
          else ui.prompt(null);
          return alive === 0 ? 'win' : undefined;
        },
      );
      // the barricade gives way
      this.solids = this.solids.filter((s) => s !== barricadeRect);
      this.barricade.rotation.z = -0.4;
      this.barricade.position.y = -0.5;
      audio.sfx('crash', 0.8);
    }

    if (this.reached(from, 'stride')) {
      this.music('action');
      audio.intensity = 1;
      await this.segment(
        'stride',
        () => {
          this.debris.clear();
          this.waves.clear();
          this.stage(V3(182, 0, 0), EAST, V3(180, 0, -1.6), EAST);
          this.heroActive = true;
          this.lyraFollow = true;
          this.barricade.visible = false;
          this.solids = this.solids.filter((s) => s !== barricadeRect);
          // the Pilgrim turns and strides straight across the avenue
          P.root.position.set(205, 0, 40);
          P.heading = Math.PI - 0.25;
          P.speed = 8;
          P.walk = P.walkTarget = 1;
          P.phase = 0.1;
          this.stompHurts = 15;
          ui.objective('Run beneath its stride');
          this.cut(trackShot(() => this.hero.pos, V3(15, 1.0, -9), V3(0, 6, 0), 72, 0.2, () => this.hero.pos.clone().add(V3(0, 2, 0)).lerp(P.pelvis.getWorldPosition(new THREE.Vector3()), 0.32)), 0.8, 'under');
          this.shotTimer = 0;
        },
        (dt) => {
          const h = this.hero;
          this.shotTimer += dt;
          ui.progress((h.pos.x - 40) / (AUREL.gateX - 40));
          const L = this.g.cam.label;
          if (L === 'under' && this.shotTimer > 5) {
            this.followCam('follow-c', 7.5, 3);
            this.shotTimer = 0;
          }
          let danger = false;
          P.legs.forEach((_, i) => {
            const pr = P.predictLanding(i);
            if (pr && Math.hypot(pr.pos.x - h.pos.x, pr.pos.z - h.pos.z) < 18 && pr.progress > 0.35) danger = true;
          });
          if (danger) ui.prompt('dodge', 'Get clear of the foot', true);
          else if (this.waves.incoming(h)) ui.prompt('jump', 'Jump', true);
          else ui.prompt(null);
          return h.pos.x > AUREL.canal0 - 2 ? 'win' : undefined;
        },
      );
    }

    if (this.reached(from, 'bridge')) {
      await this.segment(
        'bridge',
        () => {
          this.debris.clear();
          this.waves.clear();
          this.resetBridge();
          this.stage(V3(AUREL.canal0 - 4, 0, 0), EAST, V3(AUREL.canal0 - 6, 0, -1.4), EAST);
          this.heroActive = true;
          this.lyraFollow = true;
          this.lyraGlide = true;
          this.stompHurts = 0;
          P.root.position.set(250, 0, -90);
          P.heading = Math.PI - 0.3;
          P.walk = P.walkTarget = 1;
          // the far section is already gone: the gap must be jumped
          this.collapseSection(7);
          this.sectionFall[7] = 2;
          ui.objective('Cross before the bridge falls');
          this.cut(trackShot(() => this.hero.pos, V3(3, 3.2, -19), V3(0, 1, 0), 50, 0.12, () => this.hero.pos.clone().add(V3(5, 0.6, 0))), 0.5, 'bridge-side');
        },
        () => {
          const h = this.hero;
          const A = AUREL;
          const secLen = (A.canal1 - A.canal0) / A.bridgeSections;
          ui.progress((h.pos.x - 40) / (A.gateX - 40));
          // the collapse chases Kael across
          if (h.pos.x > A.canal0 + 2 && this.bridgeFront < 0) this.bridgeFront = A.canal0 - 2;
          if (this.bridgeFront >= 0) {
            this.bridgeFront += this.g.realDt * this.g.timeScale * 6.6;
            const idx = Math.floor((this.bridgeFront - A.canal0) / secLen);
            for (let i = 0; i <= Math.min(idx, A.bridgeSections - 1); i++) this.collapseSection(i);
          }
          const gapX = A.canal0 + secLen * 7;
          if (h.pos.x > gapX - 7 && h.pos.x < gapX && h.onGround) ui.prompt('jump', 'Jump!', true);
          else ui.prompt(null);
          if (h.pos.y < -5) return 'fail';
          return h.pos.x > A.canal1 + 6 ? 'win' : undefined;
        },
      );
      this.lyraGlide = false;
      // home stretch to the gate (no hazards, the giant receding)
      await this.segment(
        'gate',
        () => {
          this.stage(V3(AUREL.canal1 + 8, 0, 0), EAST, V3(AUREL.canal1 + 6, 0, -1.4), EAST);
          this.heroActive = true;
          this.lyraFollow = true;
          ui.objective('Reach the East Gate');
          this.chaseFront();
        },
        () => {
          ui.progress((this.hero.pos.x - 40) / (AUREL.gateX - 40));
          if (this.g.cam.label === 'chase-front' && this.g.cam.modeTime > 4) this.followCam('follow-gate');
          return this.hero.pos.x > AUREL.gateX - 8 ? 'win' : undefined;
        },
        { resolve: false },
      );
    }

    // ---------------------------------------------------------------- gate cutscene
    this.checkpoint('gate');
    this.cinematic(true);
    this.music('wonder');
    audio.intensity = 0.6;
    const gx = AUREL.gateX;
    this.stage(V3(gx + 26, 0, -1), EAST, V3(gx + 24.5, 0, -2.6), EAST);
    this.horse.root.position.set(gx + 31, 0, 1.5);
    this.horse.root.rotation.y = -Math.PI / 2 + 0.4;
    P.root.position.set(gx - 140, 0, 60);
    P.heading = EAST;
    P.walk = P.walkTarget = 0.6;
    this.cut(fixedShot(V3(gx + 29, 1.7, -5.5), V3(gx + 26, 1.5, -1.2), 38), 0, 'gate-two');
    this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 1.3, 0));
    this.lyra.lookAtTarget = this.hero.char.root.position.clone().add(V3(0, 1.6, 0));
    await this.say('KAEL', 'Can you ride?');
    await this.say('LYRA', "I don't know. Until this morning I'd never been... anything.");
    this.hero.char.setMode('point');
    await this.say('KAEL', 'Then hold on to me. And try not to let go.');
    this.hero.char.setMode('idle');
    // mount up
    this.hero.char.setMode('ride', 0.3);
    this.lyra.setMode('ride', 0.3);
    this.horse.root.rotation.y = EAST;
    const mount = () => {
      this.horse.root.updateMatrixWorld(true);
      const s = this.horse.saddle.getWorldPosition(new THREE.Vector3());
      const b = this.horse.pillion.getWorldPosition(new THREE.Vector3());
      this.hero.char.root.position.copy(s).add(V3(0, -0.95 + 0.35, 0));
      this.hero.char.yaw = this.hero.char.targetYaw = this.horse.root.rotation.y;
      this.lyra.root.position.copy(b).add(V3(0, -0.95 + 0.4, 0));
      this.lyra.yaw = this.lyra.targetYaw = this.horse.root.rotation.y;
      this.hero.pos.copy(this.hero.char.root.position);
    };
    mount();
    this.cut(orbitShot(() => this.horse.root.position.clone().add(V3(0, 2, 0)), 9, 1.5, 0.6, 2.2, 6, 44), 0, 'mount');
    audio.sfx('hoof', 1);
    await this.wait(1.6);
    this.horse.speed = 14;
    this.cut(dollyShot(V3(gx + 40, 3, 14), V3(gx + 80, 40, 30), () => this.horse.root.position.clone().add(V3(0, 1.5, 0)), () => P.root.position.clone().add(V3(0, 120, 0)), 6, 46, 40), 0, 'ride-out');
    await this.animate(6, () => {
      this.horse.root.position.x += 14 * this.g.realDt * this.g.timeScale;
      mount();
    });
    await this.fadeOut(1.2);
  }
}

const barricadeRect = { x0: 176.5, x1: 179.5, z0: -9, z1: 9 };
