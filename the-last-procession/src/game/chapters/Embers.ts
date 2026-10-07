import * as THREE from 'three';
import { toonMat } from '../../world/Compat2';
import { Chapter } from '../Chapter';
import { dollyShot, fixedShot, followShot } from '../Camera';
import { Antlered, Carillon, Pilgrim } from '../../world/Colossus';
import { Horse } from '../../actors/Horse';
import { glowCard } from '../../world/Props';
import { makeMountainRing, makeTerrain, makeTrees } from '../../world/Compat';
import { G, merge, xf } from '../../world/Compat';
import { radialTexture, stoneTexture } from '../../gfx/Materials';
import { toon } from '../../world/Compat';
import { distXZ, fbm, V3 } from '../../util/math';

function hillH(x: number, z: number): number {
  const r = Math.hypot(x, z);
  let h = -r * r * 0.0016 + fbm(x * 0.03, z * 0.03, 3) * 1.2;
  // southern cliff toward the overlook
  if (z < -26) h -= (-26 - z) * 1.6;
  return h;
}

// ============================================================================
// CHAPTER THREE — EMBERS
// ============================================================================
export class Embers extends Chapter {
  static meta = { num: 'Chapter Three', title: 'Embers', subtitle: 'A fire, a question, and three hundred years of counting.' };
  readonly id = 'embers';
  readonly num = Embers.meta.num;
  readonly title = Embers.meta.title;
  readonly subtitle = Embers.meta.subtitle;
  readonly checkpoints = ['intro', 'explore', 'talk', 'night'];
  private fireLight!: THREE.PointLight;
  private flames!: THREE.Group;
  private fireOn = 0;
  private wood: { mesh: THREE.Group; glow: THREE.Sprite; taken: boolean }[] = [];
  private overlookSeen = false;
  private lanterns!: THREE.Points;
  private giants: (Antlered | Carillon | Pilgrim)[] = [];
  private horse!: Horse;
  private overlookGlow!: THREE.Sprite;
  private choiceA = -1;

  build(): void {
    // the moon tonight is not a moon
    this.addBehemoth(new THREE.Vector3(-1400, 3600, -9000), 0.15, '#1e2b52', 0.55, 1700);
    const terrain = makeTerrain({
      size: 1600,
      seg: 160,
      height: hillH,
      color: (x, z, h) => {
        const n = fbm(x * 0.05, z * 0.05, 2);
        return new THREE.Color().setHSL(0.3 - n * 0.03, 0.3, 0.22 + n * 0.05 + h * 0.002);
      },
      grass: (x, z) => (Math.hypot(x, z) < 3.4 ? 0 : 1),
      grassColor: '#24381e',
    });
    this.group.add(terrain.mesh);
    this.addGrass(terrain, { root: '#1c2e1c', tip: '#6a8a52', patch: '#7a8a5a', height: 0.8, flowers: ['#e8e8ff', '#c8d0ff', '#ffffff'] });
    // tree ring (north half), leaving the southern view open
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 60; i++) {
      const a = Math.PI * (0.05 + (i / 60) * 0.9) + Math.sin(i * 7.7) * 0.05;
      const r = 22 + (i % 4) * 7 + Math.sin(i) * 3;
      const p = V3(Math.cos(a) * r, 0, Math.sin(a) * r);
      p.y = hillH(p.x, p.z);
      pts.push(p);
      this.colliders.push({ x: p.x, z: p.z, r: 0.8 });
    }
    this.group.add(makeTrees(pts, { leaf: '#2a4030', trunk: '#3a2a20' }, 1.4));
    this.group.add(makeMountainRing(2600, 30, 500, '#141a34', 3));

