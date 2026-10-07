import * as THREE from 'three';
import { Chapter } from '../Chapter';
import { dollyShot, fixedShot, followShot, orbitShot, trackShot } from '../Camera';
import { buildAurel, aurelGround, type AurelSet } from '../../world/City';
import { Antlered, Carillon, Pilgrim, Seraph } from '../../world/Colossus';
import type { Actor } from '../../actors/Actor';
import { waveBanner, glowCard } from '../../world/Props';
import { easeInOut, easeOut, lerpAngle, V3 } from '../../util/math';
import { Telegraph } from '../Hazards';

/** Shared set dressing + per-frame animation for chapters staged in Aurel. */
export abstract class AurelChapter extends Chapter {
  set!: AurelSet;
  pilgrim!: Pilgrim;
  antlered!: Antlered;
  carillon!: Carillon;
  seraphs: Seraph[] = [];

  ground(x: number, z: number): number {
    return this.set ? aurelGround(this.set, x, z) : 0;
  }

  protected buildAurelSet(crowd: boolean): void {
    this.set = buildAurel(crowd);
    this.group.add(this.set.root);
    this.grass = this.set.grass;
    // seraphs wheel high above the capital
    for (let i = 0; i < 2; i++) {
      const s = new Seraph(i > 0);
      s.root.position.set(i ? 900 : -500, 0, i ? 1400 : 900);
      s.altitude = i ? 520 : 340;
      s.heading = i ? 2 : -1;
      s.walk = s.walkTarget = 1;
      s.speed = 12;
      this.group.add(s.root);
      this.seraphs.push(s);
    }
    this.pilgrim = new Pilgrim();
    this.group.add(this.pilgrim.root);
    this.antlered = new Antlered(true);
    this.antlered.root.position.set(-2300, 0, 1300);
    this.antlered.heading = Math.PI / 2;
    this.carillon = new Carillon(true);
    this.carillon.root.position.set(2600, 0, 1500);
    this.carillon.heading = -Math.PI / 2;
    this.group.add(this.antlered.root, this.carillon.root);
    this.pilgrim.onStomp = (p) => this.stomp(p);
    this.colliders.push({ x: 0, z: 0, r: 7.6 });
  }

  protected stomp(p: THREE.Vector3): void {
    const d = p.distanceTo(this.g.cam.camera.position);
    this.g.cam.shake(Math.min(0.9, 140 / (d + 60)));
    this.g.audio.sfx('stomp', Math.min(1, 260 / (d + 80)), 0.9 + Math.random() * 0.2);
    this.g.particles.stompDust(p, 22);
  }

  tick(dt: number): void {
    this.pilgrim.update(dt, this.time);
    this.antlered.update(dt, this.time);
    this.carillon.update(dt, this.time);
    this.set.crowd.update(dt, this.time);
    for (const s of this.seraphs) {
      s.heading += dt * 0.018;
      s.update(dt, this.time);
    }
    this.set.birds.update(dt, this.time);
    for (const b of this.set.banners) waveBanner(b, this.time, 1);
  }
}

export class TitleReel extends AurelChapter {
  static meta = { num: '', title: '', subtitle: '' };
  readonly id = 'title';
  readonly num = '';
  readonly title = '';
  readonly subtitle = '';
  readonly checkpoints = ['loop'];

  build(): void {
    this.buildAurelSet(true);
    this.pilgrim.root.position.set(-420, 0, 560);
    this.pilgrim.heading = Math.PI / 2;
    this.pilgrim.walk = this.pilgrim.walkTarget = 1;
    this.antlered.walk = this.antlered.walkTarget = 1;
    this.carillon.walk = this.carillon.walkTarget = 1;
    this.pilgrim.onStomp = (p) => this.g.audio.sfx('stomp', 0.35, 0.8 + (p.x % 1) * 0);
  }

