import * as THREE from 'three';
import type { Game, ChapterScript } from './Game';
import type { Enemy } from '../entities/Enemies';
import { Marrowmite, Penitent } from '../entities/Enemies';
import { Thornwife, dressAsThrall } from '../entities/Enemies2';
import { DuelKnight, FrostWolf, dressAsDrowned } from '../entities/Enemies3';
import { Mats } from '../world/Materials';
import { worldBox } from '../world/geo';
import { latheG } from '../entities/Rig';
import type { TorchSpot } from '../world/Terrain';
import type { LightPool } from '../systems/LightPool';
import type { Shot } from './Cutscene';
import type { SKY_PALETTES } from '../world/Sky';

export type EncDef = {
  id: string;
  /** Arc length at which the fight starts. */
  at: number;
  /** Progress gate (nav.maxS) while the fight is on. */
  gate: number;
  spawn: () => void;
  /** Called when the last enemy of the fight falls. */
  done?: () => void;
};
export type BeatDef = { id: string; at: number; needs?: string; fn: () => void };
export type StageDef = { name: string; s: number; lat?: number; cleared: string[]; candles: number; start?: string };
export type SpawnKind = 'penitent' | 'thrall' | 'drowned' | 'witch' | 'cantor' | 'zealot' | 'mite' | 'wolf' | 'alpha' | 'hollow';
type Prop = { pos: THREE.Vector3; label: string; act: () => void; live: () => boolean };

/**
 * Data-driven chapter: an ordered list of fights that gate progress, story beats keyed to distance,
 * Wayside Candles as checkpoints, a boss, and cutscenes. Chapters III-V are built on it.
 */
export abstract class ChapterBase implements ChapterScript {
  stage = 'title';
  progressIndex = 0;
  stir = 0;
  readonly candleSpots: TorchSpot[] = [];
  protected readonly candles: Array<{ group: THREE.Group; flames: THREE.Object3D[]; lit: boolean; s: number; poolIndex: number; name: string }> = [];
  private pool: LightPool | null = null;
  protected timeline: Array<{ t: number; fn: () => void }> = [];
  protected readonly fired = new Set<string>();
  protected checkpoint = { s: 6, name: 'start' };
  protected readonly enc: Record<string, 'idle' | 'active' | 'cleared'> = {};
  protected encs: EncDef[] = [];
  protected beatDefs: BeatDef[] = [];
  protected stages: StageDef[] = [];
  protected readonly props: Prop[] = [];
  private prompt: Prop | null = null;
  /** Where the path opens once every fight is won (usually the boss arena). */
  protected finalGate = 0;
  protected boss: Enemy | null = null;
  /** After a death in a boss fight, the boss waits in its arena; walking back in restarts the fight. */
  protected rematch: { at: number; start: () => void } | null = null;
  protected abstract readonly palette: keyof typeof SKY_PALETTES;
  protected abstract readonly music: 'dread' | 'calm';
  protected abstract readonly titleCard: [string, string];
  protected startS = 6;

  constructor(protected readonly g: Game) {}

  /** Subclasses call this at the end of their constructor once encs/beats/stages are defined. */
  protected init(candles: Array<[number, number, string]>): void {
    for (const e of this.encs) this.enc[e.id] = 'idle';
    for (const [s, lat, name] of candles) this.buildCandle(s, lat, name);
  }

  // ------------------------------------------------------------------ helpers
  protected spot(s: number, lateral = 0): THREE.Vector3 {
    const a = this.g.path.at(s);
    return a.pos.clone().addScaledVector(a.right, lateral);
  }

  protected yawAlong(s: number, back = false): number {
    const t = this.g.path.at(s).tangent;
    return Math.atan2(t.x, t.z) + (back ? Math.PI : 0);
  }

  protected after(t: number, fn: () => void): void {
    this.timeline.push({ t, fn });
  }

  protected think(text: string): void {
    this.g.hud.say('', text, 0, true);
  }