    // camp: fire ring, logs to sit on, bedrolls, the tethered horse
    const stoneMat = toonMat({ map: stoneTexture('#5a544e', 8, 3), roughness: 0.95, flatShading: true });
    const ring: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ring.push(xf(new THREE.DodecahedronGeometry(0.28, 0), [Math.cos(a) * 0.85, hillH(0, 0) + 0.12, Math.sin(a) * 0.85], [i, i * 2, 0], [1, 0.7, 1]));
    }
    this.group.add(new THREE.Mesh(merge(ring), stoneMat));
    const logMat = toon('#5a3a26');
    const seatLog = new THREE.Mesh(xf(G.cyl(0.25, 0.25, 2.6, 8), [0, 0.25, 0], [0, 0, Math.PI / 2]), logMat);
    seatLog.position.set(-0.4, hillH(-0.4, 2.1), 2.1);
    seatLog.castShadow = true;
    this.group.add(seatLog);
    const roll = new THREE.Mesh(merge([xf(G.cyl(0.28, 0.28, 1.6, 10), [0, 0.28, 0], [Math.PI / 2, 0, 0]), xf(G.box(0.9, 0.06, 1.9), [1.2, 0.03, 0.1])]), toon('#7a3a30'));
    roll.position.set(3.2, hillH(3.2, -1.5), -1.5);
    roll.rotation.y = 0.6;
    this.group.add(roll);
    this.horse = new Horse();
    this.horse.root.position.set(-6, hillH(-6, 5), 5);
    this.horse.root.rotation.y = 2.2;
    this.group.add(this.horse.root);
    this.colliders.push({ x: -6, z: 5, r: 1.6 }, { x: 0, z: 0, r: 1.0 });

    // the fire
    this.flames = new THREE.Group();
    this.flames.position.set(0, hillH(0, 0) + 0.1, 0);
    const fm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff8a2a').multiplyScalar(1.5), transparent: true, opacity: 0.85 });
    const fm2 = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd06a').multiplyScalar(1.8), transparent: true, opacity: 0.85 });
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(G.cone(0.22 - i * 0.02, 0.9 - i * 0.08, 6), i % 2 ? fm2 : fm);
      f.position.set(Math.cos(i * 1.3) * 0.18, 0.4, Math.sin(i * 1.3) * 0.18);
      this.flames.add(f);
    }
    const sticks = new THREE.Mesh(merge([xf(G.cyl(0.06, 0.06, 1.1, 5), [0, 0.15, 0], [0.3, 0, Math.PI / 2.4]), xf(G.cyl(0.06, 0.06, 1.1, 5), [0, 0.15, 0], [-0.3, 1.2, Math.PI / 2.4]), xf(G.cyl(0.06, 0.06, 1.1, 5), [0, 0.15, 0], [0, 2.4, Math.PI / 2.4])]), logMat);
    sticks.position.copy(this.flames.position);
    this.group.add(sticks, this.flames);
    this.fireLight = new THREE.PointLight('#ff9a4a', 0, 30, 1.6);
    this.fireLight.position.set(0, hillH(0, 0) + 1.2, 0);
    this.group.add(this.fireLight);
    this.flames.visible = false;

    // firewood bundles near the treeline (glinting so they read at night)
    const woodGeo = merge([xf(G.cyl(0.07, 0.07, 1.2, 5), [0, 0.1, 0], [0, 0, Math.PI / 2]), xf(G.cyl(0.07, 0.07, 1.1, 5), [0, 0.22, 0.05], [0.2, 0, Math.PI / 2]), xf(G.cyl(0.06, 0.06, 1.0, 5), [0, 0.12, -0.12], [-0.2, 0, Math.PI / 2])]);
    for (const [x, z] of [[-14, 12], [11, 15], [16, -6]]) {
      const g = new THREE.Group();
      g.position.set(x, hillH(x, z), z);
      g.add(new THREE.Mesh(woodGeo, logMat));
      const glow = glowCard('#ffd27a', 1.6, 0.55);
      glow.position.y = 0.4;
      g.add(glow);
      this.group.add(g);
      this.wood.push({ mesh: g, glow, taken: false });
    }
    this.overlookGlow = glowCard('#9ff7ff', 2.2, 0.5);
    this.overlookGlow.position.set(0, hillH(0, -23) + 0.6, -23);
    this.group.add(this.overlookGlow);

    // the Procession at night: giants on the horizon carrying lights, and a river of lanterns
    const a = new Antlered(true);
    a.root.position.set(-1400, 0, -1700);
    a.heading = 1.2;
    const c = new Carillon(true);
    c.root.position.set(600, 0, -2200);
    c.heading = -1.6;
    const p = new Pilgrim(true);
    p.root.position.set(-200, 0, -2600);
    p.heading = 0.2;
    for (const gi of [a, c, p]) {
      gi.walk = gi.walkTarget = 1;
      gi.setGlow('#ffd27a', 6);
      this.group.add(gi.root);
      this.giants.push(gi);
    }
    // the river of lanterns: one Points draw call
    const lg = new THREE.BufferGeometry();
    const lc = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) {
      const c = new THREE.Color(i % 3 ? '#ffcf7a' : '#9ff7ff').multiplyScalar(2);
      lc.set([c.r, c.g, c.b], i * 3);
    }
    lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(90 * 3), 3));
    lg.setAttribute('color', new THREE.BufferAttribute(lc, 3));
    this.lanterns = new THREE.Points(lg, new THREE.PointsMaterial({ size: 22, map: radialTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    this.lanterns.frustumCulled = false;
    this.group.add(this.lanterns);
    this.bounds = { x0: -30, x1: 30, z0: -25, z1: 30 };
  }

  ground(x: number, z: number): number {
    return hillH(x, z);
  }

  tick(dt: number): void {
    for (const gi of this.giants) gi.update(dt, this.time);
    this.horse.update(dt);
    // lantern river crossing the far valley
    const lp = this.lanterns.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < lp.count; i++) {
      const u = ((i / lp.count + this.time * 0.004) % 1) * 2 - 1;
      lp.setXYZ(i, u * 2600, 30 + Math.sin(i * 3.1) * 12 + Math.sin(this.time + i) * 2, -1900 - Math.cos(u * 1.4) * 500 + Math.sin(i * 7.3) * 60);
    }
    lp.needsUpdate = true;
    // fire flicker
    const f = this.fireOn;
    this.fireLight.intensity = f * (26 + Math.sin(this.time * 17) * 4 + Math.sin(this.time * 7.3) * 5);
    if (f > 0) {
      this.flames.visible = true;
      this.flames.children.forEach((c, i) => {
        c.scale.set(f, f * (0.8 + Math.abs(Math.sin(this.time * (9 + i * 2.3) + i)) * 0.6), f);
        c.rotation.y = this.time * (1 + i * 0.3);
      });
      if (Math.random() < 0.5 * f) this.g.particles.embers(this.flames.position.clone().add(V3(0, 0.6, 0)));
    }
    // fireflies
    if (Math.random() < 0.15) {
      const a = Math.random() * Math.PI * 2;
      const r = 6 + Math.random() * 18;
      this.g.particles.motes(V3(Math.cos(a) * r, hillH(Math.cos(a) * r, Math.sin(a) * r) + 0.8 + Math.random(), Math.sin(a) * r), '#d8ff8a', 1, 0.2);
    }
    for (const w of this.wood) if (!w.taken) w.glow.material.opacity = 0.35 + Math.sin(this.time * 3) * 0.2;
    this.overlookGlow.material.opacity = this.overlookSeen ? 0 : 0.35 + Math.sin(this.time * 2.4) * 0.2;
  }

  private exploreCam(): void {
    this.cut(followShot({ target: () => this.hero.pos, yaw: () => this.camYaw, distance: 6.5, height: 3, lookHeight: 1.3, lookAhead: 1.5, fov: 54, lag: 0.25 }), 1.2, 'explore');
  }
  private camYaw = 0;

  async script(from: string): Promise<void> {
    const ui = this.g.ui;
    const audio = this.g.audio;
    this.sky('night');
    audio.setAmbience('wind', 0.2);
    audio.setAmbience('fire', 0);
    this.music('campfire');
    const kaelSeat = V3(-1.1, hillH(-1.1, 2.15), 2.15);
    if (this.hero.char.weapon) this.hero.char.weapon.visible = false; // a quiet chapter: the sword stays sheathed
    const lyraSeat = V3(0.25, hillH(0.25, 2.1), 2.1);

    if (this.reached(from, 'intro')) {
      this.checkpoint('intro');
      this.cinematic(true);
      ui.setFadeInstant(1);
      this.stage(V3(-3, hillH(-3, 6), 6), Math.PI, V3(1, hillH(1, -18), -18), Math.PI);
      this.lyra.setMode('idle');
      this.cut(dollyShot(V3(0, 40, 60), V3(0, 18, 34), V3(0, 0, 0), V3(0, 4, -40), 9, 46, 42), 0, 'camp-crane');
      this.go(this.fadeIn(2.5));
      await this.card(this.num, this.title, 'A hilltop above the Kestrel Plains. Night.', 3.4);
      await this.wait(2);
      this.cut(fixedShot(V3(-2, hillH(0, -15) + 1.6, -15), V3(1, hillH(1, -18) + 1.4, -18.5), 34), 0, 'lyra-stars');
      this.lyra.lookAtTarget = V3(-200, 300, -1000);
      await this.say('LYRA', 'There are so many of them. Are they all walking too?');
      await this.say('KAEL', "The stars? No. They're the only things that stay put.", { actor: this.hero.char });
      await this.say('LYRA', "...I like them, then.");
      this.lyra.lookAtTarget = null;
    }

    if (this.reached(from, 'explore')) {
      await this.segment(
        'explore',
        () => {
          this.stage(V3(-3, hillH(-3, 6), 6), Math.PI, V3(1, hillH(1, -18), -18), Math.PI);
          this.heroActive = true;
          this.hero.canAttack = false;
          this.hero.walkOnly = false;
          this.hero.tuning.runSpeed = 4.6;
          this.lyra.setMode('idle');
          this.lyra.lookAtTarget = V3(-200, 300, -1000);
          for (const w of this.wood) {
            w.taken = false;
            w.mesh.visible = true;
          }
          this.fireOn = 0;
          this.flames.visible = false;
          this.camYaw = Math.PI;
          // camera-relative controls for free exploration
          this.hero.basisYaw = () => this.camYaw;
          this.exploreCam();
        },
        () => {
          const h = this.hero;
          // slowly swing the camera behind Kael when he settles on a heading
          const fy = Math.atan2(h.facing.x, h.facing.z);
          if (h.speed01 > 0.5) {
            let d = fy - this.camYaw;
            while (d > Math.PI) d -= Math.PI * 2;
            while (d < -Math.PI) d += Math.PI * 2;
            this.camYaw += d * 0.008;
          }
          const got = this.wood.filter((w) => w.taken).length;
          let prompt: [string, boolean] | null = null;
          if (got < 3) {
            ui.objective(`Gather firewood  ${got}/3`);
            for (const w of this.wood) {
              if (w.taken) continue;
              if (distXZ(h.pos, w.mesh.position) < 2) {
                prompt = ['Gather', true];
                if (this.g.input.consume('interact')) {
                  w.taken = true;
                  w.mesh.visible = false;
                  audio.sfx('confirm');
                  this.bark('LYRA', ['You\'re very serious about sticks.', 'That one looks like a little Processional. With fewer legs.', 'Is fire also something that walks? It moves like it wants to.'][got] ?? '', 2.6);
                }
              }
            }
          } else if (this.fireOn <= 0) {
            ui.objective('Light the fire');
            if (distXZ(h.pos, V3(0, 0, 0)) < 2.6) {
              prompt = ['Light the fire', true];
              if (this.g.input.consume('interact')) {
                this.fireOn = 0.01;
                audio.sfx('whoosh', 0.8);
                audio.setAmbience('fire', 1);
                this.go(this.animate(1.5, (k) => (this.fireOn = Math.max(0.01, k))));
              }
            }
          } else {
            ui.objective('Sit with Lyra');
            if (distXZ(h.pos, this.lyra.root.position) < 2.4) {
              prompt = ['Sit with her', true];
              if (this.g.input.consume('interact')) return 'win';
            }
          }
          if (!this.overlookSeen && distXZ(h.pos, this.overlookGlow.position) < 3) {
            prompt = ['Look out', false];
            if (this.g.input.consume('interact')) {
              this.overlookSeen = true;
              this.overlook().catch(() => {});
            }
          }
          if (prompt) ui.prompt('interact', prompt[0], prompt[1]);
          else ui.prompt(null);
          return undefined;
        },
        { resolve: false },
      );
    }

    if (this.reached(from, 'talk')) {
      this.checkpoint('talk');
      this.cinematic(true);
      this.fireOn = 1;
      audio.setAmbience('fire', 1);
      this.stage(kaelSeat, Math.PI, lyraSeat, Math.PI);
      this.hero.char.setMode('sit', 0.4);
      this.lyra.setMode('sit', 0.4);
      const two = () => this.cut(fixedShot(V3(-3.4, kaelSeat.y + 1.3, -0.9), V3(-0.4, kaelSeat.y + 0.85, 2.1), 40), 0, 'fire-two');
      const onLyra = () => this.cut(fixedShot(V3(-1.7, lyraSeat.y + 1.15, 0.3), V3(0.25, lyraSeat.y + 1.0, 2.1), 30), 0, 'fire-lyra');
      const onKael = () => this.cut(fixedShot(V3(0.7, kaelSeat.y + 1.15, 0.5), V3(-1.1, kaelSeat.y + 1.0, 2.15), 30), 0, 'fire-kael');
      this.cut(dollyShot(V3(-5.5, kaelSeat.y + 1.6, -2.6), V3(-3.6, kaelSeat.y + 1.3, -1.0), V3(-0.4, kaelSeat.y + 0.8, 2.1), V3(-0.4, kaelSeat.y + 0.8, 2.1), 5, 40, 38), 0, 'fire-push');
      await this.wait(3);
      this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 0.9, 0));
      this.lyra.lookAtTarget = this.hero.char.root.position.clone().add(V3(0, 1.0, 0));
      onLyra();
      await this.say('LYRA', 'Kael. What is your favorite thing?');
      two();
      this.choiceA = await this.choose(['"My sword."', '"Warm bread. Fresh, with butter."', '"...I don\'t know. Nobody\'s ever asked."']);
      if (this.choiceA === 0) {
        onLyra();
        await this.say('LYRA', "That's a tool, not a <i>thing</i>. You can't love a spoon.");
        onKael();
        await this.say('KAEL', "You've known me for one day. I might love a spoon.");
        onLyra();
        await this.say('LYRA', '<i>(she laughs — the first time)</i> ...That was a joke. I made a laugh.');
      } else if (this.choiceA === 1) {
        onLyra();
        await this.say('LYRA', "What's bread?");
        onKael();
        await this.say('KAEL', '...Right. Next town, we\'re finding a bakery. That\'s an order from the Royal Guard.');
        onLyra();
        await this.say('LYRA', 'Is the Royal Guard allowed to give orders about bread?');
        onKael();
        await this.say('KAEL', 'Especially about bread.');
      } else {
        onLyra();
        await this.say('LYRA', "Me neither. Maybe we could look for one. Together.");
        onKael();
        await this.say('KAEL', "...Yeah. I'd like that.");
      }
      onLyra();
      this.lyra.lookAtTarget = this.flames.position.clone();
      await this.say('LYRA', 'Inside, there was a sound. Always. Like a heartbeat made of a thousand clocks.');
      await this.say('LYRA', 'I counted it. It was the only thing to do.');
      onKael();
      await this.say('KAEL', 'Counted to what?');
      onLyra();
      await this.say('LYRA', 'Nine billion, four hundred sixty-seven million, two hundred thousand... and twelve.');
      two();
      await this.wait(1.2);
      await this.say('KAEL', "...Lyra. That's three hundred years.");
      onLyra();
      this.lyra.lookAtTarget = this.hero.char.root.position.clone().add(V3(0, 1.0, 0));
      await this.say('LYRA', 'Is it? <i>(quietly)</i> Then I was in there for all of it.');
      onKael();
      this.hero.char.lookAtTarget = this.flames.position.clone();
      await this.say('KAEL', "The Antlered slept outside my village. My grandmother's grandmother planted the forest on its back.");
      await this.say('KAEL', "We thought they were mountains that happened to have faces. Nobody alive had ever seen one walk.");
      this.hero.char.lookAtTarget = this.lyra.root.position.clone().add(V3(0, 0.9, 0));
      onLyra();
      await this.say('LYRA', "Kael... if they're all looking for me, maybe I'm supposed to go back inside. Maybe I'm a part that fell off.");
      two();
      const b = await this.choose(['"You\'re not going back into a box. Not while I\'m here."', '"Then I\'ll take you wherever you need to go. Even back."', '"We\'ll find out what you are. Together, first."']);
      if (b === 0) {
        onLyra();
        await this.say('LYRA', "You're very stubborn for someone who loves spoons.");
      } else if (b === 1) {
        onLyra();
        await this.say('LYRA', '...Even back. <i>(she holds that word like something fragile)</i> Thank you.');
      } else {
        onLyra();
        await this.say('LYRA', 'Together first. I like that order of things.');
      }
      // she leans on his shoulder and sleeps
      this.lyra.lookAtTarget = null;
      this.hero.char.lookAtTarget = V3(0, 50, -1500);
      await this.animate(1.4, (k) => {
        this.lyra.root.position.lerpVectors(lyraSeat, V3(-0.55, lyraSeat.y, 2.12), k);
      });
      this.cut(dollyShot(V3(-3.0, kaelSeat.y + 1.2, -0.6), V3(-5.5, kaelSeat.y + 2.0, -3.2), V3(-0.6, kaelSeat.y + 0.9, 2.1), V3(-0.6, kaelSeat.y + 0.9, 2.1), 7, 34, 40), 0, 'fire-pullback');
      await this.wait(3);
    }

    // night passes: the Procession of lights
    this.checkpoint('night');
    this.cinematic(true);
    this.fireOn = 0.6;
    this.stage(kaelSeat, Math.PI, V3(-0.55, lyraSeat.y, 2.12), Math.PI);
    this.hero.char.setMode('sit', 0);
    this.lyra.setMode('sit', 0);
    this.cut(dollyShot(V3(4, hillH(4, 8) + 3, 8), V3(6, hillH(6, 14) + 8, 14), V3(0, 1, 0), V3(0, 60, -1800), 10, 44, 40), 0, 'night-crane');
    await this.wait(5);
    await this.caption('They walked all night.<br/>So did the lights.', 3.4);
    await this.fadeOut(1.8);
  }

  private async overlook(): Promise<void> {
    this.cinematic(true);
    this.g.audio.sfx('shimmer', 0.8);
    const back = this.g.cam;
    this.cut(dollyShot(() => this.hero.pos.clone().add(V3(1.5, 1.6, 2.5)), () => this.hero.pos.clone().add(V3(1.5, 2.2, 1.5)), () => this.hero.pos.clone().add(V3(0, 1.5, -10)), V3(-300, 120, -2000), 6.5, 40, 30), 0, 'overlook');
    await this.say('KAEL', '<i>(lanterns, a river of them, and the giants walking among them like moving hills)</i>', { hold: 3.5, actor: null });
    await this.wait(1.5);
    void back;
    this.cinematic(false);
    this.exploreCam();
  }

  dispose(): void {
    this.hero.tuning.runSpeed = 7.6;
    super.dispose();
  }
}