  async script(_from = 'loop'): Promise<void> {
    this.sky('sunset');
    this.music('wonder');
    this.g.audio.setAmbience('wind', 0.35);
    this.g.audio.setAmbience('crowd', 0.2);
    this.cinematic(false);
    this.g.input.enabled = false;
    const P = this.pilgrim;
    const shots = [
      // over the rooftops toward the fields: the giant crossing the horizon
      () => dollyShot(V3(-40, 48, 40), V3(30, 52, 52), () => P.root.position.clone().add(V3(170, 95, 0)), () => P.root.position.clone().add(V3(140, 100, 0)), 16, 40, 36),
      // low in the wheat as it strides past
      () => dollyShot(() => P.root.position.clone().add(V3(160, 3, -170)), () => P.root.position.clone().add(V3(120, 5, -150)), () => P.root.position.clone().add(V3(60, 110, -30)), () => P.root.position.clone().add(V3(50, 120, -30)), 16, 50, 46),
      // high aerial over the capital, the Pilgrim beyond the wall
      () => dollyShot(V3(-30, 140, -330), V3(30, 120, -280), V3(120, 30, 400), () => P.root.position.clone().add(V3(160, 80, 0)), 16, 38, 34),
    ];
    for (let i = 0; ; i++) {
      if (P.root.position.x > 500) P.root.position.x = -420;
      this.cut(shots[i % shots.length](), 0, 'title');
      await this.wait(12);
    }
  }
}

// ============================================================================
// PROLOGUE — THE KNEELING
// ============================================================================
export class Prologue extends AurelChapter {
  static meta = { num: 'Prologue', title: 'The Kneeling', subtitle: 'In which the largest thing in the world stops.' };
  readonly id = 'prologue';
  readonly num = Prologue.meta.num;
  readonly title = Prologue.meta.title;
  readonly subtitle = Prologue.meta.subtitle;
  readonly checkpoints = ['intro', 'kneel', 'run', 'catch'];
  maren!: Actor;
  vesk!: Actor;
  guards: Actor[] = [];
  wardensC: Actor[] = [];
  private readonly landing = V3(0, 0, 24);
  private floatT = 0;
  private floatDur = 15;
  private floatFrom = V3();
  private beam!: THREE.Sprite;
  private marker!: Telegraph;
  private carry = false;

  build(): void {
    this.buildAurelSet(true);
    this.maren = this.actor('maren', 'sword');
    this.vesk = this.actor('vesk', 'hammer');
    for (let i = 0; i < 2; i++) {
      const g = this.actor('guard', 'halberd');
      g.place(V3(-6 + i * 9, 0, -30), 0);
      g.setMode('guard', 0);
      this.guards.push(g);
    }
    for (let i = 0; i < 4; i++) {
      const w = this.actor('warden', 'halberd');
      w.root.visible = false;
      this.wardensC.push(w);
    }
    this.vesk.root.visible = false;
    this.beam = glowCard('#9ff7ff', 4.5, 0.0);
    this.group.add(this.beam);
    this.marker = new Telegraph('#8ff7ff');
    this.group.add(this.marker.group);
    for (const p of this.set.crowd.pts) this.colliders.push({ x: p.x, z: p.z, r: 0.45 });
    this.bounds = { x0: -36, x1: 36, z0: -36, z1: 40 };
  }

  tick(dt: number): void {
    super.tick(dt);
    this.maren.update(dt);
    this.vesk.update(dt);
    for (const g of this.guards) g.update(dt);
    for (const w of this.wardensC) if (w.root.visible) w.update(dt);
    if (this.carry) this.holdLyra();
    // Lyra's glow pulses with the Pilgrim's cradle
    this.lyra.setGlow(2 + Math.sin(this.time * 2.4) * 0.6);
  }

  private holdLyra(): void {
    const h = this.hero.char;
    const f = new THREE.Vector3(Math.sin(h.yaw), 0, Math.cos(h.yaw));
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const p = h.root.position.clone().addScaledVector(f, 0.42).add(V3(0, 1.12, 0)).addScaledVector(r, 0.55);
    this.lyra.root.position.copy(p);
    this.lyra.yaw = this.lyra.targetYaw = h.yaw + Math.PI / 2;
    this.lyra.root.rotation.y = this.lyra.yaw;
  }