  protected say(who: string, text: string): void {
    this.g.hud.say(who, text);
  }

  protected get s(): number {
    return this.g.path.samples[Math.max(0, this.g.player.pathIndex)]?.s ?? 0;
  }

  /** `from`, pulled in to at most `maxD` metres from `target` (so cutscene actors start close enough to frame together). */
  protected near(from: THREE.Vector3, target: THREE.Vector3, maxD: number): THREE.Vector3 {
    const d = from.clone().sub(target).setY(0);
    if (d.length() <= maxD) return from.clone();
    return target.clone().add(d.setLength(maxD));
  }

  protected cutscene(shots: Shot[], done?: () => void): void {
    this.g.cut.play(shots, done);
  }

  protected addProp(pos: THREE.Vector3, label: string, act: () => void, live: () => boolean = () => true): void {
    this.props.push({ pos, label, act, live });
  }

  spawn(kind: SpawnKind, s: number, lat: number, encounter: string, dormant = true): Enemy {
    const g = this.g;
    let e: Enemy;
    const yaw = this.yawAlong(s, true);
    switch (kind) {
      case 'penitent':
      case 'thrall':
      case 'drowned': {
        const p = new Penitent();
        if (kind === 'thrall') {
          dressAsThrall(p.rig);
          (p as unknown as { name: string }).name = 'Briar Thrall';
        }
        if (kind === 'drowned') {
          dressAsDrowned(p.rig);
          (p as unknown as { name: string }).name = 'Drowned Monk';
        }
        if (!dormant) p.state = 'idle';
        e = p;
        break;
      }
      case 'witch':
      case 'cantor':
      case 'zealot':
        e = new Thornwife(g.worldRoot, kind === 'witch' ? 'thorn' : kind === 'cantor' ? 'drowned' : 'hollow');
        break;
      case 'mite': {
        const m = new Marrowmite();
        e = m;
        if (dormant) m.emerge(0.3 + Math.random() * 0.6);
        break;
      }
      case 'wolf':
      case 'alpha':
        e = new FrostWolf(kind === 'alpha');
        e.state = 'idle';
        break;
      case 'hollow': {
        const k = new DuelKnight();
        if (!dormant) k.state = 'idle';
        e = k;
        break;
      }
    }
    e.encounter = encounter;
    const p = this.spot(s, lat);
    e.place(p, yaw);
    g.addEnemy(e);
    return e;
  }

  // ------------------------------------------------------------------ candles
  private buildCandle(s: number, lat: number, name: string): void {
    const group = new THREE.Group();
    const pos = this.spot(s, lat);
    group.position.copy(pos);
    const altar = new THREE.Mesh(worldBox(1.2, 1.3, 0.8, 2), Mats().stoneDark);
    altar.position.y = 0.15;
    altar.castShadow = true;
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
    group.rotation.y = this.yawAlong(s);
    this.g.worldRoot.add(group);
    this.candleSpots.push({ pos: pos.clone().setY(pos.y + 1.2), zone: this.g.path.at(s).zone, s });
    const idx = this.candles.length;
    this.candles.push({ group, flames, lit: false, s: s + 1.5, poolIndex: -1, name });
    this.addProp(group.position, '', () => this.lightCandle(idx));
  }

  bindCandles(pool: LightPool, offset: number): void {
    this.pool = pool;
    this.candles.forEach((c, i) => {
      c.poolIndex = offset + i;
      this.setLit(i, false);
    });
  }

  protected setLit(i: number, lit: boolean): void {
    const c = this.candles[i];
    c.lit = lit;
    for (const f of c.flames) f.visible = lit;
    this.pool?.setLit(c.poolIndex, lit);
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
    g.hud.hint('Wayside Candle lit. If you fall, you will wake here.', 4);
  }

