import * as THREE from 'three';
import type { Game } from './Game';
import { Folk } from '../entities/Npc';
import { Penitent } from '../entities/Enemies';
import { AshDrake, Thornwife, dressAsThrall } from '../entities/Enemies2';
import { Mats } from '../world/Materials';
import { worldBox } from '../world/geo';
import { latheG } from '../entities/Rig';
import type { TorchSpot } from '../world/Terrain';
import type { LightPool } from '../systems/LightPool';

type Enc = 'idle' | 'active' | 'cleared';
const STAGES = ['title', 'wood', 'hamlet', 'chapel', 'dragon', 'ending'] as const;
const CALDER = 'Ser Calder';

/** Chapter II: The Witchwood. Thornwives, briar thralls, and Vharoth the Ash-Drake in the Ribs of Harrowmere. */
export class Chapter2 {
  stage = 'title';
  progressIndex = 0;
  stir = 0;
  readonly candleSpots: TorchSpot[] = [];
  private candles: Array<{ group: THREE.Group; flames: THREE.Object3D[]; lit: boolean; s: number; poolIndex: number; name: string }> = [];
  private pool: LightPool | null = null;
  private timeline: Array<{ t: number; fn: () => void }> = [];
  private readonly fired = new Set<string>();
  private checkpoint = { s: 4, name: 'edge' };
  private readonly enc: Record<'grove' | 'hamlet' | 'chapel' | 'dragon', Enc> = { grove: 'idle', hamlet: 'idle', chapel: 'idle', dragon: 'idle' };
  readonly drake = new AshDrake();
  private flyoverT = -1;
  private endT = -1;
  private sallow!: Folk;
  private readonly sHamlet: number;
  private readonly sChapel: number;
  private readonly sRibs: number;
  private readonly sEnd: number;
  private prompt: { label: string; pos: THREE.Vector3; act: () => void } | null = null;

  constructor(private readonly g: Game) {
    const p = g.path;
    this.sHamlet = p.zoneStart('hamlet');
    this.sChapel = p.zoneStart('chapel');
    this.sRibs = p.zoneStart('ribs');
    this.sEnd = p.length;
    this.buildCandles();
    this.sallow = new Folk({ robe: Mats().robeWhite, skin: '#b8a890', mood: 'old', hood: true }, 'pray', 'Mother Sallow', 3);
    this.drake.onRoar = () => g.audio.roar(this.drake.pos);
  }

  private spot(s: number, lateral: number): THREE.Vector3 {
    const a = this.g.path.at(s);
    return a.pos.clone().addScaledVector(a.right, lateral);
  }

  private yawAlong(s: number, back = false): number {
    const t = this.g.path.at(s).tangent;
    return Math.atan2(t.x, t.z) + (back ? Math.PI : 0);
  }