  private floatPos(k: number): THREE.Vector3 {
    // drifting ribbon descent from the cradle to the plaza
    const e = easeInOut(k);
    const p = this.floatFrom.clone().lerp(this.landing.clone().setY(1.2), e);
    p.x += Math.sin(k * Math.PI * 3) * 6 * (1 - k);
    p.y = THREE.MathUtils.lerp(this.floatFrom.y, 1.25, easeOut(k) * 0.4 + e * 0.6);
    return p;
  }

  async script(from: string): Promise<void> {
    const P = this.pilgrim;
    const ui = this.g.ui;
    const audio = this.g.audio;
    this.sky('sunset');
    audio.setAmbience('crowd', 0.5);
    audio.setAmbience('wind', 0.3);
    this.hero.object.visible = true;

    if (this.reached(from, 'intro')) {
      this.checkpoint('intro');
      this.cinematic(true);
      ui.setFadeInstant(1);
      this.music('none');
      audio.sfx('bell', 0.7, 0.9);
      await this.caption('Every three hundred years, they wake.', 3.4);
      audio.sfx('bell', 0.6, 0.75);
      await this.caption('And when the Procession begins,<br/>you stay out of their way.', 3.8);
      this.music('wonder');
      // establishing: the Pilgrim beyond the north wall, striding toward the capital
      P.root.position.set(40, 0, 760);
      P.heading = Math.PI;
      P.walk = P.walkTarget = 1;
      this.stage(V3(2, 0, -24), 0, null, 0);
      this.maren.place(V3(-1.6, 0, -22.5), 0.2);
      this.cut(dollyShot(V3(-140, 110, -300), V3(-90, 80, -210), V3(0, 40, 300), V3(20, 100, 640), 14, 38, 34), 0, 'establishing');
      this.go(this.fadeIn(2.5));
      await this.wait(2.4);
      await this.card('Prologue', 'The Kneeling', 'Aurel, Capital of the Crown — the first Procession in three hundred years');
      await this.wait(2);
      // the plaza: Kael and Captain Maren
      this.cut(fixedShot(V3(4.2, 1.75, -18.5), V3(1.6, 1.62, -23.5), 32), 0, 'kael-close');
      this.hero.char.lookAtTarget = P.root.position.clone().add(V3(0, 150, 0));
      this.maren.lookAtTarget = this.hero.char.root.position.clone().add(V3(0, 1.6, 0));
      await this.wait(0.6);
      await this.say('KAEL', "It's turning. Captain — it's coming <i>here</i>.");
      this.cut(fixedShot(V3(-3.6, 1.8, -18.2), V3(-1.2, 1.55, -23), 34), 0, 'maren-close');
      await this.say('MAREN', 'Hold the line. Nobody runs. In ten thousand years, no one standing still has ever been stepped on.');
      this.cut(fixedShot(V3(4.2, 1.75, -18.5), V3(1.6, 1.62, -23.5), 32), 0, 'kael-close');
      await this.say('KAEL', "That's not as comforting as you think it is.");
      this.cut(fixedShot(V3(-3.6, 1.8, -18.2), V3(-1.2, 1.55, -23), 34), 0, 'maren-close');
      await this.say('MAREN', "It isn't meant to comfort. It's meant to be true.");
      // wide over the crowd toward the wall as it closes in
      P.root.position.set(20, 0, 330);
      this.cut(dollyShot(V3(0, 4, -40), V3(0, 6, -34), V3(0, 30, 120), V3(0, 80, 200), 7, 50, 46), 0, 'crowd-wide');
      audio.setAmbience('crowd', 0.8);
      await this.until(() => P.root.position.z < 225);
      // low shot at the wall: the foot comes down
      this.cut(fixedShot(V3(-30, 3, 52), () => P.root.position.clone().add(V3(0, 40, 0)), 62, -0.04), 0, 'foot-low');
      await this.until(() => P.root.position.z < 175);
    }

    if (this.reached(from, 'kneel')) {
      this.checkpoint('kneel');
      this.cinematic(true);
      this.stage(V3(2, 0, -24), 0, null, 0);
      this.maren.place(V3(-1.6, 0, -22.5), 0.2);
      P.root.position.set(0, 0, 150);
      P.heading = Math.PI;
      P.walkTarget = 0;
      P.walk = 0;
      P.kneel = 0;
      this.music('none');
      audio.setAmbience('crowd', 0.15);
      audio.setAmbience('rumble', 0.7);
      this.set.crowd.lookAt = V3(0, 0, 150);
      this.hero.char.lookAtTarget = V3(0, 120, 150);
      this.maren.lookAtTarget = V3(0, 120, 150);
      // it stops. it kneels.
      this.cut(dollyShot(V3(8, 3.4, -31), V3(6, 3.0, -28), V3(0, 84, 120), V3(0, 74, 120), 9, 64, 60), 0, 'kneel-low');
      audio.sfx('creak', 1, 0.6);
      await this.animate(7, (k) => {
        P.kneel = k;
        if (Math.random() < 0.06) this.g.cam.shake(0.18);
      });
      this.g.cam.shake(0.9);
      audio.sfx('stomp', 1, 0.7);
      this.g.particles.stompDust(V3(0, 0, 112), 26);
      await this.wait(1.2);
      this.cut(fixedShot(V3(-5, 1.5, -12), V3(2, 1.8, -24), 40), 0, 'crowd-react');
      this.hero.char.root.visible = true;
      await this.say('CROWD', "<i>(a hundred thousand people, holding their breath)</i>", { hold: 2.4, actor: null });
      // the chest opens
      this.cut(dollyShot(V3(0, 22, 46), V3(0, 30, 60), V3(0, 75, 110), V3(0, 72, 110), 7, 42, 34), 0, 'chest');
      audio.sfx('creak', 1, 0.5);
      await this.wait(0.8);
      audio.sfx('choir', 1);
      await this.animate(3.2, (k) => (P.chestOpen = k));
      this.g.pipeline.grade.uniforms.uFlash.value = 0.6;
      this.music('wonder');
      this.lyra.root.visible = true;
      this.floatFrom = P.cradleAnchor.getWorldPosition(new THREE.Vector3());
      this.lyra.place(this.floatFrom, Math.PI);
      this.lyra.setMode('float', 0);
      await this.flashDecay(1.2);
      await this.wait(1.6);
      this.cut(fixedShot(V3(3, 1.7, -21), () => this.lyra.root.position.clone(), 26), 0, 'kael-sees');
      await this.say('KAEL', '...Is that — a <i>girl?</i>');
    }

    if (this.reached(from, 'run')) {
      P.root.position.set(0, 0, 150);
      P.heading = Math.PI;
      P.walk = P.walkTarget = 0;
      P.kneel = 1;
      P.chestOpen = 1;
      this.floatFrom = P.cradleAnchor.getWorldPosition(new THREE.Vector3());
      this.music('wonder');
      this.maren.place(V3(-1.6, 0, -22.5), 0.2);
      await this.segment(
        'run',
        () => {
          this.stage(V3(2, 0, -24), 0, null, 0);
          this.hero.object.visible = true;
          this.lyra.root.visible = true;
          this.lyra.setMode('float', 0);
          this.floatT = 0;
          this.hero.canAttack = false;
          this.hero.char.lookAtTarget = null;
          this.hero.basisYaw = () => 0;
          this.set.crowd.panic = 0;
          ui.objective('Catch her');
          this.cut(followShot({ target: () => this.hero.pos, yaw: () => 0, distance: 6.2, height: 2.3, lookHeight: 4.2, lookAhead: 10, fov: 62, extraLook: () => this.lyra.root.position, extraWeight: 0.06 }), 0.6, 'follow');
        },
        (dt) => {
          const near = this.hero.pos.distanceTo(this.landing.clone().setY(this.hero.pos.y));
          // she drifts down; slows to a hover if Kael is far, so she always waits for him
          const speed = this.floatT > 0.82 && near > 4 ? 0.15 : 1;
          this.floatT = Math.min(1, this.floatT + (dt / this.floatDur) * speed);
          const lp = this.floatPos(this.floatT);
          this.lyra.root.position.copy(lp);
          this.lyra.targetYaw = Math.PI;
          if (Math.random() < 0.6) this.g.particles.motes(lp.clone().add(V3(0, 0.8, 0)), '#9ff7ff', 1, 0.6);
          this.beam.position.copy(lp).add(V3(0, 0.9, 0));
          (this.beam.material as THREE.SpriteMaterial).opacity = 0.45;
          this.marker.show(this.landing.x, 0, this.landing.z, 2.4, this.floatT, this.time);
          // authored camera moments during the run
          const mt = this.g.cam.modeTime;
          if (this.g.cam.label === 'follow' && mt > 4 && this.floatT < 0.55) {
            this.cut(trackShot(() => this.hero.pos, V3(-14, 3, 6), V3(0, 4, 0), 50, 0.2, () => this.hero.pos.clone().lerp(V3(0, 60, 130), 0.35)), 0, 'run-wide');
          } else if (this.g.cam.label === 'run-wide' && mt > 3.2) {
            this.cut(followShot({ target: () => this.hero.pos, yaw: () => 0, distance: 6.2, height: 2.3, lookHeight: 4.2, lookAhead: 10, fov: 62, extraLook: () => this.lyra.root.position, extraWeight: 0.06 }), 0, 'follow2');
          }
          if (near < 3.2 && lp.y < 6) ui.prompt('interact', 'Catch', true);
          else ui.prompt(null);
          if (near < 3.2 && lp.y < 6 && (this.g.input.consume('interact') || this.g.input.consume('jump') || lp.y < 2.3)) return 'win';
          return undefined;
        },
        { resolve: false },
      );
      this.marker.hide();
      (this.beam.material as THREE.SpriteMaterial).opacity = 0;
    }

    if (this.reached(from, 'catch')) {
      this.checkpoint('catch');
      if (this.hero.char.weapon) this.hero.char.weapon.visible = false;
      this.cinematic(true);
      P.root.position.set(0, 0, 150);
      P.heading = Math.PI;
      P.kneel = 1;
      P.chestOpen = 1;
      this.stage(V3(0, 0, 22.6), Math.PI, null, 0);
      this.lyra.root.visible = true;
      this.lyra.setMode('lie', 0.2);
      this.hero.char.setMode('carry', 0.15);
      this.carry = true;
      this.hero.char.lookAtTarget = null;
      audio.sfx('shimmer', 1);
      this.cut(orbitShot(() => this.hero.pos.clone().add(V3(0, 1.3, 0)), 3.2, 0.5, 2.2, 2.9, 7, 34), 0, 'catch-orbit');
      await this.wait(2.4);
      this.lyra.lookAtTarget = this.hero.char.root.position.clone().add(V3(0, 1.7, 0));
      this.cut(fixedShot(() => this.hero.pos.clone().add(V3(-1.2, 2.1, -1.0)), () => this.lyra.root.position.clone().add(V3(0.2, 0.2, 0)), 30), 0, 'lyra-wakes');
      this.lyra.setGlow(3.5);
      await this.say('LYRA', '...Is this the outside?');
      this.cut(fixedShot(() => this.hero.pos.clone().add(V3(0.9, 1.6, -1.6)), () => this.hero.pos.clone().add(V3(0, 1.6, 0)), 32), 0, 'kael-answers');
      await this.say('KAEL', "This is— the Plaza of Saint Aldric. You fell out of a— are you hurt?");
      this.cut(fixedShot(() => this.hero.pos.clone().add(V3(-1.2, 2.1, -1.0)), () => this.lyra.root.position.clone().add(V3(0.2, 0.2, 0)), 30), 0, 'lyra-close');
      await this.say('LYRA', "It's so quiet out here. It's never quiet inside.");
      // the giant turns its head to look at her
      this.cut(dollyShot(V3(6, 1.2, 14), V3(4, 1.4, 16), V3(0, 80, 120), V3(0, 76, 116), 6, 46, 40), 0, 'pilgrim-looks');
      audio.sfx('creak', 1, 0.45);
      await this.animate(4, (k) => {
        P.headPitch = -0.12 * k;
        P.headYaw = Math.sin(k * Math.PI) * 0.08;
        P.setGlow('#9ff7ff', 2.4 + k * 2);
      });
      // every Processional in the world changes direction
      this.cut(dollyShot(V3(0, 30, 40), V3(0, 34, 60), V3(-1800, 140, 1100), V3(-1700, 120, 1200), 6, 30, 26), 0, 'horizon-antlered');
      this.antlered.walk = this.antlered.walkTarget = 1;
      audio.sfx('bell', 0.6, 0.6);
      const a0 = this.antlered.heading;
      const c0 = this.carillon.heading;
      const aT = Math.atan2(-this.antlered.root.position.x, -this.antlered.root.position.z);
      const cT = Math.atan2(-this.carillon.root.position.x, -this.carillon.root.position.z);
      await this.animate(4.5, (k) => (this.antlered.heading = lerpAngle(a0, aT, easeInOut(k))));
      this.cut(dollyShot(V3(0, 30, 40), V3(10, 34, 60), V3(2300, 160, 1400), V3(2400, 150, 1300), 5, 28, 24), 0, 'horizon-carillon');
      this.carillon.walk = this.carillon.walkTarget = 1;
      await this.animate(4, (k) => (this.carillon.heading = lerpAngle(c0, cT, easeInOut(k))));
      this.music('action');
      this.g.audio.intensity = 0.4;
      this.maren.place(V3(-6, 0, 12), 0.4);
      this.cut(fixedShot(V3(-3, 1.9, 17), V3(-6, 1.6, 12), 36), 0, 'maren-run');
      await this.say('MAREN', "Kael! The others — every one of them, they've all turned. They're coming <i>here</i>.");
      // Vesk on the cathedral steps
      this.vesk.root.visible = true;
      this.vesk.place(V3(-44, 0, 2), Math.PI / 2);
      this.vesk.setMode('raise');
      this.wardensC.forEach((w, i) => {
        w.root.visible = true;
        w.place(V3(-40 + (i % 3) * 2.2, 0, -5 + i * 2.6), Math.PI / 2);
      });
      this.cut(dollyShot(V3(-32, 2.6, 8), V3(-34, 3, 6), V3(-44, 3, 2), V3(-44, 3.2, 2), 6, 34, 30), 0, 'vesk');
      audio.sfx('bell', 0.9, 0.5);
      await this.say('VESK', 'The Stilled One has spoken. The bell has fallen from the tower. <i>Bring me the girl.</i>');
      this.vesk.setMode('point');
      this.wardensC.forEach((w) => w.setMode('locomotion'));
      this.cut(fixedShot(V3(-4, 1.9, 18), V3(-6, 1.6, 12), 36), 0, 'maren-orders');
      this.maren.setMode('point');
      await this.say('MAREN', 'Bellwardens. Kael — take her. East Gate, then don\'t stop. Whatever she is, Vesk doesn\'t get her.');
      this.cut(fixedShot(() => this.hero.pos.clone().add(V3(1.6, 1.7, -2.2)), () => this.hero.pos.clone().add(V3(0, 1.6, 0)), 34), 0, 'kael-go');
      await this.say('KAEL', 'Yes, Captain. ...Hold on to me.');
      // it rises
      this.cut(dollyShot(V3(14, 1, 0), V3(16, 2, 4), V3(0, 60, 130), V3(0, 140, 140), 5, 60, 54), 0, 'rise');
      this.g.audio.intensity = 1;
      audio.sfx('creak', 1, 0.5);
      await this.animate(4.2, (k) => {
        P.kneel = 1 - k;
        P.chestOpen = 1 - k;
        this.g.cam.shake(0.03);
        this.set.crowd.panic = k;
      });
      audio.sfx('stomp', 1, 0.7);
      this.g.cam.shake(1);
      await this.fadeOut(1.2);
      this.carry = false;
    }
  }

  private async flashDecay(s: number): Promise<void> {
    const u = this.g.pipeline.grade.uniforms.uFlash;
    const v0 = u.value as number;
    await this.animate(s, (k) => (u.value = v0 * (1 - k)));
  }

}
