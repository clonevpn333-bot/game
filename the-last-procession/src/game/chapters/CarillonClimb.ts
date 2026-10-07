import * as THREE from 'three';
import { toonMat } from '../../world/Compat2';
import { Chapter } from '../Chapter';
import { dollyShot, fixedShot, orbitShot, type CamMode } from '../Camera';
import { Carillon, Pilgrim } from '../../world/Colossus';
import { fogBank, glowCard } from '../../world/Props';
import { makeMountainRing, makeTerrain } from '../../world/Compat';
import { G, merge, xf } from '../../world/Compat';
import { stoneTexture } from '../../gfx/Materials';
import { clamp, damp, fbm, V3, wrapAngle } from '../../util/math';

interface Vent {
  th: number;
  y: number;
  t: number;
  mesh: THREE.Mesh;
}

/**
 * Climbing a walking giant: Kael is constrained to the surface of the Carillon's
 * leg (cylindrical coords θ, y) and the leg's real transform carries him — so when
 * the giant takes a step, the whole climb swings through the sky with it.
 */
export class CarillonClimb extends Chapter {
  static meta = { num: 'Chapter Five', title: 'The Carillon', subtitle: 'Climb a walking temple while it walks.' };
  readonly id = 'climb';
  readonly num = CarillonClimb.meta.num;
  readonly title = CarillonClimb.meta.title;
  readonly subtitle = CarillonClimb.meta.subtitle;
  readonly checkpoints = ['intro', 'climb', 'summit'];
  C!: Carillon;
  private pilgrimFar!: Pilgrim;
  private th = 0; // angle around the leg
  private cy = 30; // height on the leg (world y)
  private grip = 0; // 0..1 hold meter during steps
  private stepT = -1;
  private nextStep = 6;
  private stepPhase = 0;
  private fallT = -1;
  private vents: Vent[] = [];
  private ledges: number[] = [];
  private lastLedge = 30;
  private kneeY = 194;
  private bellT = 0;
  private bellWarn!: THREE.Mesh;
  private camWide = false;
  private camT = 0;

  build(): void {
    this.addSeraph(new THREE.Vector3(-600, 0, -900), 420, 2);
    this.C = new Carillon();
    this.C.root.position.set(0, 0, 0);
    this.C.heading = 0;
    this.C.walk = 0;
    this.C.walkTarget = 0;
    this.C.holdPosition = true;
    this.group.add(this.C.root);
    this.pilgrimFar = new Pilgrim(true);
    this.pilgrimFar.root.position.set(-1600, 0, 2400);
    this.pilgrimFar.heading = 2.6;
    this.pilgrimFar.walk = this.pilgrimFar.walkTarget = 1;
    this.group.add(this.pilgrimFar.root);
    const ground = makeTerrain({
      size: 5000,
      seg: 120,
      height: (x, z) => fbm(x * 0.003, z * 0.003, 4) * 40 - 10 + Math.max(0, Math.hypot(x, z) - 600) * 0.12,
      color: (x, z, h) => new THREE.Color().setHSL(0.28 - h * 0.0008, 0.22, 0.38 + fbm(x * 0.01, z * 0.01, 2) * 0.08),
    });
    this.group.add(ground.mesh);
    // the broken viaduct and the stopped train below
    const stone = toonMat({ map: stoneTexture('#a49480', 12, 4), roughness: 0.9 });
    const via: THREE.BufferGeometry[] = [];
    for (let i = -8; i <= 8; i++) {
      if (i === 1 || i === 2) continue;
      via.push(xf(G.box(60, 3, 9), [60 + i * 60, 60, -40]), xf(G.box(7, 70, 8), [60 + i * 60 - 30, 25, -40]));
    }
    const v = new THREE.Mesh(merge(via), stone);
    v.castShadow = v.receiveShadow = true;
    this.group.add(v);
    this.group.add(makeMountainRing(3000, 26, 900, '#7a8aa8', 5));
    this.group.add(fogBank(30, V3(0, 120, 0), V3(1800, 160, 1800), 260, '#eef2f8', 0.35));
    // steam vents on the leg
    const ventGeo = xf(G.cyl(0.9, 1.3, 1.2, 8), [0, 0, 0.6], [Math.PI / 2, 0, 0]);
    const ventMat = toonMat({ color: '#2a2622', emissive: '#ff7a3a', emissiveIntensity: 0, metalness: 0.7, roughness: 0.4 });
    const defs: [number, number][] = [[0.0, 66], [0.9, 82], [-0.7, 98], [0.3, 116], [-0.4, 134], [0.8, 148], [-0.1, 160]];
    defs.forEach(([th, y], i) => {
      const m = new THREE.Mesh(ventGeo, ventMat.clone());
      this.group.add(m);
      this.vents.push({ th, y, t: i * 0.9, mesh: m });
    });
    this.bellWarn = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.4, 10, 24, 1, true, -0.7, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a2a').multiplyScalar(1.6), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    this.group.add(this.bellWarn);
    const sun = glowCard('#fff2d0', 400, 0.25);
    sun.position.set(-1400, 900, -2200);
    this.group.add(sun);
  }