  // ------------------------------------------------------------------ flow
  get flags(): Record<string, boolean | string> {
    const out: Record<string, boolean | string> = { checkpoint: this.checkpoint.name };
    for (const k of Object.keys(this.enc)) out[k] = this.enc[k];
    if (this.boss) out.bossHp = String(Math.round(this.boss.hp));
    return out;
  }

  /** Chapter-specific world reset (weather, palette, boss). */
  protected abstract onReset(): void;
  /** Opening of the chapter (usually a cutscene). */
  protected abstract onBegin(): void;
  protected abstract onTick(dt: number, t: number, s: number): void;
  /** Return true if this kind was the boss. */
  protected abstract onBossDead(kind: string): boolean;
  protected abstract onRespawnBoss(): void;
  protected abstract onStage(stage: string): void;

  protected resetWorld(): void {
    const g = this.g;
    this.timeline = [];
    this.fired.clear();
    for (const k of Object.keys(this.enc)) this.enc[k] = 'idle';
    this.checkpoint = { s: this.startS, name: 'start' };
    this.rematch = null;
    g.removeEnemies(() => true);
    g.cut.clearActors();
    this.candles.forEach((_, i) => this.setLit(i, false));
    g.nav.minS = 0;
    g.nav.maxS = this.encs[0]?.gate ?? this.finalGate;
    g.setPalette(this.palette, true);
    g.weather.rainLevel = 0;
    g.weather.moteLevel = 0;
    g.weather.emberLevel = 0;
    g.weather.ashLevel = 0;
    g.weather.lightningEnabled = false;
    g.hud.setLetterbox(false);
    g.hud.setBoss(null);
    g.dog.group.visible = false;
    this.onReset();
  }

  protected placePlayer(s: number, lateral = 0): void {
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
    this.placePlayer(this.startS + 4);
    const a = g.path.at(2);
    g.cam.cinePos.copy(g.worldRoot.localToWorld(a.pos.clone().addScaledVector(a.right, 4).setY(a.pos.y + 2.6)));
    g.cam.cineLook.copy(g.worldRoot.localToWorld(this.spot(70, 0).setY(a.pos.y + 6)));
    g.cam.setCinematic(true);
    g.cam.cineWeight = 1;
    g.audio.setMusic('title');
  }

  begin(): void {
    const g = this.g;
    this.resetWorld();
    this.stage = this.stages[0]?.name ?? 'play';
    this.placePlayer(this.startS);
    g.player.controlEnabled = true;
    g.cam.setCinematic(false);
    g.cam.cineWeight = 0;
    g.audio.setMusic(this.music);
    g.hud.reset();
    this.onBegin();
  }

  protected startEncounter(id: string): void {
    const def = this.encs.find((e) => e.id === id);
    if (!def) return;
    this.enc[id] = 'active';
    this.g.nav.maxS = def.gate;
    def.spawn();
  }

  protected nextGate(id: string): number {
    const i = this.encs.findIndex((e) => e.id === id);
    return this.encs[i + 1]?.gate ?? this.finalGate;
  }

