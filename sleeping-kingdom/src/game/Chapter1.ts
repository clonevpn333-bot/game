import * as THREE from 'three';
import type { Game } from './Game';
import { Folk, type NpcBehavior } from '../entities/Npc';
import { Penitent, type Enemy } from '../entities/Enemies';
import { Mats } from '../world/Materials';
import { latheG } from '../entities/Rig';
import { worldBox } from '../world/geo';
import type { TorchSpot } from '../world/Terrain';
import type { LightPool } from '../systems/LightPool';
import { damp, smoothstep } from '../utils/math';

type EncounterState = 'idle' | 'active' | 'cleared';
type Interactable = { id: string; pos: THREE.Vector3; radius: number; label: () => string; enabled: () => boolean; action: () => void };
type Checkpoint = { s: number; lateral: number; mounted: boolean; name: string };

const STAGES = ['title', 'ride', 'gate', 'market', 'tremor', 'combat', 'stair', 'boss', 'ending'] as const;
type Stage = (typeof STAGES)[number] | 'death';

const CALDER = 'Ser Calder';

export class Chapter {
  stage: Stage = 'title';
  progressIndex = 0;
  stir = 0;
  readonly candleSpots: TorchSpot[] = [];
  private candles: Array<{ group: THREE.Group; flames: THREE.Object3D[]; lit: boolean; s: number; lateral: number; name: string; poolIndex: number }> = [];
  private pool: LightPool | null = null;
  private timeline: Array<{ t: number; fn: () => void }> = [];
  private readonly fired = new Set<string>();
  private readonly interactables: Interactable[] = [];
  private activeInteract: Interactable | null = null;
  private checkpoint: Checkpoint = { s: 6, lateral: 0, mounted: true, name: 'road' };
  private readonly enc: Record<'broken' | 'stair' | 'boss', EncounterState> = { broken: 'idle', stair: 'idle', boss: 'idle' };
  private brokenWave = 0;

  // World state.
  private gateOpen = false;
  private dismounted = false;
  private bellsRinging = false;
  private tremor = 0;
  private tremorTarget = 0;
  private statueFall = 0;
  private statueFalling = false;
  private fountainTremble = 0;
  private risersOn = false;
  private riserT = 0;
  private debrisT = 0;
  private crackLevel = 0;
  private priestDone = false;
  private bossDead = false;
  private eyeT = -1;
  private readonly bellTimers: number[] = [];
  private fogGate!: THREE.Mesh;
  private readonly fogUniforms = { uTime: { value: 0 }, uOpacity: { value: 1 } };
  private gatewarden!: Folk;
  private priest!: Folk;
  private readonly folkHomes: Array<{ f: Folk; pos: THREE.Vector3; yaw: number; behavior: NpcBehavior }> = [];
  private readonly chatter: Array<{ f: Folk; lines: Array<[string, string]>; done: boolean }> = [];

  // Path landmarks.
  readonly sGate: number;
  readonly sStreet: number;
  readonly sMarket: number;
  readonly sMarketCenter: number;
  readonly sBroken: number;
  readonly sStair: number;
  readonly sPlaza: number;
  readonly sFog: number;
  readonly sBridge: number;
  readonly sEnd: number;

  constructor(private readonly g: Game) {
    const p = g.path;
    this.sGate = g.city!.portcullis.userData.s as number;
    this.sStreet = p.zoneStart('street');
    this.sMarket = p.zoneStart('market');
    this.sMarketCenter = this.sMarket + 30;
    this.sBroken = p.zoneStart('broken');
    this.sStair = p.zoneStart('stair');
    this.sPlaza = p.zoneStart('plaza');
    this.sFog = this.sPlaza + 10;
    this.sBridge = p.zoneStart('bridge');
    this.sEnd = p.length;
    this.buildCandles();
    this.buildFogGate();
    this.buildPeople();
    this.buildInteractables();
    for (let i = 0; i < g.city!.bells.length; i += 1) this.bellTimers.push(i * 0.37);
  }