  /** Axis of the climbable tibia (leg 0), from the live skeleton. */
  private axis(): THREE.Vector3 {
    return this.C.legs[0].knee.getWorldPosition(new THREE.Vector3());
  }

  private radiusAt(y: number): number {
    const k = this.axis().y;
    return 7 + (2 * clamp(k - y, 0, 186)) / 186 + 0.55;
  }

  private surface(th: number, y: number, off = 0): THREE.Vector3 {
    const a = this.axis();
    const r = this.radiusAt(y) + off;
    // the leg can tilt during a step: follow the tibia direction
    const knee = this.C.legs[0].knee;
    const down = new THREE.Vector3(0, -1, 0).applyQuaternion(knee.getWorldQuaternion(new THREE.Quaternion()));
    const along = a.y - y;
    const base = a.clone().addScaledVector(down, along / Math.max(0.2, -down.y));
    return base.add(V3(Math.sin(th) * r, 0, Math.cos(th) * r));
  }

  ground(): number {
    return 0;
  }

  tick(dt: number): void {
    this.C.update(dt, this.time);
    this.pilgrimFar.update(dt, this.time);
    // scripted step of the climbed leg: lift + swing, carrying the climbers
    const leg = this.C.legs[0];
    const a0 = Math.PI / 6;
    if (this.stepT >= 0) {
      this.stepT += dt;
      const p = clamp((this.stepT - 2.0) / 3.2, 0, 1); // 2s warning, then the step
      this.stepPhase = p;
      const lift = Math.sin(p * Math.PI);
      leg.hip.rotation.y = a0 - Math.sin(p * Math.PI) * 0.16;
      leg.hip.position.y = -6 + lift * 16;
      leg.knee.rotation.x = -lift * 0.12;
      this.C.platform.rotation.z = Math.sin(p * Math.PI) * 0.03;
      if (p > 0 && p < 1 && Math.random() < 0.3) this.g.cam.shake(0.12);
      if (p >= 1) {
        this.stepT = -1;
        this.g.audio.sfx('stomp', 1, 0.6);
        this.g.cam.shake(0.8);
        this.g.particles.stompDust(this.surface(0, 2, 2).setY(1), 30);
      }
    } else {
      leg.hip.rotation.y = a0;
      leg.hip.position.y = -6;
    }
    this.kneeY = this.axis().y;
    // vents: idle → warn → blast
    for (const v of this.vents) {
      v.t += dt;
      const ph = v.t % 4.2;
      const p = this.surface(v.th, v.y, -0.2);
      v.mesh.position.copy(p);
      v.mesh.rotation.y = v.th;
      const mat = v.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = ph > 2.2 && ph < 3.0 ? 2 + Math.sin(this.time * 30) * 1.5 : ph >= 3.0 ? 3 : 0.2;
      if (ph >= 3.0 && Math.random() < 0.8) {
        const out = V3(Math.sin(v.th), 0.15, Math.cos(v.th));
        this.g.particles.emit('dust', p.clone().addScaledVector(out, 1), 2, { color: '#f4f0ea', color2: '#b0b4c0', size: 1.6, sizeEnd: 3.4, life: 0.9, speed: 9, dir: out, spread: 0.25, drag: 1.2, alpha: 0.7 });
      }
    }
    // the great under-bell swings past near the top
    this.bellT += dt;
    const bellPh = this.bellT % 7;
    const warn = bellPh > 4.5 && bellPh < 6;
    const swinging = bellPh >= 6 && bellPh < 6.7;
    const bm = this.bellWarn.material as THREE.MeshBasicMaterial;
    bm.opacity = warn ? 0.18 + Math.sin(this.time * 18) * 0.12 : swinging ? 0.4 : 0;
    this.bellWarn.position.copy(this.axis()).add(V3(0, -30, 0));
    if (bellPh > 6 && bellPh - dt <= 6) this.g.audio.sfx('bell', 1, 0.42);
    if (this.C.underBells[0]) this.C.underBells[0].rotation.x = swinging ? -0.8 + ((bellPh - 6) / 0.7) * 1.6 : warn ? -0.8 * ((bellPh - 4.5) / 1.5) : 0;
    this.placeClimbers(dt);
    this.focus.copy(this.hero.pos);
  }