  onEnemyDead(kind: string): void {
    if (this.onBossDead(kind)) return;
    for (const def of this.encs) {
      if (this.enc[def.id] !== 'active') continue;
      if (this.g.enemies.filter((e) => e.encounter === def.id && e.alive).length === 0) {
        this.enc[def.id] = 'cleared';
        this.g.nav.maxS = this.nextGate(def.id);
        def.done?.();
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
    // The fight you died in resets in place: the same enemies stand up again at full strength.
    for (const def of this.encs) {
      if (this.enc[def.id] === 'active') {
        g.removeEnemies((e) => e.encounter === def.id);
        def.spawn();
        g.nav.maxS = def.gate;
      }
    }
    g.removeEnemies((e) => e.encounter === 'boss-adds' || e.encounter === 'boss');
    this.rematch = null;
    this.onRespawnBoss();
    this.timeline = [];
    g.hud.clearSubtitles();
    this.placePlayer(this.checkpoint.s);
    g.player.controlEnabled = true;
    g.hud.reset();
  }

  jumpTo(stage: string): void {
    const g = this.g;
    if (stage === 'title') {
      this.setupTitle();
      document.querySelector('#title-screen')?.classList.remove('hidden');
      g.mode = 'title';
      g.hud.show(false);
      return;
    }
    const def = this.stages.find((st) => st.name === stage);
    if (!def) throw new Error(`Unknown test state: ${stage}`);
    this.resetWorld();
    g.hud.reset();
    g.cam.setCinematic(false);
    g.cam.cineWeight = 0;
    g.player.controlEnabled = true;
    this.stage = stage;
    g.audio.setMusic(this.music);
    for (const b of this.beatDefs) if (b.at < def.s) this.fired.add(b.id);
    let max = this.encs[0]?.gate ?? this.finalGate;
    for (const id of def.cleared) {
      this.enc[id] = 'cleared';
      this.fired.add(`enc-${id}`);
      max = this.nextGate(id);
    }
    g.nav.maxS = max;
    for (let i = 0; i < def.candles; i += 1) {
      this.setLit(i, true);
      this.checkpoint = { s: this.candles[i].s, name: this.candles[i].name };
    }
    this.placePlayer(def.s, def.lat ?? 0);
    if (def.start) {
      this.fired.add(`enc-${def.start}`);
      this.startEncounter(def.start);
    }
    this.onStage(stage);
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
    const idx = this.stages.findIndex((st) => st.name === this.stage);
    this.progressIndex = Math.max(0, idx);
    const s = this.s;
    if (this.stage !== 'title' && g.mode === 'play' && !g.cut.active) {
      // Fights: in order, each one waits for the previous to be won.
      for (let i = 0; i < this.encs.length; i += 1) {
        const def = this.encs[i];
        const prevOk = i === 0 || this.enc[this.encs[i - 1].id] === 'cleared';
        const id = `enc-${def.id}`;
        if (prevOk && s > def.at && !this.fired.has(id)) {
          this.fired.add(id);
          this.startEncounter(def.id);
        }
      }
      for (const b of this.beatDefs) {
        if (this.fired.has(b.id) || s <= b.at) continue;
        if (b.needs && this.enc[b.needs] !== 'cleared') continue;
        this.fired.add(b.id);
        b.fn();
      }
      // Track the furthest stage reached for diagnostics.
      for (const st of this.stages) if (s >= st.s - 2 && this.stages.indexOf(st) > idx && st.cleared.every((c) => this.enc[c] === 'cleared')) this.stage = st.name;
      this.interact();
    }
    if (this.boss && this.boss.alive && this.boss.group.parent && (this.boss.state as string) !== 'dormant') g.hud.setBoss(this.boss.name, this.boss.hp / this.boss.maxHp);
    if (this.rematch && s > this.rematch.at && !g.cut.active && g.mode === 'play') {
      const r = this.rematch;
      this.rematch = null;
      r.start();
    }
    this.onTick(dt, t, s);
  }

  private interact(): void {
    const g = this.g;
    let best: Prop | null = null;
    const calm = g.enemies.every((e) => !e.alive || e.state === 'dormant' || e.state === 'idle');
    if (g.player.controlEnabled && calm) {
      let bd = 2.8;
      for (const p of this.props) {
        if (!p.live()) continue;
        const d = p.pos.distanceTo(g.player.pos);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
    }
    if (best !== this.prompt) {
      this.prompt = best;
      let label = best?.label ?? null;
      if (best && !label) {
        const c = this.candles.find((cc) => cc.group.position === best!.pos);
        label = c?.lit ? 'Rest at the Wayside Candle' : 'Light the Wayside Candle';
      }
      g.hud.prompt(label, g.input.usingTouch ? '✋' : 'E');
    }
    if (this.prompt && g.input.consume('interact')) {
      const p = this.prompt;
      this.prompt = null;
      g.hud.prompt(null);
      p.act();
    }
  }
}