  // ------------------------------------------------------------------ construction
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
      [this.sGate + 14, -3.4, 'gate'],
      [this.sStair - 3, 3.0, 'stair'],
      [this.sPlaza + 2, -4.6, 'plaza'],
    ];
    const m = Mats();
    for (const [s, lateral, name] of defs) {
      const group = new THREE.Group();
      const pos = this.spot(s, lateral);
      group.position.copy(pos);
      group.rotation.y = this.yawAlong(s);
      const altar = new THREE.Mesh(worldBox(1.3, 0.9, 0.8, 2), m.stoneWarm);
      altar.position.y = 0.45;
      altar.castShadow = true;
      group.add(altar);
      const flames: THREE.Object3D[] = [];
      for (let i = 0; i < 5; i += 1) {
        const h = 0.18 + (i % 3) * 0.1;
        const c = new THREE.Mesh(latheG([[0.04, 0], [0.04, h], [0, h + 0.01]], 6), m.robeWhite);
        c.position.set(-0.45 + i * 0.22, 0.9, (i % 2) * 0.12 - 0.06);
        group.add(c);
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.09, 5), m.goldGlow);
        f.position.set(c.position.x, 0.9 + h + 0.05, c.position.z);
        f.visible = false;
        group.add(f);
        flames.push(f);
      }
      this.g.worldRoot.add(group);
      this.candleSpots.push({ pos: pos.clone().setY(pos.y + 1.3), zone: 'gate', s });
      this.candles.push({ group, flames, lit: false, s: s + 1.5, lateral: lateral * 0.5, name, poolIndex: -1 });
    }
  }

  bindCandles(pool: LightPool, offset: number): void {
    this.pool = pool;
    this.candles.forEach((c, i) => {
      c.poolIndex = offset + i;
      this.setCandleLit(i, false);
    });
  }

  private setCandleLit(i: number, lit: boolean): void {
    const c = this.candles[i];
    c.lit = lit;
    for (const f of c.flames) f.visible = lit;
    if (this.pool && c.poolIndex >= 0) this.pool.setLit(c.poolIndex, lit);
  }

  private buildFogGate(): void {
    const a = this.g.path.at(this.sFog);
    const geo = new THREE.PlaneGeometry(a.width + 2, 9, 1, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.fogUniforms,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime, uOpacity; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.7, 78.3))) * 43758.5); }
        float n(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
        void main(){ vec2 p = vUv * vec2(6.0, 3.0);
          float f = n(p + vec2(uTime * 0.3, -uTime * 0.5)) * 0.6 + n(p * 2.3 - vec2(uTime * 0.2, uTime * 0.7)) * 0.4;
          float edge = smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x) * smoothstep(1.0, 0.6, vUv.y);
          gl_FragColor = vec4(vec3(1.0, 0.78, 0.4) * f * edge * 0.75 * uOpacity, 1.0); }`,
    });
    this.fogGate = new THREE.Mesh(geo, mat);
    this.fogGate.position.copy(a.pos).setY(a.pos.y + 4.5);
    this.fogGate.rotation.y = Math.atan2(a.tangent.x, a.tangent.z);
    this.fogGate.renderOrder = 6;
    this.g.worldRoot.add(this.fogGate);
  }

  private addFolk(style: ConstructorParameters<typeof Folk>[0], behavior: NpcBehavior, s: number, lateral: number, yawOffset: number, name: string): Folk {
    const f = new Folk(style, behavior, name, this.g.folk.length * 1.7);
    const pos = this.spot(s, lateral);
    const yaw = this.yawAlong(s) + yawOffset;
    f.place(pos, yaw);
    this.g.worldRoot.add(f.group);
    this.g.folk.push(f);
    this.folkHomes.push({ f, pos: pos.clone(), yaw, behavior });
    return f;
  }

  private buildPeople(): void {
    const m = Mats();
    const skins = ['#c99878', '#a87458', '#e0b090', '#8a5a40'];
    this.gatewarden = this.addFolk({ robe: m.robeGrey, skin: skins[0], mood: 'grim', guard: true }, 'guard', this.sGate - 5, 4.2, -Math.PI / 2, 'Gatewarden');
    const s0 = this.sStreet;
    const talkA = this.addFolk({ robe: m.robeBrown, skin: skins[1], mood: 'calm', hood: true }, 'talk', s0 + 18, -3.2, Math.PI / 2, 'Washerwoman');
    this.addFolk({ robe: m.robeGreen, skin: skins[2], mood: 'calm', hair: true }, 'talk', s0 + 19.4, -3.0, -Math.PI / 2 - 0.4, 'Tanner');
    this.addFolk({ robe: m.robeRed, skin: skins[0], mood: 'calm', hair: true, lantern: true }, 'pace', s0 + 34, 2.4, 0, 'Lamplighter');
    const oldMan = this.addFolk({ robe: m.robeGrey, skin: skins[2], mood: 'old', hood: true }, 'lookup', s0 + 46, 3.4, -Math.PI / 2, 'Old Bram');
    this.addFolk({ robe: m.robeBrown, skin: skins[3], mood: 'calm', hair: true }, 'pace', s0 + 58, -2.6, Math.PI, 'Porter');
    const mc = this.sMarketCenter;
    const merchant = this.addFolk({ robe: m.robeRed, skin: skins[1], mood: 'grim', hair: true }, 'talk', mc - 10, 8.5, -Math.PI / 2, 'Spice Merchant');
    this.addFolk({ robe: m.robeGreen, skin: skins[0], mood: 'calm', hood: true }, 'talk', mc - 9, 6.6, Math.PI / 2, 'Goodwife Ama');
    this.addFolk({ robe: m.robeWhite, skin: skins[2], mood: 'calm', hood: true }, 'pray', mc - 15, 3.2, Math.PI, 'Pilgrim');
    this.addFolk({ robe: m.robeBrown, skin: skins[3], mood: 'calm', hair: true, lantern: true }, 'pace', mc + 4, -7, Math.PI / 2, 'Watchman');
    this.addFolk({ robe: m.robeGrey, skin: skins[1], mood: 'calm', hair: true }, 'lookup', mc + 9, 6, Math.PI, 'Boy');
    this.addFolk({ robe: m.robeBlack, skin: skins[0], mood: 'grim', hood: true }, 'idle', mc + 14, -6, Math.PI, 'Mendicant');
    this.priest = this.addFolk({ robe: m.robeWhite, skin: skins[2], mood: 'fear', hood: true }, 'dying', this.sPlaza - 4, 3.6, -Math.PI / 2 - 0.6, 'Brother Ives');
    this.chatter.push(
      { f: talkA, lines: [['Washerwoman', 'Four hundred years those bells have hung silent, and tonight my teeth ache like they mean to ring.'], ['Tanner', 'Hush. The Bellkeepers hear everything.']], done: false },
      { f: oldMan, lines: [['Old Bram', 'My grandmother swore the mountain breathes in winter. We laughed at her.'], ['Old Bram', 'Look at the cistern, ser. Warm as blood.']], done: false },
      { f: merchant, lines: [['Spice Merchant', 'Warm wells, dead fish in the cisterns, and the Bellkeepers hiding behind their doors.'], ['Spice Merchant', 'Mark me, ser knight. The Church knows something it is not saying.']], done: false },
    );
    // The dog dozes by the fountain.
    const dp = this.spot(mc - 6, -5.5);
    this.g.dog.group.position.copy(dp);
    this.g.dog.yaw = this.yawAlong(mc);
  }

  private buildInteractables(): void {
    const gateStop = this.sGate - 16;
    this.interactables.push({
      id: 'dismount',
      pos: this.spot(gateStop, 0),
      radius: 9,
      label: () => 'Dismount',
      enabled: () => this.g.player.mounted && this.fired.has('gate-arrive'),
      action: () => this.dismount(),
    });
    this.candles.forEach((c, i) => {
      this.interactables.push({
        id: `candle-${c.name}`,
        pos: c.group.position.clone(),
        radius: 2.6,
        label: () => (c.lit ? 'Rest at the Wayside Candle' : 'Light the Wayside Candle'),
        enabled: () => !this.g.player.mounted && this.combatClear(),
        action: () => this.lightCandle(i),
      });
    });
    this.interactables.push({
      id: 'priest',
      pos: this.priest.pos.clone(),
      radius: 3,
      label: () => 'Kneel beside the dying priest',
      enabled: () => !this.priestDone && this.enc.stair === 'cleared',
      action: () => this.priestScene(),
    });
    this.interactables.push({
      id: 'fog',
      pos: this.spot(this.sFog - 1, 0),
      radius: 4,
      label: () => 'Pass through the golden fog',
      enabled: () => this.priestDone && this.enc.boss === 'idle',
      action: () => this.startBoss(),
    });
  }

  private combatClear(): boolean {
    return this.g.enemies.every((e) => !e.alive || e.state === 'dormant');
  }

  // ------------------------------------------------------------------ timeline helpers
  private after(seconds: number, fn: () => void): void {
    this.timeline.push({ t: seconds, fn });
  }

  private once(id: string, cond: boolean, fn: () => void): void {
    if (cond && !this.fired.has(id)) {
      this.fired.add(id);
      fn();
    }
  }

  private think(text: string, d = 0): void {
    this.g.hud.say('', text, d, true);
  }

  private say(who: string, text: string, d = 0): void {
    this.g.hud.say(who, text, d);
  }

  // ------------------------------------------------------------------ flow
  setupTitle(): void {
    this.resetWorld();
    this.stage = 'title';
    const g = this.g;
    g.player.controlEnabled = false;
    this.placePlayer(12, 0, true);
    g.player.yaw = this.yawAlong(12);
    const a = g.path.at(4);
    g.cam.cinePos.copy(a.pos).addScaledVector(a.right, 5.5).setY(a.pos.y + 2.2);
    g.cam.cineLook.copy(g.city!.cathedralDoor).setY(g.city!.cathedralDoor.y + 60);
    g.cam.setCinematic(true);
    g.cam.cineWeight = 1;
    g.audio.setMusic('title');
    g.audio.setBeds({ wind: 0.6, rain: 0.6, crowd: 0, rumble: 0, fire: 0 });
  }

  begin(): void {
    const g = this.g;
    this.resetWorld();
    this.stage = 'ride';
    this.placePlayer(6, 0, true);
    g.player.controlEnabled = true;
    g.cam.setCinematic(false);
    g.cam.cineWeight = 0;
    g.cam.snap(g.player.pos, g.player.yaw);
    g.audio.setMusic('calm');
    g.hud.reset();
    g.hud.area('The Pilgrim Road', 'Three leagues from Velmour', 6);
    g.hud.setObjective('Ride to the capital');
    this.after(2.5, () => g.hud.hint('<kbd>W A S D</kbd> ride &nbsp; <kbd>Shift</kbd> gallop &nbsp; <kbd>Mouse</kbd> look', 7));
    this.after(4, () => {
      this.think('Seven winters on the Ashfront. Seven winters of mud, and other men’s prayers.');
      this.think('And still the road home climbs the same.');
    });
  }

  private placePlayer(s: number, lateral: number, mounted: boolean): void {
    const g = this.g;
    const pos = this.spot(s, lateral);
    if (mounted) {
      g.player.respawn(pos, this.yawAlong(s), g.path.indexAt(s));
      g.player.mount();
    } else {
      g.player.respawn(pos, this.yawAlong(s), g.path.indexAt(s));
    }
    g.player.pathIndex = g.nav.resolve(g.player.pos, 0.45, g.path.indexAt(s));
    g.cam.snap(g.worldRoot.localToWorld(g.player.pos.clone()), g.player.yaw);
  }

  /** Leave Ash tethered outside the gate. */
  private parkHorse(): void {
    const g = this.g;
    const s = this.sGate - 16;
    g.worldRoot.add(g.player.horse.root);
    g.player.horse.root.position.copy(this.spot(s, -2.5));
    g.player.horse.root.rotation.y = this.yawAlong(s) + 0.4;
    g.player.horse.update(0.016, 0, 0);
  }

  private dismount(): void {
    const g = this.g;
    this.dismounted = true;
    const s = g.path.samples[g.player.pathIndex];
    g.player.dismount(g.worldRoot, s.right.clone().multiplyScalar(-1));
    g.player.pathIndex = g.nav.resolve(g.player.pos, 0.45, g.player.pathIndex);
    g.hud.hint('<kbd>LMB</kbd> attack &nbsp; <kbd>RMB</kbd> heavy &nbsp; <kbd>Space</kbd> roll &nbsp; <kbd>Shift</kbd> sprint', 6);
    this.say('Gatewarden', 'Hold there — a knight of the Order? We heard the whole Ashfront host was lost.');
    this.say(CALDER, 'Not all of it. Ser Calder, of the Still Bell. Returning to the chapterhouse.');
    this.say('Gatewarden', 'Then you’ve come home on a strange night, ser. The Bellkeepers sealed the cathedral at dusk. No reason given.');
    this.say('Gatewarden', 'Raise the gate! — Mind the streets. Folk are restless. The wells have run warm all week.');
    this.after(13, () => this.openGate());
  }

  private openGate(): void {
    if (this.gateOpen) return;
    this.gateOpen = true;
    this.g.audio.crumble(this.g.city!.portcullis.position, 0.5);
    this.g.nav.maxS = this.sMarketCenter + 6;
    this.after(2.5, () => {
      this.g.hud.area('Velmour', 'The Crown of Spires', 5);
      this.g.hud.setObjective('Report to the Cathedral of the Still Bell');
      this.g.setPalette('city');
      this.g.weather.rainLevel = 0.45;
      this.g.audio.setBeds({ rain: 0.35, crowd: 0.35, fire: 0.5 });
      this.g.fogDensity = 0.0016;
    });
  }

  private lightCandle(i: number): void {
    const g = this.g;
    const c = this.candles[i];
    const first = !c.lit;
    this.setCandleLit(i, true);
    g.audio.candle();
    g.vfx.holyMotes(c.group.position.clone().setY(c.group.position.y + 1), 30);
    g.player.hp = g.player.maxHp;
    g.player.flasks = g.player.maxFlasks;
    g.player.stamina = g.player.maxStamina;
    this.checkpoint = { s: c.s, lateral: c.lateral, mounted: false, name: c.name };
    g.hud.hint(first ? 'Wayside Candle lit — the flame will remember you' : 'You rest. Flasks refilled.', 4);
    // Resting restores uncleared encounters like any respawn would; here we only refill.
  }

  private ringBells(): void {
    this.bellsRinging = true;
  }

  private marketSequence(): void {
    const g = this.g;
    g.hud.area('The Market of Saint Ossery', '', 4);
    this.after(2, () => {
      this.ringBells();
      g.audio.bell(g.city!.bells[0]?.pos, 3.2, 0, 0.9);
      g.audio.setMusic('silence');
      for (const f of g.folk) if (f.behavior === 'talk' || f.behavior === 'pace' || f.behavior === 'idle') f.behavior = 'lookup';
    });
    this.after(3.2, () => this.think('The bells…'));
    this.after(5.5, () => this.say('Goodwife Ama', 'Who is ringing them? The towers are empty — the towers are empty!'));
    this.after(7, () => {
      g.dog.state = 'bark';
      g.flock.scatter(() => g.rng());
      g.audio.crows();
    });
    this.after(9, () => {
      this.fountainTremble = 1;
      this.tremorTarget = 0.15;
      this.think('Nobody is pulling them.');
    });
    this.after(13, () => this.tiltCity());
  }

  private tiltCity(): void {
    const g = this.g;
    this.stage = 'tremor';
    g.tiltTarget = 0.055;
    g.tiltWobble = 0.03;
    this.tremorTarget = 0.7;
    this.statueFalling = true;
    g.cam.addTrauma(0.9);
    g.audio.crumble(g.city!.marketCenter, 1.5);
    g.audio.setMusic('dread');
    g.setPalette('tremor');
    g.weather.emberLevel = 0.7;
    g.weather.ashLevel = 0.8;
    g.audio.setBeds({ crowd: 0.9, rumble: 0.9 });
    for (const f of g.folk) {
      if (f === this.gatewarden || f === this.priest) continue;
      f.panic(() => g.rng());
      g.audio.scream(f.pos, 0.8 + g.rng() * 0.5);
    }
    g.hud.hint('The city is moving!', 3);
    this.checkpoint = { s: this.sMarketCenter + 8, lateral: 0, mounted: false, name: 'market' };
    this.after(2.5, () => {
      this.say(CALDER, 'The ground — the whole mountain is moving!');
      g.tiltTarget = 0.032;
      g.tiltWobble = 0.02;
      this.tremorTarget = 0.45;
      g.nav.maxS = this.sBroken + 62;
      this.crackLevel = 1;
    });
    this.after(4, () => g.hud.setObjective('Reach the Cathedral of the Still Bell'));
    this.after(7, () => {
      g.audio.setBeds({ crowd: 0.3 });
    });
  }

  private spawnBroken(wave: number): void {
    const g = this.g;
    const pts: Array<[number, number, number]> =
      wave === 1
        ? [[this.sBroken + 30, -2.5, 0], [this.sBroken + 34, 2.5, 0.5], [this.sBroken + 40, 0, 1.0]]
        : [[this.sBroken + 52, -3, 0], [this.sBroken + 56, 3, 0.4], [this.sBroken + 18, 0, 0.8]];
    for (const [s, lat, delay] of pts) {
      const m = g.spawnMite(this.spot(s, lat), 'broken');
      m.emerge(delay);
      g.vfx.dust(m.pos, 10, 1, '#5a4030');
    }
    g.audio.crumble(this.spot(pts[0][0], 0), 0.8);
  }

  private spawnStair(): void {
    const g = this.g;
    const defs: Array<[number, number]> = [
      [this.sStair + 12, -1.8],
      [this.sStair + 26, 1.6],
    ];
    for (const [s, lat] of defs) {
      const p = new Penitent();
      p.encounter = 'stair';
      p.place(this.spot(s, lat), this.yawAlong(s, true));
      g.addEnemy(p);
    }
  }

  private priestScene(): void {
    const g = this.g;
    this.priestDone = true;
    g.hud.clearSubtitles();
    this.say('Brother Ives', 'Ser… you wear the Bell. Then hear me. We never rang them for prayer.');
    this.say('Brother Ives', 'Four hundred years we kept them still. A lullaby of silence… so that He would not wake.');
    this.say('Brother Ives', 'Velmour was built upon His brow. The cathedral… upon His skull.');
    this.say('Brother Ives', 'Tonight someone rang the Knell. And the Warden will not let it be silenced again.');
    this.say('Brother Ives', 'Silence the Knell, ser… before the mountain opens its eye.');
    this.after(20, () => {
      this.priest.behavior = 'cower';
      this.think('Rest, brother.');
      g.hud.setObjective('Silence the Knell');
      this.lightCandle(2);
    });
  }

  private startBoss(): void {
    const g = this.g;
    this.enc.boss = 'active';
    this.stage = 'boss';
    g.nav.minS = this.sFog + 1.5;
    g.nav.maxS = this.sEnd;
    this.fogUniforms.uOpacity.value = 0.25;
    const boss = g.boss;
    boss.reset();
    if (!boss.group.parent) g.addEnemy(boss);
    else if (!g.enemies.includes(boss)) g.enemies.push(boss);
    const c = this.g.city!.plazaCenter;
    boss.place(c.clone(), this.yawAlong(this.sPlaza + 34, true));
    boss.pathIndex = g.nav.resolve(boss.pos, 1.2, -1);
    boss.cape.reset();
    // Player walks through the fog.
    g.player.pos.copy(this.spot(this.sFog + 3, 0));
    g.player.yaw = this.yawAlong(this.sFog);
    g.hud.setLetterbox(true);
    g.player.controlEnabled = false;
    g.cam.cinePos.copy(this.spot(this.sFog + 6, 5)).setY(c.y + 3);
    g.cam.cineLook.copy(c).setY(c.y + 4);
    g.cam.setCinematic(true);
    g.audio.bell(g.city!.bells[0]?.pos, 3.4, 0, 1);
    this.after(0.8, () => boss.wake());
    this.after(2.2, () => g.audio.bell(g.city!.bells[1]?.pos, 3.4, 0, 1));
    this.after(3.5, () => {
      g.hud.area('The Knellwarden', 'Last Keeper of the Still Bell', 4);
      g.audio.setMusic('boss');
    });
    this.after(4.6, () => {
      g.cam.setCinematic(false);
      g.hud.setLetterbox(false);
      g.player.controlEnabled = true;
      g.hud.hint('<kbd>Q</kbd> lock on &nbsp; <kbd>R</kbd> drink an Ember Flask', 5);
    });
    boss.onPhase2 = () => {
      g.setPalette('eye');
      g.cam.addTrauma(0.5);
      this.tremorTarget = 0.8;
      g.tiltWobble = 0.03;
      g.hud.hint('The Knell cracks — the Warden rages', 3);
    };
  }

  private bossKilled(): void {
    const g = this.g;
    this.bossDead = true;
    this.enc.boss = 'cleared';
    g.slowmo(1.6);
    g.hud.setBoss(null);
    g.player.lockTarget = null;
    this.bellsRinging = false;
    g.audio.setMusic('silence');
    this.tremorTarget = 0;
    g.audio.setBeds({ rumble: 0, crowd: 0 });
    this.stage = 'ending';
    this.eyeT = 0;
    this.after(3, () => this.think('…Silence.'));
    this.after(6, () => {
      this.tremorTarget = 0.9;
      g.audio.setBeds({ rumble: 1 });
      g.cam.addTrauma(0.6);
      this.say(CALDER, 'No. Not silence — breath.');
    });
  }

  // ------------------------------------------------------------------ public hooks
  onEnemyDead(kind: string): void {
    const g = this.g;
    if (kind === 'boss') {
      this.bossKilled();
      return;
    }
    if (this.enc.broken === 'active') {
      const left = g.enemies.filter((e) => e.encounter === 'broken' && e.alive).length;
      if (left === 0) {
        if (this.brokenWave === 1) {
          this.brokenWave = 2;
          this.after(1.2, () => this.spawnBroken(2));
        } else {
          this.enc.broken = 'cleared';
          g.nav.maxS = this.sPlaza + 6;
          this.after(1, () => this.say(CALDER, 'Marrow-crawlers… they came up out of the stone itself.'));
          this.after(4, () => this.think('The cathedral. Whatever this is, the Bellkeepers know.'));
        }
      }
    }
    if (this.enc.stair === 'active') {
      const left = g.enemies.filter((e) => e.encounter === 'stair' && e.alive).length;
      if (left === 0) {
        this.enc.stair = 'cleared';
        g.nav.maxS = this.sFog - 0.5;
        g.hud.setObjective('Find the Bellkeepers');
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
    for (const key of ['broken', 'stair'] as const) {
      if (this.enc[key] === 'active') {
        g.removeEnemies((e) => e.encounter === key);
        this.enc[key] = 'idle';
        this.fired.delete(`enc-${key}`);
        this.brokenWave = 0;
      }
    }
    g.removeEnemies((e) => e.encounter === 'boss');
    if (this.enc.boss === 'active') {
      this.enc.boss = 'idle';
      g.removeEnemies((e) => e === g.boss);
      g.boss.reset();
      g.boss.group.removeFromParent();
      g.nav.minS = 0;
      g.nav.maxS = this.sFog - 0.5;
      this.fogUniforms.uOpacity.value = 1;
      g.audio.setMusic('dread');
      g.hud.setBoss(null);
      this.stage = 'stair';
    }
    if (this.enc.stair === 'idle' && this.stage !== 'ride') {
      // Re-arm: kneeling penitents return.
      g.nav.maxS = Math.min(g.nav.maxS, this.sPlaza + 6);
    }
    const c = this.checkpoint;
    this.placePlayer(c.s, c.lateral, c.mounted);
    g.player.controlEnabled = true;
    g.hud.reset();
  }

  // ------------------------------------------------------------------ jump (test hooks / QA)
  private resetWorld(): void {
    const g = this.g;
    this.timeline = [];
    this.fired.clear();
    this.gateOpen = false;
    this.dismounted = false;
    this.bellsRinging = false;
    this.tremor = 0;
    this.tremorTarget = 0;
    this.statueFall = 0;
    this.statueFalling = false;
    this.fountainTremble = 0;
    this.risersOn = false;
    this.riserT = 0;
    this.crackLevel = 0;
    this.priestDone = false;
    this.bossDead = false;
    this.eyeT = -1;
    this.stir = 0;
    this.brokenWave = 0;
    this.enc.broken = 'idle';
    this.enc.stair = 'idle';
    this.enc.boss = 'idle';
    this.checkpoint = { s: 6, lateral: 0, mounted: true, name: 'road' };
    g.removeEnemies(() => true);
    g.boss.reset();
    g.boss.group.removeFromParent();
    g.tilt = 0;
    g.tiltTarget = 0;
    g.tiltWobble = 0;
    g.nav.minS = 0;
    g.nav.maxS = this.sGate - 18;
    g.city!.portcullis.position.y = g.city!.portcullis.userData.baseY as number;
    g.city!.statuePivot.rotation.set(0, 0, 0);
    for (const r of g.city!.risers) {
      r.progress = 0;
      r.group.position.y = 0;
    }
    for (const c of g.city!.cracks) (c.material as THREE.MeshBasicMaterial).opacity = 0;
    for (const h of this.folkHomes) {
      h.f.place(h.pos, h.yaw);
      h.f.behavior = h.behavior;
      h.f.removed = false;
      h.f.group.visible = true;
    }
    for (const c of this.chatter) c.done = false;
    this.candles.forEach((_, i) => this.setCandleLit(i, false));
    this.fogUniforms.uOpacity.value = 1;
    g.founder!.setOpen(0, true);
    g.setPalette('night', true);
    g.weather.rainLevel = 1;
    g.weather.emberLevel = 0;
    g.weather.ashLevel = 0;
    g.weather.moteLevel = 0;
    g.fogDensity = 0.0006;
    g.hud.setLetterbox(false);
    g.hud.setBoss(null);
    g.dog.state = 'sit';
    g.dog.group.visible = true;
    g.audio.setBeds({ wind: 0.6, rain: 0.6, crowd: 0, rumble: 0, fire: 0 });
  }

  jumpTo(stage: string): void {
    const g = this.g;
    if (!(STAGES as readonly string[]).includes(stage) && stage !== 'death') throw new Error(`Unknown test state: ${stage}`);
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
    const idx = STAGES.indexOf((stage === 'death' ? 'combat' : stage) as (typeof STAGES)[number]);
    const at = (s: Stage) => idx >= STAGES.indexOf(s as (typeof STAGES)[number]);
    this.stage = stage as Stage;
    if (stage === 'ride') {
      this.fired.add('reveal');
      this.placePlayer(150, 0, true);
      g.audio.setMusic('calm');
      g.hud.setObjective('Ride to the capital');
      return;
    }
    // On foot from here on: everything the road told you has already been told.
    for (const id of ['reveal', 'skull', 'bells-lore', 'bridge', 'gate-arrive', 'gate-candle-hint']) this.fired.add(id);
    this.parkHorse();
    this.dismounted = true;
    this.gateOpen = true;
    g.city!.portcullis.position.y = (g.city!.portcullis.userData.baseY as number) + 9;
    g.setPalette('city', true);
    g.weather.rainLevel = 0.45;
    g.fogDensity = 0.0016;
    g.nav.maxS = this.sMarketCenter + 6;
    this.setCandleLit(0, true);
    this.checkpoint = { s: this.candles[0].s, lateral: this.candles[0].lateral, mounted: false, name: 'gate' };
    g.hud.setObjective('Report to the Cathedral of the Still Bell');
    if (stage === 'gate') {
      this.placePlayer(this.sGate + 6, 0, false);
      return;
    }
    if (stage === 'market') {
      this.fired.add('market');
      this.placePlayer(this.sMarketCenter - 22, 0, false);
      return;
    }
    // Post-tremor.
    this.fired.add('market');
    this.fired.add('chatter');
    this.bellsRinging = true;
    this.statueFall = 1;
    g.city!.statuePivot.rotation.z = -Math.PI / 2 + 0.15;
    g.tiltTarget = 0.032;
    g.tilt = 0.032;
    this.tremor = this.tremorTarget = 0.45;
    this.crackLevel = 1;
    g.setPalette('tremor', true);
    g.weather.emberLevel = 0.7;
    g.weather.ashLevel = 0.8;
    g.audio.setMusic('dread');
    g.audio.setBeds({ rumble: 0.8, crowd: 0.2 });
    for (const f of g.folk) if (f !== this.gatewarden && f !== this.priest) f.group.visible = false;
    g.dog.state = 'gone';
    g.dog.group.visible = false;
    g.nav.maxS = this.sBroken + 62;
    g.hud.setObjective('Reach the Cathedral of the Still Bell');
    this.checkpoint = { s: this.sMarketCenter + 8, lateral: 0, mounted: false, name: 'market' };
    if (stage === 'tremor') {
      this.placePlayer(this.sMarketCenter + 6, 0, false);
      g.tiltTarget = 0.055;
      g.tilt = 0.05;
      return;
    }
    this.fired.add('risers');
    this.risersOn = true;
    this.riserT = 30;
    if (stage === 'combat' || stage === 'death') {
      this.fired.add('enc-broken');
      this.enc.broken = 'active';
      this.brokenWave = 1;
      this.placePlayer(this.sBroken + 22, 0, false);
      const pts: Array<[number, number]> = [[this.sBroken + 27, -2.4], [this.sBroken + 29, 2.2], [this.sBroken + 32, 0]];
      for (const [s, lat] of pts) {
        const m = g.spawnMite(this.spot(s, lat), 'broken');
        m.yaw = this.yawAlong(s, true);
        (m as Enemy).state = 'chase';
      }
      if (stage === 'death') {
        g.player.hp = 0;
        g.player.state = 'dead';
      }
      return;
    }
    this.enc.broken = 'cleared';
    this.fired.add('enc-broken');
    g.nav.maxS = this.sPlaza + 6;
    this.setCandleLit(1, true);
    this.checkpoint = { s: this.candles[1].s, lateral: this.candles[1].lateral, mounted: false, name: 'stair' };
    if (stage === 'stair') {
      this.fired.add('enc-stair');
      this.fired.add('stair-arrive');
      this.enc.stair = 'active';
      this.spawnStair();
      this.placePlayer(this.sStair + 4, 0, false);
      return;
    }
    this.enc.stair = 'cleared';
    this.fired.add('enc-stair');
    this.fired.add('stair-arrive');
    this.fired.add('stair-mites');
    this.fired.add('priest-call');
    this.priestDone = true;
    this.priest.behavior = 'cower';
    this.setCandleLit(2, true);
    this.checkpoint = { s: this.candles[2].s, lateral: this.candles[2].lateral, mounted: false, name: 'plaza' };
    if (at('boss') && stage === 'boss') {
      this.startBoss();
      this.timeline = [];
      g.boss.wake();
      g.boss.stateT = 99;
      g.cam.setCinematic(false);
      g.cam.cineWeight = 0;
      g.hud.setLetterbox(false);
      g.player.controlEnabled = true;
      g.audio.setMusic('boss');
      g.player.pos.copy(this.spot(this.sPlaza + 22, -1));
      g.player.pathIndex = g.nav.resolve(g.player.pos, 0.45, -1);
      g.player.yaw = this.yawAlong(this.sPlaza + 22);
      g.cam.snap(g.worldRoot.localToWorld(g.player.pos.clone()), g.player.yaw);
      return;
    }
    if (stage === 'ending') {
      g.removeEnemies(() => true);
      this.enc.boss = 'cleared';
      this.bossDead = true;
      this.bellsRinging = false;
      this.placePlayer(this.sPlaza + 30, -10, false);
      this.eyeT = 9.5;
      this.stir = 1;
      this.tremor = this.tremorTarget = 0.9;
      g.founder!.setOpen(1, true);
      g.setPalette('eye', true);
      g.player.controlEnabled = false;
      g.hud.setLetterbox(true);
      g.cam.setCinematic(true);
      g.cam.cineWeight = 1;
      g.cam.cineLook.copy(g.founder!.eyeCenter);
      g.cam.cinePos.copy(g.city!.plazaCenter).add(new THREE.Vector3(-40, -48, 7));
      g.weather.moteLevel = 1;
      g.weather.emberLevel = 1;
      g.fogDensity = 0.0009;
      g.audio.setMusic('eye');
    }
  }

  /** Compact flag summary for diagnostics/QA. */
  get flags(): Record<string, boolean | string> {
    return {
      gateOpen: this.gateOpen,
      dismounted: this.dismounted,
      bells: this.bellsRinging,
      broken: this.enc.broken,
      stair: this.enc.stair,
      boss: this.enc.boss,
      priest: this.priestDone,
      bossDead: this.bossDead,
      checkpoint: this.checkpoint.name,
    };
  }

  // ------------------------------------------------------------------ per-frame
  update(dt: number, t: number): void {
    const g = this.g;
    // Timeline.
    for (let i = this.timeline.length - 1; i >= 0; i -= 1) {
      const ev = this.timeline[i];
      ev.t -= dt;
      if (ev.t <= 0) {
        this.timeline.splice(i, 1);
        ev.fn();
      }
    }
    const s = g.path.samples[Math.max(0, g.player.pathIndex)]?.s ?? 0;
    this.progressIndex = STAGES.indexOf(this.stage as (typeof STAGES)[number]);

    if (this.stage !== 'title' && g.mode === 'play') this.beats(s);
    this.animateWorld(dt, t, s);
    this.updateInteract();
  }

  private beats(s: number): void {
    const g = this.g;
    this.once('reveal', s > 115, () => {
      g.weather.strike();
      this.after(0.3, () => {
        this.think('There. Velmour — the Crown of Spires.');
        this.think('Even from here you can count her towers by the lightning.');
      });
    });
    this.once('skull', s > 172, () => {
      this.think('The old bones of the pass. Shepherds call them dragon skulls.');
      this.think('I never asked what a dragon would want with a mountain.');
    });
    this.once('bells-lore', s > 300, () => this.think('Velmour’s bells have not rung in four hundred years. Mothers tell their children the bells are only sleeping.'));
    this.once('bridge', s > this.sBridge + 4, () => {
      g.hud.area('The Pilgrim’s Span', 'Below it, the fog never lifts', 5);
      this.after(5, () => this.think('West, past the fog — the Ribs of Harrowmere. Pilgrims say a giant died there. Pilgrims say a great many things.'));
    });
    this.once('gate-arrive', s > this.sGate - 26 && g.player.mounted, () => {
      g.hud.setObjective('Dismount at the gate');
      this.say('Gatewarden', 'Who rides to Velmour at this hour?');
      g.hud.hint('Press <kbd>E</kbd> to dismount', 6);
    });
    this.once('gate-candle-hint', this.gateOpen && s > this.sGate + 8, () => g.hud.hint('A Wayside Candle. <kbd>E</kbd> to light it and remember this place.', 5));
    // Street chatter.
    if (!this.fired.has('market')) {
      for (const c of this.chatter) {
        if (c.done) continue;
        if (c.f.pos.distanceTo(g.player.pos) < 6.5) {
          c.done = true;
          for (const [who, line] of c.lines) this.say(who, line);
        }
      }
    }
    this.once('market', s > this.sMarketCenter - 12 && this.gateOpen, () => this.marketSequence());
    this.once('risers', s > this.sBroken - 8 && this.crackLevel > 0, () => {
      this.risersOn = true;
      g.hud.area('The Broken Street', '', 3.5);
    });
    this.once('enc-broken', s > this.sBroken + 16 && this.crackLevel > 0, () => {
      this.enc.broken = 'active';
      this.brokenWave = 1;
      this.spawnBroken(1);
      this.after(1.6, () => g.hud.hint('<kbd>LMB</kbd> light &nbsp; <kbd>RMB</kbd> heavy &nbsp; <kbd>Space</kbd> roll through attacks &nbsp; <kbd>Q</kbd> lock on', 7));
    });
    this.once('stair-arrive', s > this.sStair - 8 && this.enc.broken === 'cleared', () => {
      g.hud.area('The Penitents’ Stair', '', 4);
      this.spawnStair();
      this.enc.stair = 'active';
    });
    this.once('stair-mites', s > this.sStair + 8 && this.enc.stair === 'active', () => {
      for (const lat of [-2.4, 2.4]) {
        const m = g.spawnMite(this.spot(this.sStair + 17, lat), 'stair');
        m.emerge(0.3);
      }
    });
    this.once('priest-call', this.enc.stair === 'cleared' && s > this.sPlaza - 14, () => this.say('Brother Ives', 'Ser… here… please…'));
    if (this.enc.boss === 'active' && g.boss.alive) g.hud.setBoss('The Knellwarden', g.boss.hp / g.boss.maxHp);
  }

  private animateWorld(dt: number, t: number, s: number): void {
    const g = this.g;
    const city = g.city!;
    // Portcullis.
    const pc = city.portcullis;
    const base = pc.userData.baseY as number;
    pc.position.y = damp(pc.position.y, base + (this.gateOpen ? 9 : 0), 0.9, dt);
    // Bells swing and toll.
    city.bells.forEach((b, i) => {
      if (this.bellsRinging) {
        const period = 2.2 + (i % 4) * 0.35;
        const prev = this.bellTimers[i];
        this.bellTimers[i] += dt;
        b.pivot.rotation.x = Math.sin((this.bellTimers[i] / period) * Math.PI * 2 + b.phase) * 0.75;
        const crossed = Math.floor(prev / period) !== Math.floor(this.bellTimers[i] / period);
        const near = b.pos.distanceTo(g.player.pos) < (b.size > 2 ? 420 : 160);
        if (crossed && near && g.mode === 'play') g.audio.bell(b.pos, b.size, 0, b.size > 2 ? 0.55 : 0.3);
      } else {
        b.pivot.rotation.x = damp(b.pivot.rotation.x, 0, 1.5, dt);
      }
    });
    // Tremor bed + continuous shake.
    this.tremor = damp(this.tremor, this.tremorTarget, 1.2, dt);
    if (this.tremor > 0.05 && g.mode === 'play') g.cam.addTrauma(this.tremor * 0.32 * dt * 2.2);
    g.audio.setBeds({ rumble: Math.max(this.tremor, 0) });
    // Statue topples.
    if (this.statueFalling && this.statueFall < 1) {
      this.statueFall = Math.min(1, this.statueFall + dt * (0.25 + this.statueFall * 2.2));
      city.statuePivot.rotation.z = -this.statueFall * this.statueFall * (Math.PI / 2 - 0.15);
      if (this.statueFall >= 1) {
        const p = city.statuePivot.position.clone().add(new THREE.Vector3(3, -2, 0));
        g.vfx.dust(p, 28, 3, '#7a7068');
        g.audio.crumble(p, 1.4);
        g.cam.addTrauma(0.4);
        city.statue.updateWorldMatrix(true, true);
      }
    }
    // Fountain water trembles in concentric rings.
    if (this.fountainTremble > 0.001 || this.tremor > 0.05) {
      const amp = Math.max(this.fountainTremble * 0.06, this.tremor * 0.08);
      const geo = city.fountainWater.geometry;
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i += 1) {
        const r = Math.hypot(pos.getX(i), pos.getZ(i));
        pos.setY(i, Math.sin(r * 9 - t * 18) * amp * (r / 4));
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
    }
    // Cracks glow.
    for (const c of city.cracks) {
      const m = c.material as THREE.MeshBasicMaterial;
      m.opacity = damp(m.opacity, this.crackLevel * (0.65 + 0.35 * Math.sin(t * 2 + c.position.x)), 1.2, dt);
    }
    // Districts rise.
    if (this.risersOn) {
      this.riserT += dt;
      for (const r of city.risers) {
        const k = smoothstep(0, 1, (this.riserT - r.delay) / 18);
        const prev = r.group.position.y;
        r.group.position.y = r.rise * k + Math.sin(t * 7 + r.s) * 0.04 * (k > 0 && k < 1 ? 1 : 0);
        if (k > 0 && k < 1 && Math.floor(prev) !== Math.floor(r.group.position.y) && g.rng() < 0.3) {
          g.vfx.dust(this.spot(r.s, 0).setY(this.spot(r.s, 0).y + 0.5), 6, 6, '#6a6058');
        }
      }
      // Falling masonry near the player in the broken street.
      const zone = g.path.samples[Math.max(0, g.player.pathIndex)].zone;
      if ((zone === 'broken' || zone === 'market') && this.enc.broken !== 'idle' && g.mode === 'play') {
        this.debrisT -= dt;
        if (this.debrisT <= 0) {
          this.debrisT = 2.2 + g.rng() * 1.6;
          const ahead = this.spot(s + 3 + g.rng() * 7, (g.rng() - 0.5) * 6);
          g.vfx.dropDebris(ahead, 0, (p) => {
            g.audio.crumble(p, 0.6);
            g.cam.addTrauma(0.15);
            if (Math.hypot(g.player.pos.x - p.x, g.player.pos.z - p.z) < 1.6) g.player.takeHit({ damage: 14, poise: 20, from: p, heavy: false });
          });
        }
      }
    }
    // Fog gate.
    this.fogUniforms.uTime.value = t;
    this.fogGate.visible = this.fogUniforms.uOpacity.value > 0.05 || this.enc.boss !== 'cleared';
    // Boss arena: keep the boss reachable.
    // Founder stir & eye sequence.
    if (this.eyeT >= 0) {
      const prev = this.eyeT;
      this.eyeT += dt;
      const e = this.eyeT;
      const cross = (x: number) => prev < x && e >= x;
      this.stir = damp(this.stir, e > 6 ? 1 : 0.1, 0.5, dt);
      if (cross(7)) {
        g.player.controlEnabled = false;
        g.player.lockTarget = null;
        g.hud.setLetterbox(true);
        const plaza = city.plazaCenter;
        g.cam.cinePos.copy(plaza).add(new THREE.Vector3(-44, -47, 8));
        g.cam.cineLook.copy(g.founder!.eyeCenter);
        g.cam.setCinematic(true);
        g.tiltWobble = 0.05;
      }
      if (cross(9)) {
        g.founder!.setOpen(1);
        g.audio.stinger('eye');
        g.audio.setMusic('eye');
        g.setPalette('eye');
        g.fogDensity = 0.0009;
        g.weather.moteLevel = 1;
        g.weather.emberLevel = 1;
        g.cam.addTrauma(0.8);
      }
      if (cross(13)) g.hud.area('Osseran', 'The Founder beneath Velmour', 6);
      if (cross(17)) this.say(CALDER, 'The mountain was never a mountain.');
      if (cross(22)) g.hud.fade(1, 2.5);
      if (cross(25)) {
        g.hud.fade(0, 3);
        g.showEnd();
      }
      if (e > 7) {
        // Slow push-in on the eye.
        const k = Math.min(1, (e - 7) / 14);
        const plaza = city.plazaCenter;
        g.cam.cinePos.copy(plaza).add(new THREE.Vector3(-44 + k * 12, -47 - k * 2, 8 - k * 3));
        g.founder!.lookAt(g.camera.position);
      }
    }
  }

  private updateInteract(): void {
    const g = this.g;
    let best: Interactable | null = null;
    let bestD = Infinity;
    if (g.mode === 'play' && g.player.controlEnabled && g.player.state !== 'dead') {
      for (const it of this.interactables) {
        if (!it.enabled()) continue;
        const d = Math.hypot(it.pos.x - g.player.pos.x, it.pos.z - g.player.pos.z);
        if (d < it.radius && d < bestD) {
          best = it;
          bestD = d;
        }
      }
    }
    if (best !== this.activeInteract) {
      this.activeInteract = best;
      g.hud.prompt(best ? best.label() : null, g.input.usingTouch ? '✋' : 'E');
    }
    if (best && g.input.consume('interact')) {
      best.action();
      this.activeInteract = null;
      g.hud.prompt(null);
    }
  }
}