  private placeClimbers(dt: number): void {
    if (!this.hero.object.visible) return;
    const p = this.surface(this.th, this.cy);
    const k = this.hero.char;
    k.root.position.copy(p);
    k.yaw = k.targetYaw = this.th + Math.PI;
    k.root.rotation.y = k.yaw;
    k.groundY = p.y;
    this.hero.pos.copy(p);
    this.hero.char.update(0, this.time);
    k.root.updateMatrixWorld(true);
    const b = k.back.getWorldPosition(new THREE.Vector3());
    this.lyra.root.position.copy(b).add(V3(0, -0.95, 0)).addScaledVector(V3(Math.sin(this.th), 0, Math.cos(this.th)), 0.15);
    this.lyra.yaw = this.lyra.targetYaw = k.yaw;
    this.lyra.root.rotation.y = k.yaw;
    void dt;
  }

  private closeCam(): CamMode {
    return (dt, _t, out) => {
      const a = this.axis();
      const dir = V3(Math.sin(this.th), 0, Math.cos(this.th));
      const right = V3(dir.z, 0, -dir.x);
      const want = this.hero.pos.clone().addScaledVector(dir, 8.5).addScaledVector(right, 2.8).add(V3(0, 0.6, 0));
      if (!this.camPos || dt === 0) this.camPos = want.clone();
      this.camPos.lerp(want, damp(5, dt));
      out.pos.copy(this.camPos);
      out.look.copy(this.hero.pos).add(V3(0, 2.6, 0)).lerp(a.clone().setY(this.hero.pos.y + 30), 0.03);
      out.fov = 60;
      out.roll = 0;
    };
  }
  private camPos: THREE.Vector3 | null = null;

  private wideCam(): CamMode {
    return (_dt, t, out) => {
      const a = this.axis();
      const ang = this.th + 0.9 + t * 0.02;
      out.pos.set(a.x + Math.sin(ang) * 120, this.hero.pos.y - 25, a.z + Math.cos(ang) * 120);
      out.look.copy(this.hero.pos).add(V3(0, 18, 0));
      out.fov = 34;
      out.roll = 0.04;
    };
  }