  private buildCandles(): void {
    const defs: Array<[number, number, string]> = [
      [this.g.path.zoneStart('hamlet') + 6, -4, 'hamlet'],
      [this.g.path.zoneStart('ribs') - 8, 3, 'ribs'],
    ];
    for (const [s, lat, name] of defs) {
      const group = new THREE.Group();
      const pos = this.spot(s, lat);
      group.position.copy(pos);
      const altar = new THREE.Mesh(worldBox(1.2, 0.8, 0.8, 2), Mats().stoneDark);
      altar.position.y = 0.4;
      group.add(altar);
      const flames: THREE.Object3D[] = [];
      for (let i = 0; i < 4; i += 1) {
        const c = new THREE.Mesh(latheG([[0.04, 0], [0.04, 0.2 + (i % 2) * 0.1], [0, 0.32]], 6), Mats().robeWhite);
        c.position.set(-0.36 + i * 0.24, 0.8, 0);
        group.add(c);
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 5), Mats().goldGlow);
        f.position.set(c.position.x, 1.15 + (i % 2) * 0.1, 0);
        f.visible = false;
        group.add(f);
        flames.push(f);
      }
      this.g.worldRoot.add(group);
      this.candleSpots.push({ pos: pos.clone().setY(pos.y + 1.2), zone: 'wood', s });
      this.candles.push({ group, flames, lit: false, s: s + 1.5, poolIndex: -1, name });
    }
  }

  bindCandles(pool: LightPool, offset: number): void {
    this.pool = pool;
    this.candles.forEach((c, i) => {
      c.poolIndex = offset + i;
      this.setLit(i, false);
    });
  }

  private setLit(i: number, lit: boolean): void {
    const c = this.candles[i];
    c.lit = lit;
    for (const f of c.flames) f.visible = lit;
    this.pool?.setLit(c.poolIndex, lit);
  }

  private after(t: number, fn: () => void): void {
    this.timeline.push({ t, fn });
  }

  private once(id: string, cond: boolean, fn: () => void): void {
    if (cond && !this.fired.has(id)) {
      this.fired.add(id);
      fn();
    }
  }

  private think(text: string): void {
    this.g.hud.say('', text, 0, true);
  }

  private say(who: string, text: string): void {
    this.g.hud.say(who, text);
  }

  get flags(): Record<string, boolean | string> {
    return { ...this.enc, checkpoint: this.checkpoint.name, drakeHp: String(Math.round(this.drake.hp)) };
  }

  // ------------------------------------------------------------------ flow
  private resetWorld(): void {
    const g = this.g;
    this.timeline = [];
    this.fired.clear();
    this.enc.grove = this.enc.hamlet = this.enc.chapel = this.enc.dragon = 'idle';
    this.checkpoint = { s: 4, name: 'edge' };
    g.removeEnemies(() => true);
    this.drake.reset();
    this.drake.group.removeFromParent();
    this.flyoverT = -1;
    this.endT = -1;
    this.candles.forEach((_, i) => this.setLit(i, false));
    g.nav.minS = 0;
    g.nav.maxS = this.sRibs - 3;
    g.setPalette('wood', true);
    g.weather.rainLevel = 0;
    g.weather.moteLevel = 0.9;
    g.weather.emberLevel = 0;
    g.weather.ashLevel = 0;
    g.weather.lightningEnabled = false;
    g.fogDensity = 0.0055;
    g.hud.setLetterbox(false);
    g.hud.setBoss(null);
    g.dog.group.visible = false;
    const wood = g.wood!;
    this.sallow.place(wood.skullAltar.clone().setY(wood.skullAltar.y), this.yawAlong(this.sEnd, true));
    this.sallow.behavior = 'pray';
    if (!this.sallow.group.parent) g.worldRoot.add(this.sallow.group);
    if (!g.folk.includes(this.sallow)) g.folk.push(this.sallow);
    if (wood.thornMesh) wood.thornMesh.scale.setScalar(1);
    g.audio.setBeds({ wind: 0.35, rain: 0, crowd: 0, rumble: 0, fire: 0.15 });
  }

  private placePlayer(s: number, lateral = 0): void {
    const g = this.g;
    g.player.respawn(this.spot(s, lateral), this.yawAlong(s), g.path.indexAt(s));
    g.player.pathIndex = g.nav.resolve(g.player.pos, 0.45, g.path.indexAt(s));
    g.cam.snap(g.worldRoot.localToWorld(g.player.pos.clone()), g.player.yaw);
  }

  setupTitle(): void {
    this.resetWorld();
    this.stage = 'title';
    const g = this.g;
    g.player.controlEnabled = false;
    this.placePlayer(10);
    const a = g.path.at(2);
    g.cam.cinePos.copy(a.pos).addScaledVector(a.right, 4).setY(a.pos.y + 2.4);
    g.cam.cineLook.copy(this.spot(60, 0)).setY(a.pos.y + 6);
    g.cam.setCinematic(true);
    g.cam.cineWeight = 1;
    g.audio.setMusic('title');
  }

  begin(): void {
    const g = this.g;
    this.resetWorld();
    this.stage = 'wood';
    this.placePlayer(4);
    g.player.controlEnabled = true;
    g.cam.setCinematic(false);
    g.cam.cineWeight = 0;
    g.audio.setMusic('dread');
    g.hud.reset();
    g.hud.area('The Witchwood', 'Where the Thornwives sing', 6);
    g.hud.setObjective('Find the Thornwives of Harrowmere');
    this.after(3, () => {
      this.think('Brother Ives said the old lullabies were kept by the Thornwives, west past the fog.');
      this.think('If anyone knows how to sing a mountain back to sleep, it will be them.');
    });
  }

  private spawnThrall(s: number, lat: number, enc: string, dormant = true): Penitent {
    const p = new Penitent();
    dressAsThrall(p.rig);
    (p as unknown as { name: string }).name = 'Briar Thrall';
    p.encounter = enc;
    p.place(this.spot(s, lat), this.yawAlong(s, true));
    if (!dormant) p.state = 'idle';
    this.g.addEnemy(p);
    return p;
  }

  private spawnWitch(s: number, lat: number, enc: string): Thornwife {
    const w = new Thornwife(this.g.worldRoot);
    w.encounter = enc;
    w.place(this.spot(s, lat), this.yawAlong(s, true));
    this.g.addEnemy(w);
    return w;
  }

  private startEncounter(id: 'grove' | 'hamlet' | 'chapel'): void {
    const g = this.g;
    this.enc[id] = 'active';
    if (id === 'grove') {
      this.spawnThrall(118, -1.5, id);
      this.spawnThrall(126, 1.8, id);
      this.spawnWitch(138, 0, id);
      g.nav.maxS = 150;
      this.after(1.5, () => g.hud.hint('Thornwives hurl witchfire. <kbd>Space</kbd> roll through it, then close the distance.', 6));
    } else if (id === 'hamlet') {
      this.spawnWitch(this.sHamlet + 34, -6, id);
      this.spawnWitch(this.sHamlet + 42, 6, id);
      this.spawnThrall(this.sHamlet + 26, -2, id, false);
      this.spawnThrall(this.sHamlet + 30, 3, id, false);
      this.spawnThrall(this.sHamlet + 44, 0, id, false);
      g.nav.maxS = this.sHamlet + 56;
    } else {
      this.spawnWitch(this.sChapel + 34, 0, id);
      this.spawnThrall(this.sChapel + 22, -2, id);
      this.spawnThrall(this.sChapel + 26, 2, id);
      g.nav.maxS = this.sChapel + 46;
    }
    g.audio.cackle(this.spot(this.g.path.samples[g.player.pathIndex].s + 20, 0));
  }

  private startFlyover(): void {
    const g = this.g;
    this.flyoverT = 0;
    g.worldRoot.add(this.drake.group);
    g.audio.roar(this.spot(this.sChapel + 40, 0));
    g.cam.addTrauma(0.4);
    this.after(1.2, () => this.say(CALDER, 'Saints… a drake. A true drake, here?'));
  }

  private startDragon(): void {
    const g = this.g;
    const wood = g.wood!;
    this.enc.dragon = 'active';
    this.stage = 'dragon';
    g.nav.minS = this.sRibs + 4;
    g.nav.maxS = this.sEnd;
    const d = this.drake;
    d.reset();
    d.perch.copy(wood.perch);
    d.landAt.copy(wood.arenaCenter).addScaledVector(g.path.at(this.sRibs + 40).tangent, 8);
    d.place(wood.perch.clone(), this.yawAlong(this.sEnd, true));
    if (!g.enemies.includes(d)) g.addEnemy(d);
    d.onPhase2 = () => {
      g.setPalette('drake');
      g.weather.emberLevel = 1;
      g.cam.addTrauma(0.6);
      g.audio.roar(d.pos);
      g.hud.hint('Vharoth takes to the sky more often — watch the burning markers', 4);
    };
    g.hud.setLetterbox(true);
    g.player.controlEnabled = false;
    g.cam.cinePos.copy(this.spot(this.sRibs + 10, 6)).setY(wood.arenaCenter.y + 4);
    g.cam.cineLook.copy(wood.perch);
    g.cam.setCinematic(true);
    this.after(0.6, () => d.wake());
    this.after(2.2, () => g.cam.cineLook.copy(d.landAt).setY(d.landAt.y + 3));
    this.after(4.2, () => {
      g.hud.area('Vharoth', 'The Ash-Drake of Harrowmere', 4);
      g.audio.setMusic('boss');
    });
    this.after(5.6, () => {
      g.cam.setCinematic(false);
      g.hud.setLetterbox(false);
      g.player.controlEnabled = true;
      g.hud.hint('Its breath sweeps side to side — get behind the head. Watch the tail.', 5);
    });
  }

  private lightCandle(i: number): void {
    const g = this.g;
    const c = this.candles[i];
    this.setLit(i, true);
    g.audio.candle();
    g.vfx.holyMotes(c.group.position.clone().setY(c.group.position.y + 1), 30);
    g.player.hp = g.player.maxHp;
    g.player.flasks = g.player.maxFlasks;
    this.checkpoint = { s: c.s, name: c.name };
    g.hud.hint('Wayside Candle lit — the flame will remember you', 4);
  }

  onEnemyDead(kind: string): void {
    const g = this.g;
    if (kind === 'dragon') {
      this.enc.dragon = 'cleared';
      g.slowmo(1.8);
      g.hud.setBoss(null);
      g.player.lockTarget = null;
      g.audio.setMusic('silence');
      this.stage = 'ending';
      this.endT = 0;
      return;
    }
    for (const id of ['grove', 'hamlet', 'chapel'] as const) {
      if (this.enc[id] !== 'active') continue;
      if (g.enemies.filter((e) => e.encounter === id && e.alive).length === 0) {
        this.enc[id] = 'cleared';
        g.nav.maxS = id === 'grove' ? this.sHamlet + 20 : id === 'hamlet' ? this.sChapel + 6 : this.sRibs - 3;
        if (id === 'grove') this.after(1, () => this.say(CALDER, 'A Thornwife, turned on her own road. What drove them to this?'));
        if (id === 'hamlet') this.after(1, () => this.think('Their huts are empty. Cold hearths. Whatever called them, they went to it.'));
        if (id === 'chapel') this.after(1, () => g.hud.setObjective('Enter the Ribs of Harrowmere'));
      }
    }
  }

  respawn(): void {
    const g = this.g;
    this.timeline = [];
    g.vfx.clear();
    g.hud.clearSubtitles();
    g.hud.setLetterbox(false);
    g.cam.setCinematic(false);
    for (const id of ['grove', 'hamlet', 'chapel'] as const) {
      if (this.enc[id] === 'active') {
        g.removeEnemies((e) => e.encounter === id);
        this.enc[id] = 'idle';
        this.fired.delete(`enc-${id}`);
      }
    }
    g.removeEnemies((e) => e.encounter === 'dragon');
    if (this.enc.dragon === 'active') {
      this.enc.dragon = 'idle';
      g.removeEnemies((e) => e === this.drake);
      this.drake.group.removeFromParent();
      this.drake.reset();
      g.nav.minS = 0;
      g.nav.maxS = this.sRibs - 3;
      g.hud.setBoss(null);
      g.setPalette('wood');
      g.audio.setMusic('dread');
      this.fired.delete('dragon');
    }
    this.placePlayer(this.checkpoint.s);
    g.player.controlEnabled = true;
    g.hud.reset();
  }

  jumpTo(stage: string): void {
    const g = this.g;
    if (!(STAGES as readonly string[]).includes(stage)) throw new Error(`Unknown test state: ${stage}`);
    if (stage === 'title') {
      this.setupTitle();
      document.querySelector('#title-screen')?.classList.remove('hidden');
      g.mode = 'title';
      g.hud.show(false);
      return;
    }
    this.resetWorld();
    g.hud.reset();
    g.cam.setCinematic(false);
    g.cam.cineWeight = 0;
    g.player.controlEnabled = true;
    this.stage = stage;
    g.audio.setMusic('dread');
    const idx = STAGES.indexOf(stage as (typeof STAGES)[number]);
    for (const id of ['intro-lines', 'cages', 'enc-grove']) this.fired.add(id);
    if (stage === 'wood') {
      this.placePlayer(100);
      this.fired.delete('enc-grove');
      return;
    }
    this.enc.grove = 'cleared';
    g.nav.maxS = this.sHamlet + 20;
    if (stage === 'hamlet') {
      this.fired.add('enc-hamlet');
      this.startEncounter('hamlet');
      this.placePlayer(this.sHamlet + 14);
      return;
    }
    this.enc.hamlet = 'cleared';
    this.setLit(0, true);
    this.checkpoint = { s: this.candles[0].s, name: 'hamlet' };
    for (const id of ['enc-hamlet', 'hamlet-arrive']) this.fired.add(id);
    g.nav.maxS = this.sChapel + 6;
    if (stage === 'chapel') {
      this.fired.add('enc-chapel');
      this.fired.add('flyover');
      this.startEncounter('chapel');
      this.placePlayer(this.sChapel + 8);
      return;
    }
    this.enc.chapel = 'cleared';
    for (const id of ['enc-chapel', 'flyover', 'ribs-arrive', 'dragon']) this.fired.add(id);
    this.setLit(1, true);
    this.checkpoint = { s: this.candles[1].s, name: 'ribs' };
    if (idx >= STAGES.indexOf('dragon')) {
      this.startDragon();
      this.timeline = [];
      this.drake.place(this.drake.landAt.clone(), this.yawAlong(this.sEnd, true));
      this.drake.wake();
      this.drake.state = 'chase';
      g.cam.setCinematic(false);
      g.cam.cineWeight = 0;
      g.hud.setLetterbox(false);
      g.player.controlEnabled = true;
      g.audio.setMusic('boss');
      this.placePlayer(this.sRibs + 22, -4);
      g.nav.minS = this.sRibs + 4;
      g.nav.maxS = this.sEnd;
      if (stage === 'ending') {
        this.drake.hp = 0;
        this.drake.alive = false;
        this.drake.state = 'dead';
        this.drake.stateT = 3;
        this.enc.dragon = 'cleared';
        this.stage = 'ending';
        this.endT = 6;
        this.placePlayer(this.sEnd - 8);
      }
    }
  }

  // ------------------------------------------------------------------ per frame
  update(dt: number, t: number): void {
    const g = this.g;
    for (let i = this.timeline.length - 1; i >= 0; i -= 1) {
      const ev = this.timeline[i];
      ev.t -= dt;
      if (ev.t <= 0) {
        this.timeline.splice(i, 1);
        ev.fn();
      }
    }
    this.progressIndex = Math.max(0, STAGES.indexOf(this.stage as (typeof STAGES)[number]));
    const s = g.path.samples[Math.max(0, g.player.pathIndex)]?.s ?? 0;
    if (this.stage !== 'title' && g.mode === 'play') this.beats(s);
    if (this.enc.dragon === 'active' && this.drake.alive) g.hud.setBoss(this.drake.name, this.drake.hp / this.drake.maxHp);
    // Dragon flyover: a pass overhead, setting the far treeline alight.
    if (this.flyoverT >= 0) {
      this.flyoverT += dt;
      const k = this.flyoverT / 6;
      const from = this.spot(this.sChapel - 40, -140).setY(this.spot(this.sChapel, 0).y + 30);
      const to = this.spot(this.sChapel + 90, 160).setY(from.y + 18);
      const p = from.clone().lerp(to, k);
      this.drake.cinematicFly(dt, t, p, Math.atan2(to.x - from.x, to.z - from.z));
      if (k > 0.35 && k < 0.6 && Math.floor(t * 8) !== Math.floor((t - dt) * 8)) {
        for (let i = 0; i < 3; i += 1) g.vfx.flame(this.drake.mouthWorld(new THREE.Vector3()).sub(g.worldRoot.position.clone().negate()).add(g.worldRoot.position.clone().negate()), new THREE.Vector3((Math.random() - 0.5) * 4, -18, (Math.random() - 0.5) * 4));
      }
      if (k >= 1) {
        this.flyoverT = -1;
        this.drake.group.removeFromParent();
      }
    }
    // Ending: the thorns wither and Mother Sallow speaks.
    if (this.endT >= 0) {
      const prev = this.endT;
      this.endT += dt;
      const e = this.endT;
      const cross = (x: number) => prev < x && e >= x;
      const wood = g.wood!;
      if (wood.thornMesh) wood.thornMesh.scale.setScalar(Math.max(0.001, 1 - Math.max(0, e - 3) / 2.5));
      if (cross(2.5)) {
        g.setPalette('wood');
        g.weather.emberLevel = 0.3;
        g.weather.moteLevel = 1;
        g.hud.setLetterbox(true);
        g.player.controlEnabled = false;
        g.cam.cinePos.copy(wood.skullAltar).add(new THREE.Vector3(0, 2.2, 0)).addScaledVector(g.path.at(this.sEnd).tangent, -6).addScaledVector(g.path.at(this.sEnd).right, 2.5);
        g.cam.cineLook.copy(wood.skullAltar).setY(wood.skullAltar.y + 1.1);
        g.cam.setCinematic(true);
        g.vfx.holyMotes(wood.skullAltar, 40);
      }
      if (cross(5.6)) {
        this.sallow.behavior = 'idle';
        g.hud.area('Mother Sallow', 'Eldest of the Thornwives', 4);
        this.say('Mother Sallow', 'So. The Bell-Knight comes down from the waking city.');
        this.say('Mother Sallow', 'That drake was no beast of this world, ser. It was a dream — Osseran’s dream, given teeth.');
        this.say('Mother Sallow', 'When a Founder stirs, its nightmares walk. Wyrms. Witch-plagues. Things with no names yet.');
        this.say('Mother Sallow', 'My sisters breathed its smoke and forgot their songs. Every lullaby we kept is ash… save one.');
        this.say('Mother Sallow', 'Beneath the Drowned Choir of Saint Merrow, the dead still sing the Hymn of Sleeping. Go, knight. Before the others wake.');
      }
      if (cross(34)) g.hud.fade(1, 2.5);
      if (cross(37)) {
        g.hud.fade(0, 3);
        g.showEnd();
      }
    }
  }

  private beats(s: number): void {
    const g = this.g;
    this.once('witch-laugh', s > 55, () => {
      g.audio.cackle(this.spot(s + 30, 12));
      this.think('Laughter, in the trees. And cages — hung like lanterns.');
    });
    this.once('enc-grove', s > 104, () => this.startEncounter('grove'));
    this.once('hamlet-arrive', s > this.sHamlet - 4 && this.enc.grove === 'cleared', () => {
      g.hud.area('Hollowmere', 'The stilt-hamlet of the Thornwives', 4);
      this.after(4, () => g.hud.hint('A Wayside Candle burns low by the first hut. <kbd>E</kbd> to light it.', 5));
    });
    this.once('enc-hamlet', s > this.sHamlet + 18 && this.enc.grove === 'cleared', () => this.startEncounter('hamlet'));
    this.once('flyover', s > this.sChapel - 10 && this.enc.hamlet === 'cleared', () => {
      g.hud.area('The Chapel of Thorns', '', 3.5);
      this.startFlyover();
    });
    this.once('enc-chapel', s > this.sChapel + 14 && this.enc.hamlet === 'cleared', () => this.startEncounter('chapel'));
    this.once('ribs-arrive', s > this.sRibs - 20 && this.enc.chapel === 'cleared', () => {
      this.think('The Ribs of Harrowmere. So the pilgrims were right — a giant did die here.');
      this.think('And something has made a nest of it.');
    });
    this.once('dragon', s > this.sRibs + 2 && this.enc.chapel === 'cleared', () => this.startDragon());
    // Interactables: candles.
    let best = null as { label: string; pos: THREE.Vector3; act: () => void } | null;
    if (g.player.controlEnabled && g.enemies.every((e) => !e.alive || e.state === 'dormant' || e.state === 'idle')) {
      this.candles.forEach((c, i) => {
        if (c.group.position.distanceTo(g.player.pos) < 2.8) {
          best = { label: c.lit ? 'Rest at the Wayside Candle' : 'Light the Wayside Candle', pos: c.group.position, act: () => this.lightCandle(i) };
        }
      });
    }
    if (best !== this.prompt) {
      this.prompt = best;
      g.hud.prompt(best ? (best as { label: string }).label : null, g.input.usingTouch ? '✋' : 'E');
    }
    if (this.prompt && g.input.consume('interact')) {
      this.prompt.act();
      this.prompt = null;
      g.hud.prompt(null);
    }
  }
}
