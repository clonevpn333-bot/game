import * as THREE from 'three';
import type { Game } from './Game';
import { ChapterBase } from './ChapterBase';
import { around, overShoulder } from './Cutscene';
import { MorvaneBoss } from '../entities/Enemies3';
import { Mats } from '../world/Materials';
import { lathe } from '../world/geo';

const CALDER = 'Ser Calder';
const MORVANE = 'Archdeacon Morvane';

/** Chapter V: The Heart of Osseran. Down through the crypts into the Founder, to ring the Hymn. */
export class Chapter5 extends ChapterBase {
  protected readonly palette = 'ruin' as const;
  protected readonly music = 'dread' as const;
  protected readonly titleCard: [string, string] = ['The Heart of Osseran', 'Beneath the cathedral of Velmour'];
  private readonly morvane: MorvaneBoss;
  private endT = -1;
  private sleep = -1;
  private readonly bell = new THREE.Group();
  private readonly sCrypt: number;
  private readonly sCavern: number;
  private readonly sHeart: number;

  constructor(g: Game) {
    super(g);
    const p = g.path;
    this.sCrypt = p.zoneStart('crypt');
    this.sCavern = p.zoneStart('cavern');
    this.sHeart = p.zoneStart('heart');
    this.finalGate = this.sHeart + 14;
    this.morvane = new MorvaneBoss(() => g.worldRoot);
    this.morvane.persistent = true;
    this.boss = this.morvane;
    const sc = this.sCavern;
    this.encs = [
      {
        id: 'sanctum',
        at: 46,
        gate: this.sCrypt - 10,
        spawn: () => {
          this.spawn('hollow', 74, -3, 'sanctum', false);
          this.spawn('hollow', 80, 3, 'sanctum', false);
          this.spawn('zealot', 92, -4, 'sanctum');
          this.spawn('zealot', 96, 4, 'sanctum');
          this.say('Choir Zealot', 'He is the knight with the bell! Silence him before the Archdeacon’s hymn is done!');
        },
        done: () => this.after(1, () => this.g.hud.setObjective('Descend through the crypts into the mountain')),
      },
      {
        id: 'crypt',
        at: this.sCrypt + 22,
        gate: this.sCrypt + 80,
        spawn: () => {
          this.spawn('penitent', this.sCrypt + 44, 0, 'crypt');
          this.spawn('penitent', this.sCrypt + 54, 1, 'crypt');
          this.spawn('mite', this.sCrypt + 36, 0, 'crypt');
          this.spawn('mite', this.sCrypt + 40, 1, 'crypt');
        },
      },
      {
        id: 'skull',
        at: sc + 36,
        gate: sc + 110,
        spawn: () => {
          this.spawn('hollow', sc + 64, -4, 'skull', false);
          this.spawn('hollow', sc + 70, 4, 'skull', false);
          this.spawn('zealot', sc + 86, 0, 'skull');
          this.spawn('mite', sc + 56, 2, 'skull');
          this.spawn('mite', sc + 58, -2, 'skull');
        },
      },
      {
        id: 'dreams',
        at: sc + 150,
        gate: sc + 240,
        spawn: () => {
          this.spawn('thrall', sc + 176, -3, 'dreams', false);
          this.spawn('thrall', sc + 182, 3, 'dreams', false);
          this.spawn('witch', sc + 196, 0, 'dreams');
          this.spawn('alpha', sc + 190, 0, 'dreams');
          this.after(0.8, () => this.think('Thrall, witch, wolf. Every nightmare I’ve fought since Velmour. He’s dreaming them all at once.'));
        },
      },
      {
        id: 'vigil',
        at: this.sHeart - 44,
        gate: this.sHeart - 2,
        spawn: () => {
          this.spawn('hollow', this.sHeart - 24, -3, 'vigil', false);
          this.spawn('hollow', this.sHeart - 18, 3, 'vigil', false);
          this.spawn('hollow', this.sHeart - 10, 0, 'vigil', false);
          this.say('', 'Three hollow knights kneel across the way, swords planted. Their visors light up as one.');
        },
        done: () => this.after(1, () => this.g.hud.setObjective('Stop Morvane at the Heart')),
      },
    ];
    this.beatDefs = [
      {
        id: 'crypt-card',
        at: this.sCrypt - 4,
        needs: 'sanctum',
        fn: () => {
          this.g.hud.area('The Crypts of Velmour', 'Where the old bishops sleep', 4);
          this.g.setPalette('hollow');
          this.g.fogDensity = 0.016;
          this.g.moonBase = 0.9;
        },
      },
      {
        id: 'cavern-card',
        at: sc - 4,
        needs: 'crypt',
        fn: () => {
          this.g.hud.area('Inside Osseran', 'The skull of a sleeping god', 5);
          this.after(3.5, () => this.think('The walls are bone. The roof is bone. I am walking around inside his head.'));
          this.after(9, () => this.think('And that sound… a heartbeat. Faster than it should be.'));
        },
      },
      {
        id: 'heart-sight',
        at: this.sHeart - 60,
        needs: 'dreams',
        fn: () => {
          this.say(CALDER, 'There. The heart of the mountain. And someone singing in front of it.');
          this.g.setPalette('heart');
        },
      },
      { id: 'boss-intro', at: this.sHeart + 4, needs: 'vigil', fn: () => this.bossIntro() },
    ];
    this.stages = [
      { name: 'sanctum', s: 12, cleared: [], candles: 0 },
      { name: 'crypt', s: this.sCrypt + 10, cleared: ['sanctum'], candles: 1, start: 'crypt' },
      { name: 'skull', s: sc + 20, cleared: ['sanctum', 'crypt'], candles: 2, start: 'skull' },
      { name: 'dreams', s: sc + 140, cleared: ['sanctum', 'crypt', 'skull'], candles: 3, start: 'dreams' },
      { name: 'boss', s: this.sHeart + 6, cleared: ['sanctum', 'crypt', 'skull', 'dreams', 'vigil'], candles: 4 },
      { name: 'ending', s: this.sHeart + 30, cleared: ['sanctum', 'crypt', 'skull', 'dreams', 'vigil'], candles: 4 },
    ];
    this.init([
      [this.sCrypt - 10, 3.5, 'crypt-stair'],
      [sc - 6, 3, 'skull'],
      [sc + 130, -3, 'deep'],
      [this.sHeart - 52, 3, 'heart'],
    ]);
    // The Cradle Bell, whole again, hung from a bone frame on the dais for the finale.
    const m = Mats();
    const body = new THREE.Mesh(lathe([[0.0001, 1.2], [0.42, 1.18], [0.6, 0.9], [0.7, 0.3], [0.9, -0.2], [1.0, -0.32], [0.0001, -0.26]], 20), m.bronze);
    body.castShadow = true;
    const seam = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.03, 6, 24), m.goldGlow);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = 0.2;
    this.bell.add(body, seam);
    const last = g.path.samples[g.path.samples.length - 1];
    this.bell.position.copy(last.pos).setY(last.pos.y + 2.2);
    this.bell.visible = false;
    g.worldRoot.add(this.bell);
  }

  protected onReset(): void {
    const g = this.g;
    g.weather.setSnow(false);
    g.weather.ashLevel = 0.5;
    g.weather.emberLevel = 0.4;
    g.fogDensity = 0.007;
    g.moonBase = 2.6;
    this.endT = -1;
    this.sleep = -1;
    this.morvane.reset();
    this.morvane.group.removeFromParent();
    this.bell.visible = false;
    g.hollow!.wake = 1;
    g.audio.setBeds({ wind: 0.3, rain: 0, crowd: 0, rumble: 0.35, fire: 0.1 });
  }

  protected onBegin(): void {
    const g = this.g;
    const cal = g.cut.actor(CALDER, 'calder', this.spot(2, 0), this.yawAlong(2));
    const ives = g.cut.actor('Brother Ives', 'folk', this.spot(24, 2.5), this.yawAlong(24, true) - 0.4, { robe: Mats().robeBrown, skin: '#c8a888', mood: 'old', hood: true, lantern: true });
    const crack = g.hollow!.crack;
    this.cutscene([
      {
        dur: 13,
        fadeIn: 2.5,
        camFn: (k) => ({ pos: this.spot(10, 0).add(new THREE.Vector3(-70 + k * 40, 40 - k * 22, 50 - k * 30)), look: crack.clone().lerp(this.spot(10, 0), 0.5).setY(crack.y + 4) }),
        narr: [
          'Calder came home to Velmour with the Cradle Bell, whole again.',
          'The city was empty. Osseran’s eye burned in the mountain, and the ground shook with every heartbeat.',
          'Somewhere beneath the cathedral, Morvane was singing the Founder awake.',
        ],
        card: this.titleCard,
      },
      {
        dur: 4,
        start: () => cal.walkTo(this.spot(19, 0.5), 1.4, () => cal.face(ives.pos)),
        camFn: () => ({ pos: ives.pos.clone().addScaledVector(g.path.at(20).tangent, 2.4).addScaledVector(g.path.at(20).right, -1.4).setY(ives.pos.y + 1.6), look: cal.pos.clone().setY(cal.pos.y + 1.5) }),
        lines: [['Brother Ives', 'Ser Calder! You live. And you have it, the bell. Both halves?']],
      },
      {
        dur: 5,
        start: () => ives.face(cal.pos),
        camFn: around(this.spot(21, 1.4), 4, 1.6, 2.2, 2.9, 1.4),
        lines: [
          [CALDER, 'Both halves. Where is he, Ives?'],
          ['Brother Ives', 'Below. The crypts have split open into the Founder himself. Morvane went down with his whole choir.'],
          ['Brother Ives', 'Listen to me. Ring the bell at the heart, and Osseran will sleep. But it cannot be heard while Morvane sings over it.'],
          [CALDER, 'Then I’ll stop him singing.'],
        ],
        apply: () => g.hud.setObjective('Break through the ruined cathedral'),
      },
    ], () => {
      g.cut.clearActors([ives]);
      ives.setPose('pray');
      this.placePlayer(20, -0.8);
      g.hud.area(this.titleCard[0], this.titleCard[1], 5);
    });
  }

  private bossIntro(): void {
    const g = this.g;
    const h = g.hollow!;
    const mv = this.morvane;
    mv.reset();
    const at = h.arenaCenter.clone().addScaledVector(g.path.at(this.sHeart + 50).tangent, 12);
    mv.place(at, this.yawAlong(this.sHeart, true));
    if (!g.enemies.includes(mv)) g.addEnemy(mv);
    mv.group.visible = false;
    this.stage = 'boss';
    g.nav.minS = this.sHeart + 2;
    g.nav.maxS = g.path.length;
    const cal = g.cut.actor(CALDER, 'calder', this.spot(this.sHeart + 40, 0), this.yawAlong(this.sHeart + 40));
    cal.armed(true);
    const mA = g.cut.actor(MORVANE, 'morvane', at, this.yawAlong(this.sHeart));
    mA.setPose('staffRaise');
    [0, 1, 2, 3].forEach((i) => {
      const a = g.cut.actor('Waking Choir', 'folk', at.clone().addScaledVector(g.path.at(this.sHeart + 50).right, (i - 1.5) * 2.6).addScaledVector(g.path.at(this.sHeart + 50).tangent, 3), this.yawAlong(this.sHeart), { robe: Mats().robeWhite, skin: '#c8b8a0', mood: 'grim', hood: true });
      a.setPose('pray');
    });
    this.cutscene([
      {
        dur: 5,
        start: () => cal.walkTo(this.spot(this.sHeart + 52, 0), 1.3),
        camFn: (k) => {
          const t = g.path.at(this.sHeart + 50);
          return { pos: at.clone().addScaledVector(t.tangent, -15 + k * 5).addScaledVector(t.right, 4 - k * 2).setY(at.y + 3.2 - k), look: at.clone().lerp(h.heart, 0.35 + k * 0.2).setY(at.y + 3 + k * 2) };
        },
        lines: [['', 'Before the burning heart of the mountain, a man in white and gold sings with his arms raised. His choir kneels behind him.']],
      },
      {
        dur: 5,
        start: () => {
          mA.setPose('staff').face(cal.pos);
          cal.face(mA.pos);
        },
        camFn: overShoulder(cal, mA, 1, 1.8),
        lines: [
          [MORVANE, 'Ser Calder. The little hedge-knight who would not stay little.'],
          [CALDER, 'It’s over, Morvane. I have the bell.'],
        ],
        card: ['Archdeacon Morvane', 'Voice of the Waking Choir'],
      },
      {
        dur: 7,
        camFn: around(at, 5, 2.4, 3.6, 4.4, 2.2),
        lines: [
          [MORVANE, 'You have a lullaby. I have a god. Do you know what Osseran dreams of, knight?'],
          [MORVANE, 'Of standing up. Of walking under the sun again. For a thousand years we have held him down with a song.'],
          [CALDER, 'And if he stands, everyone living on his back dies.'],
          [MORVANE, 'They were always going to die. I am only being honest about it. Come, then. Let the Founder see who deserves his world.'],
        ],
      },
    ], () => {
      g.cut.clearActors();
      mv.group.visible = true;
      mv.wake();
      this.placePlayer(this.sHeart + 24, 0);
      g.audio.setMusic('boss');
      g.hud.hint('Golden orbs follow you: roll as they arrive. Pillars of light erupt under the burning marks.', 6);
      mv.onPhase2 = () => this.phaseTwo();
      mv.onCall = () => g.hud.say(MORVANE, 'Rise, little dreams! Rise for your father!', 3);
    });
  }

  private phaseTwo(): void {
    const g = this.g;
    const mv = this.morvane;
    const h = g.hollow!;
    this.cutscene([
      {
        dur: 5,
        start: () => {
          g.cam.addTrauma(0.6);
          g.setPalette('heart');
          g.weather.emberLevel = 1;
        },
        camFn: (k) => ({ pos: mv.pos.clone().add(new THREE.Vector3(0, 2 + k * 3, 0)).addScaledVector(new THREE.Vector3(Math.sin(mv.yaw), 0, Math.cos(mv.yaw)), 7 + k * 6), look: mv.pos.clone().setY(mv.pos.y + 2 + k * 2.5) }),
        tick: () => {
          if (Math.random() < 0.3) g.vfx.holyMotes(h.heart.clone().lerp(mv.pos, Math.random()), 2);
        },
        lines: [
          [MORVANE, 'You want to see a god, Calder? Then LOOK!'],
          ['', 'He drinks the light of the Founder’s heart, and grows.'],
        ],
      },
    ], () => {
      g.hud.hint('He is huge now, but slow to turn. Stay close, behind the staff hand.', 5);
    });
  }

  protected onBossDead(kind: string): boolean {
    if (kind !== 'morvane') return false;
    const g = this.g;
    g.slowmo(2.4);
    g.hud.setBoss(null);
    g.player.lockTarget = null;
    g.audio.setMusic('silence');
    g.removeEnemies((e) => e.encounter === 'boss');
    this.stage = 'ending';
    this.endT = 0;
    return true;
  }

  private ending(): void {
    const g = this.g;
    const h = g.hollow!;
    const mv = this.morvane;
    const last = g.path.samples[g.path.samples.length - 1];
    const cal = g.cut.actor(CALDER, 'calder', this.near(g.player.pos, mv.pos, 5), g.player.yaw);
    const strikeAt = last.pos.clone().addScaledVector(last.tangent, -1.6);
    const ring = (n: number) => {
      for (let i = 0; i < n; i += 1) g.audio.bell(this.bell.position, 1.6 - i * 0.18, i * 0.55, 0.6);
      g.vfx.ring(this.bell.position.clone().setY(last.pos.y), 0.5, 40, 3, '#cfe8ff', 'shock');
      g.vfx.holyMotes(this.bell.position, 60);
      g.cam.addTrauma(0.2);
    };
    this.cutscene([
      {
        dur: 5,
        camFn: around(mv.pos, 6, 1.4, 0.3, 0.9, 1),
        lines: [
          [MORVANE, 'Listen… he was… so close to waking. He would have been… beautiful.'],
          [CALDER, 'He’d have been the end of everyone.'],
        ],
      },
      {
        dur: 5,
        start: () => {
          this.bell.visible = true;
          cal.setPose('idle').place(strikeAt.clone().addScaledVector(last.tangent, -6), this.yawAlong(g.path.length - 1));
          cal.walkTo(strikeAt, 1.4, () => cal.face(this.bell.position).setPose('reach'));
        },
        camFn: (k) => ({ pos: last.pos.clone().addScaledVector(last.tangent, -9 + k * 2).addScaledVector(last.right, 3).setY(last.pos.y + 2.4), look: this.bell.position }),
        narr: ['Calder hung the Cradle Bell before the heart of the Founder, and rang the Hymn of Sleeping.'],
        tick: (k, dt) => {
          this.bell.rotation.z = Math.sin(k * 20) * 0.25 * k;
          void dt;
        },
        apply: () => {
          this.bell.visible = true;
          mv.group.visible = false;
        },
      },
      {
        dur: 9,
        start: () => {
          ring(4);
          this.sleep = 0;
          g.setPalette('hollow');
          g.weather.emberLevel = 0;
          g.audio.setMusic('dawn');
          g.audio.setBeds({ wind: 0.2, rain: 0, crowd: 0, rumble: 0, fire: 0 });
        },
        camFn: (k) => ({ pos: h.heart.clone().add(new THREE.Vector3(0, -6 + k * 3, 0)).addScaledVector(last.tangent, -22 + k * 4).addScaledVector(last.right, -6), look: h.heart }),
        tick: (k) => {
          this.bell.rotation.z = Math.sin(k * 28) * 0.3 * (1 - k);
          if (Math.floor(k * 4) !== Math.floor((k - 0.01) * 4) && k < 0.8) ring(2);
        },
        narr: [
          'The Hymn rang through the mountain, bone and stone and blood.',
          'Osseran’s heart slowed. And slowed. And far above, in the sky over Velmour, the great eye closed.',
        ],
        apply: () => {
          h.wake = 0;
          this.sleep = 1;
        },
      },
      {
        dur: 16,
        fadeOut: 3,
        start: () => g.setPalette('dawn'),
        camFn: (k) => ({ pos: last.pos.clone().add(new THREE.Vector3(0, 2.5 + k * 5, 0)).addScaledVector(last.tangent, -8 - k * 14).addScaledVector(last.right, 3), look: this.bell.position.clone().lerp(h.heart, 0.5) }),
        narr: [
          'When the sun came up, the people of Velmour came home.',
          'They rebuilt the bell towers, and they kept them quiet.',
          'And Ser Calder, the knight nobody remembered, stayed home at last.',
          'The Founders sleep. For now.',
        ],
      },
    ], () => g.showEnd());
  }

  protected onRespawnBoss(): void {
    const g = this.g;
    if (this.stage === 'boss' && this.morvane.alive) {
      // Morvane returns to his place before the heart, singing. Walk back in to face him.
      const mv = this.morvane;
      g.removeEnemies((e) => e === mv || e.encounter === 'boss');
      mv.reset();
      mv.place(g.hollow!.arenaCenter.clone().addScaledVector(g.path.at(this.sHeart + 50).tangent, 12), this.yawAlong(this.sHeart, true));
      g.addEnemy(mv);
      g.nav.minS = 0;
      g.nav.maxS = this.finalGate;
      g.hud.setBoss(null);
      g.audio.setMusic('dread');
      g.setPalette('heart');
      this.stage = 'dreams';
      this.rematch = {
        at: this.sHeart + 6,
        start: () => {
          mv.wake();
          this.stage = 'boss';
          g.nav.minS = this.sHeart + 2;
          g.nav.maxS = g.path.length;
          g.audio.setMusic('boss');
          g.hud.say('Archdeacon Morvane', 'Still crawling, knight? Then kneel.', 2.5);
        },
      };
    }
  }

  protected onStage(stage: string): void {
    const g = this.g;
    const idx = ['sanctum', 'crypt', 'skull', 'dreams', 'boss', 'ending'].indexOf(stage);
    if (idx >= 1) {
      g.setPalette(idx >= 3 ? 'heart' : 'hollow', true);
      g.fogDensity = 0.016;
      g.moonBase = 0.9;
    }
    if (stage === 'boss') this.fired.delete('boss-intro');
    if (stage === 'ending') {
      this.fired.add('boss-intro');
      const mv = this.morvane;
      mv.reset();
      mv.place(g.hollow!.arenaCenter.clone(), this.yawAlong(this.sHeart, true));
      g.addEnemy(mv);
      mv.hp = 0;
      mv.alive = false;
      mv.state = 'dead';
      mv.stateT = 3;
      this.stage = 'ending';
      this.placePlayer(this.sHeart + 30, 2);
      this.endT = 2.5;
    }
  }

  protected onTick(dt: number, _t: number, _s: number): void {
    const g = this.g;
    const h = g.hollow!;
    if (this.sleep >= 0 && this.sleep < 1) {
      this.sleep = Math.min(1, this.sleep + dt / 8);
      h.wake = 1 - this.sleep;
    }
    // The mountain shakes with each heartbeat while he is awake.
    this.stir = h.wake;
    if (h.wake > 0.5 && this.stage !== 'title' && Math.random() < dt * 0.15) g.cam.addTrauma(0.06);
    if (this.endT >= 0) {
      const prev = this.endT;
      this.endT += dt;
      if (prev < 2.8 && this.endT >= 2.8) this.ending();
    }
  }
}