  async script(from: string): Promise<void> {
    const ui = this.g.ui;
    const audio = this.g.audio;
    this.sky('overcast');
    audio.setAmbience('wind', 0.9);
    this.ledges = [];
    for (let k = 0; k < 7; k++) this.ledges.push(194 - 20 - k * 24 - 8);

    if (this.reached(from, 'intro')) {
      this.checkpoint('intro');
      this.cinematic(true);
      ui.setFadeInstant(1);
      this.music('climb');
      this.hero.object.visible = true;
      this.lyra.root.visible = true;
      this.hero.char.setMode('climb', 0);
      this.lyra.setMode('piggy', 0);
      this.th = 0.2;
      this.cy = 30;
      this.cut(dollyShot(V3(-260, 30, 260), V3(-200, 60, 200), V3(0, 120, 0), V3(0, 180, 0), 8, 40, 34), 0, 'carillon-wide');
      this.go(this.fadeIn(2));
      await this.card(this.num, this.title, 'The temple that walks on six legs', 3);
      await this.wait(2);
      this.cut(fixedShot(() => this.hero.pos.clone().add(V3(Math.sin(this.th) * 5, 0.6, Math.cos(this.th) * 5)), () => this.hero.pos.clone().add(V3(0, 1.8, 0)), 46), 0, 'climb-start');
      await this.say('KAEL', "You're heavier than you look.");
      await this.say('LYRA', "I'm made of three hundred years. Climb faster.");
      await this.say('LYRA', "When it steps — <i>hold on</i>. It doesn't know we're small.");
    }

    if (this.reached(from, 'climb')) {
      this.music('climb');
      await this.segment(
        'climb',
        () => {
          this.hero.object.visible = true;
          this.lyra.root.visible = true;
          this.hero.char.setMode('climb', 0.1);
          this.lyra.setMode('piggy', 0);
          this.th = 0.2;
          this.cy = 34;
          this.lastLedge = 34;
          this.stepT = -1;
          this.nextStep = 7;
          this.fallT = -1;
          this.grip = 0;
          this.camWide = false;
          this.camT = 0;
          this.camPos = null;
          ui.objective('Climb to the temple');
          this.cut(this.closeCam(), 0.8, 'climb-close');
        },
        (dt) => this.climbStep(dt),
        { onFoot: false },
      );
    }

    // ---------------------------------------------------------------- summit
    this.checkpoint('summit');
    this.cinematic(true);
    ui.qte(null);
    this.music('inside');
    audio.setAmbience('wind', 0.5);
    this.th = 0.2;
    this.cy = this.kneeY - 9;
    this.hero.char.setMode('hang', 0.2);
    const hatch = this.C.hatch.getWorldPosition(new THREE.Vector3());
    this.cut(dollyShot(() => this.hero.pos.clone().add(V3(8, -4, 10)), () => this.hero.pos.clone().add(V3(14, 6, 18)), () => this.hero.pos.clone(), () => hatch, 6, 50, 44), 0, 'summit');
    await this.wait(2);
    await this.say('LYRA', "There — a door. It's open. It's <i>letting</i> us in.");
    await this.say('KAEL', 'Of course it is. Why would anything be simple today.');
    this.g.audio.sfx('creak', 1, 0.8);
    this.cut(orbitShot(() => hatch, 22, -6, 0, 1.2, 6, 48), 0, 'hatch');
    await this.wait(3);
    await this.fadeOut(1.4);
  }

  private climbStep(dt: number) {
    const ui = this.g.ui;
    const input = this.g.input;
    const h = this.hero;
    h.invuln = Math.max(0, h.invuln - dt);
    // giant steps on a rhythm
    this.nextStep -= dt;
    if (this.nextStep <= 0 && this.stepT < 0) {
      this.stepT = 0;
      this.nextStep = 11;
      this.grip = 0;
      this.g.audio.sfx('bell', 0.8, 0.55);
      this.g.audio.sfx('creak', 1, 0.7);
    }
    const stepping = this.stepT >= 0;
    const holding = input.isHeld('interact') || input.isHeld('jump');
    if (this.fallT >= 0) {
      // sliding back down to the last ledge
      this.fallT += dt;
      this.cy = Math.max(this.lastLedge, this.cy - dt * 22);
      this.hero.char.setMode('hang');
      if (this.cy <= this.lastLedge + 0.01 && this.fallT > 0.6) {
        this.fallT = -1;
        this.hero.char.setMode('climb');
      }
    } else if (stepping) {
      this.hero.char.setMode(holding ? 'brace' : 'hang', 0.12);
      if (this.stepT < 2) {
        ui.qte('interact', this.stepT / 2, true);
        ui.prompt('interact', 'Hold on!', true);
      } else {
        this.grip = holding ? Math.min(1, this.grip + dt * 2) : this.grip - dt * 3;
        ui.qte('interact', holding ? 1 - this.stepPhase : 0.15, !holding);
        ui.prompt('interact', holding ? 'Hold…' : 'HOLD ON!', true);
        if (!holding && this.stepPhase > 0.15 && this.stepPhase < 0.85 && h.invuln <= 0) this.knockDown(1);
      }
    } else {
      ui.qte(null);
      const mv = input.move;
      const r = this.radiusAt(this.cy);
      this.th = wrapAngle(this.th + (mv.x * 2.6 * dt) / r);
      this.cy = clamp(this.cy + mv.y * 3.4 * dt, 20, this.kneeY - 9);
      this.hero.char.setMode('climb');
      this.hero.char.speed = Math.min(1, Math.abs(mv.y) + Math.abs(mv.x) * 0.6);
      for (const l of this.ledges) if (this.cy >= l && l > this.lastLedge) this.lastLedge = l;
      ui.prompt(this.cy < 40 ? 'move' : null, 'Climb');
    }
    // vents
    for (const v of this.vents) {
      const ph = v.t % 4.2;
      if (ph >= 3.0 && h.invuln <= 0 && this.fallT < 0) {
        const dth = Math.abs(wrapAngle(this.th - v.th)) * this.radiusAt(v.y);
        if (dth < 2.4 && Math.abs(this.cy - v.y) < 2.6) this.knockDown(1);
      }
    }
    // bell sweep near the top
    const bellPh = this.bellT % 7;
    if (bellPh >= 6 && bellPh < 6.7 && h.invuln <= 0 && this.fallT < 0) {
      const bandY = this.axis().y - 30;
      if (Math.abs(this.cy - bandY) < 5 && Math.abs(wrapAngle(this.th)) < 0.7) this.knockDown(1);
    }
    // camera rhythm: close climbing, punctuated by vertigo-wide inserts
    this.camT += dt;
    if (stepping && this.stepT > 1.6 && !this.camWide) {
      this.camWide = true;
      this.camT = 0;
      this.cut(this.wideCam(), 0, 'climb-wide');
    } else if (!stepping && !this.camWide && this.camT > 12) {
      this.camWide = true;
      this.camT = 0;
      this.cut(this.wideCam(), 0, 'climb-wide');
    } else if (this.camWide && this.camT > 3.2 && !(stepping && this.stepT < 5)) {
      this.camWide = false;
      this.camT = 0;
      this.camPos = null;
      this.cut(this.closeCam(), 0, 'climb-close');
    }
    ui.progress((this.cy - 30) / (this.kneeY - 9 - 30));
    ui.objective(this.cy > this.kneeY - 50 ? 'Mind the bell — reach the knee' : 'Climb to the temple');
    return this.cy >= this.kneeY - 9.5 && !stepping ? ('win' as const) : undefined;
  }

  private knockDown(n: number): void {
    const h = this.hero;
    h.resolve = Math.max(0, h.resolve - n);
    h.invuln = 1.4;
    this.fallT = 0;
    this.g.audio.sfx('hurt');
    this.g.audio.sfx('whoosh', 0.8);
    this.g.cam.shake(0.5);
    this.g.particles.sparks(h.pos.clone().add(V3(0, 1, 0)), '#ffcf7a', 10);
    // drop to the ledge below the current one
    const below = this.ledges.filter((l) => l < this.cy - 1).sort((a, b) => b - a)[0];
    this.lastLedge = Math.max(30, below ?? 30);
  }
}
