import * as THREE from 'three';
import type { Game } from './Game';
import { ChapterBase } from './ChapterBase';
import { around, type Actor } from './Cutscene';
import { DuelKnight } from '../entities/Enemies3';
import { Mats } from '../world/Materials';
import { worldBox } from '../world/geo';

const CALDER = 'Ser Calder';
const IVARR = 'Ser Ivarr';

/** Chapter IV: The Frostspine. The frozen Bell Guard, the Hollow Fort, and Calder's sworn brother. */
export class Chapter4 extends ChapterBase {
  protected readonly palette = 'snow' as const;
  protected readonly music = 'dread' as const;
  protected readonly titleCard: [string, string] = ['The Frostspine', 'Where the Bell Guard made its stand'];
  private readonly ivarr: DuelKnight;
  private endT = -1;
  private gateK = 0;
  private gateTarget = 0;
  private readonly sCamp: number;
  private readonly sRidge: number;
  private readonly sFort: number;
  private letterRead = false;

  constructor(g: Game) {
    super(g);
    const p = g.path;
    this.sCamp = p.zoneStart('camp');
    this.sRidge = p.zoneStart('ridge');
    this.sFort = p.zoneStart('fort');
    this.finalGate = this.sFort + 2;
    this.ivarr = new DuelKnight({ name: 'Ser Ivarr the Hollow', hp: 1150, boss: true, cloak: true });
    this.ivarr.persistent = true;
    this.boss = this.ivarr;
    const sc = this.sCamp;
    this.encs = [
      {
        id: 'wolves',
        at: 60,
        gate: 120,
        spawn: () => {
          this.spawn('wolf', 96, -2, 'wolves');
          this.spawn('wolf', 102, 2, 'wolves');
          this.spawn('wolf', 110, 0, 'wolves');
          this.after(0.8, () => this.think('Wolves. Too big, and their eyes are lit from inside. Dream-beasts.'));
          this.after(2, () => this.g.hud.hint('Wolves circle, then lunge. Roll sideways as they leap.', 5));
        },
      },
      {
        id: 'drift',
        at: 160,
        gate: 230,
        spawn: () => {
          this.spawn('hollow', 196, -1.5, 'drift');
          this.spawn('hollow', 204, 2, 'drift');
          this.after(0.5, () => {
            this.say(CALDER, 'Bell Guard armour. Brothers? It is me, Calder!');
            this.think('No answer. Only that red light behind the visors.');
          });
          this.after(4, () => this.g.hud.hint('Hollow knights fight like you do. Watch the wind-up, roll, and strike while they recover.', 6));
        },
      },
      {
        id: 'camp',
        at: sc + 26,
        gate: sc + 90,
        spawn: () => {
          this.spawn('hollow', sc + 48, -5, 'camp', false);
          this.spawn('hollow', sc + 58, 5, 'camp', false);
          this.spawn('zealot', sc + 72, 0, 'camp');
          this.spawn('wolf', sc + 40, 0, 'camp');
          this.after(1, () => this.say('Choir Zealot', 'Another lamb for the Waking! Sing, knight!'));
        },
      },
      {
        id: 'ridge',
        at: this.sRidge + 30,
        gate: this.sRidge + 110,
        spawn: () => {
          this.spawn('alpha', this.sRidge + 70, 0, 'ridge');
          this.spawn('wolf', this.sRidge + 60, -1, 'ridge');
          this.spawn('wolf', this.sRidge + 64, 1, 'ridge');
          this.after(0.5, () => this.g.audio.roar(this.spot(this.sRidge + 70, 0)));
        },
      },
      {
        id: 'gate',
        at: this.sFort - 46,
        gate: this.sFort - 4,
        spawn: () => {
          this.spawn('hollow', this.sFort - 20, -2, 'gate', false);
          this.spawn('hollow', this.sFort - 14, 2, 'gate', false);
          this.spawn('hollow', this.sFort - 8, 0, 'gate', false);
          this.spawn('zealot', this.sFort - 10, 3, 'gate');
          this.say('Choir Zealot', 'The Captain is not receiving visitors!');
        },
        done: () => this.after(1.5, () => this.gateScene()),
      },
    ];
    this.beatDefs = [
      { id: 'cold', at: 26, fn: () => this.think('Cold enough to crack teeth. And quiet. No birds, no wind in the pines. Just snow.') },
      {
        id: 'camp-card',
        at: sc - 8,
        needs: 'drift',
        fn: () => {
          this.g.hud.area('The Last Camp', 'Where the Bell Guard froze', 5);
          this.after(4, () => this.think('Tents still pitched. Pots still on the fires. They never came back for any of it.'));
        },
      },
      {
        id: 'ridge-card',
        at: this.sRidge - 4,
        needs: 'camp',
        fn: () => {
          this.g.hud.area('The Spine of Cairns', '', 4);
          this.g.setPalette('storm');
          this.g.weather.ashLevel = 1;
          this.after(3, () => this.think('One wrong step and the mountain keeps me. Every cairn here is somebody who took it.'));
        },
      },
      {
        id: 'fort-sight',
        at: this.sRidge + 150,
        needs: 'ridge',
        fn: () => this.say(CALDER, 'The Hollow Fort. Ivarr, if you are in there… please still be you.'),
      },
    ];
    this.stages = [
      { name: 'pass', s: 10, cleared: [], candles: 0 },
      { name: 'drift', s: 150, cleared: ['wolves'], candles: 1, start: 'drift' },
      { name: 'camp', s: sc + 10, cleared: ['wolves', 'drift'], candles: 2, start: 'camp' },
      { name: 'ridge', s: this.sRidge + 20, cleared: ['wolves', 'drift', 'camp'], candles: 3, start: 'ridge' },
      { name: 'gate', s: this.sFort - 54, cleared: ['wolves', 'drift', 'camp', 'ridge'], candles: 4, start: 'gate' },
      { name: 'boss', s: this.sFort + 8, cleared: ['wolves', 'drift', 'camp', 'ridge', 'gate'], candles: 5 },
      { name: 'ending', s: this.sFort + 40, cleared: ['wolves', 'drift', 'camp', 'ridge', 'gate'], candles: 5 },
    ];
    this.init([
      [130, 3, 'pass'],
      [sc - 4, -4, 'camp'],
      [this.sRidge - 10, 2.5, 'ridge'],
      [this.sFort - 60, -3, 'fort-road'],
      [this.sFort - 6, -4, 'gate'],
    ]);
    // Ivarr's letter, left on a crate in the camp.
    const lp = this.spot(sc + 30, -6.5);
    const crate = new THREE.Mesh(worldBox(1, 0.8, 0.8, 1), Mats().wood);
    crate.position.copy(lp).setY(lp.y + 0.35);
    crate.castShadow = true;
    const letter = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4).rotateX(-Math.PI / 2), Mats().robeWhite);
    letter.position.set(0, 0.42, 0);
    crate.add(letter);
    g.worldRoot.add(crate);
    this.addProp(crate.position, 'Read the letter', () => this.readLetter(), () => !this.letterRead && this.enc.camp === 'cleared');
  }

  protected onReset(): void {
    const g = this.g;
    g.weather.setSnow(true);
    g.weather.ashLevel = 0.7;
    g.weather.moteLevel = 0;
    g.fogDensity = 0.0075;
    g.moonBase = 3.0;
    this.endT = -1;
    this.gateK = this.gateTarget = 0;
    g.frost!.setGate(0);
    this.ivarr.reset();
    this.ivarr.group.removeFromParent();
    this.letterRead = false;
    g.audio.setBeds({ wind: 0.7, rain: 0, crowd: 0, rumble: 0, fire: 0 });
  }

  protected onBegin(): void {
    const g = this.g;
    const cal = g.cut.actor(CALDER, 'calder', this.spot(4, 0), this.yawAlong(4));
    const wren = g.cut.actor('Wren', 'folk', this.spot(20, -2.4), this.yawAlong(20) + 1.2, { robe: Mats().robeRed, skin: '#d8b8a0', mood: 'fear', hair: true, scale: 0.92 });
    wren.setPose('sitWall');
    const top = this.spot(this.sFort, 0);
    this.cutscene([
      {
        dur: 12,
        fadeIn: 2.5,
        camFn: (k) => ({ pos: this.spot(0, 0).add(new THREE.Vector3(40 - k * 30, 50 - k * 20, 60 - k * 40)), look: top.clone().lerp(this.spot(60, 0), 0.4 + k * 0.4).setY(top.y * (1 - k) + this.spot(60, 0).y * k) }),
        narr: [
          'Calder carried the first half of the Cradle Bell out of the drowned cathedral.',
          'The second half went north, into the Frostspine, with the Bell Guard and its captain: Ser Ivarr, Calder’s sworn brother.',
          'No word has come down from the mountains in a month.',
        ],
        card: this.titleCard,
      },
      {
        dur: 4,
        start: () => cal.walkTo(this.spot(16, -0.5), 1.4, () => cal.face(wren.pos)),
        camFn: () => ({ pos: wren.pos.clone().addScaledVector(g.path.at(18).tangent, 3).addScaledVector(g.path.at(18).right, 2).setY(wren.pos.y + 1.5), look: cal.pos.clone().setY(cal.pos.y + 1.5) }),
        lines: [['Wren', 'Ser? Ser, you’re Bell Guard… then turn back. Please. The captain let them in.']],
      },
      {
        dur: 4,
        start: () => wren.face(cal.pos),
        camFn: around(this.spot(18, -1.2), 3.6, 1.6, -0.6, 0.2, 1.1),
        lines: [
          [CALDER, 'Let who in?'],
          ['Wren', 'The Choir priests. Morvane’s singers. Ivarr opened the gate for them himself.'],
          [CALDER, 'Ivarr would never.'],
          ['Wren', 'They sang to him for three nights. When he came out his eyes were red, and he didn’t know my name.'],
        ],
      },
      {
        dur: 4,
        start: () => {
          wren.setPose('idle');
        },
        camFn: () => ({ pos: cal.pos.clone().addScaledVector(g.path.at(18).tangent, -2.2).addScaledVector(g.path.at(18).right, -1).setY(cal.pos.y + 1.8), look: wren.pos.clone().setY(wren.pos.y + 1.3) }),
        lines: [
          [CALDER, 'Go south, Wren. Follow the causeway across the Mere. It’s safe now.'],
          [CALDER, 'And if Ivarr is up there, I’ll bring him down. One way or the other.'],
        ],
        apply: () => g.hud.setObjective('Climb the pass to the Hollow Fort'),
      },
      {
        dur: 3,
        start: () => wren.walkTo(this.spot(-10, 1), 1.6),
        camFn: () => ({ pos: cal.pos.clone().addScaledVector(g.path.at(18).tangent, 2.5).setY(cal.pos.y + 1.6), look: wren.pos.clone().setY(wren.pos.y + 1.2) }),
        lines: [['', 'The girl stumbles off down the mountain, and doesn’t look back.']],
      },
    ], () => {
      g.cut.clearActors();
      this.placePlayer(17, -0.5);
      g.hud.area(this.titleCard[0], this.titleCard[1], 5);
    });
  }

  private readLetter(): void {
    this.letterRead = true;
    const g = this.g;
    g.hud.say('Ivarr’s letter', 'Cal. If this finds you, I have failed. Morvane’s priests sing at the gate every night.', 5.5);
    g.hud.say('Ivarr’s letter', 'I hear the song in my head even after they stop. The bell half is with me. I have not given it up. Not yet.', 6);
    g.hud.say('Ivarr’s letter', 'If I come to you with red eyes, don’t wait for me to remember you. Do what has to be done. — Ivarr', 6);
    this.after(18, () => this.think('Oh, Ivarr.'));
  }

  /** The fort gate opens on its own; Ivarr waits in the courtyard. */
  private gateScene(): void {
    const g = this.g;
    const fort = g.frost!;
    const iv = this.ivarr;
    iv.reset();
    iv.place(this.spot(this.sFort + 33, 0), this.yawAlong(this.sFort + 33, true));
    void fort;
    iv.state = 'idle';
    iv.group.visible = false;
    const cal = g.cut.actor(CALDER, 'calder', this.spot(this.sFort - 6, 0), this.yawAlong(this.sFort));
    cal.armed(true);
    const ivA = g.cut.actor(IVARR, 'ivarr', iv.pos.clone(), iv.yaw);
    ivA.armed(true).setPose('guard');
    const ga = this.spot(this.sFort + 4, 0);
    this.cutscene([
      {
        dur: 4,
        start: () => {
          this.gateTarget = 1;
          g.audio.toll(ga, false);
        },
        cam: { from: this.spot(this.sFort - 14, 2.5).setY(ga.y + 1.6), to: this.spot(this.sFort - 10, 2).setY(ga.y + 2), look: ga.clone().setY(ga.y + 3) },
        lines: [['', 'With no hand on them, the gates of the Hollow Fort swing open.']],
      },
      {
        dur: 4,
        start: () => {
          cal.place(this.spot(this.sFort + 13, 0), this.yawAlong(this.sFort + 13));
          cal.walkTo(this.spot(this.sFort + 24, 0), 1.35);
        },
        camFn: (k) => ({ pos: ivA.pos.clone().addScaledVector(g.path.at(this.sFort + 30).tangent, -3 - k * 2).addScaledVector(g.path.at(this.sFort + 30).right, 2).setY(ivA.pos.y + 1.7), look: ivA.pos.clone().setY(ivA.pos.y + 1.6) }),
        lines: [[IVARR, 'Calder. You came home after all.']],
        card: ['Ser Ivarr the Hollow', 'Captain of the Bell Guard'],
      },
      {
        dur: 6,
        start: () => {
          cal.face(ivA.pos);
          ivA.face(cal.pos);
        },
        camFn: (k) => {
          const mid = cal.pos.clone().lerp(ivA.pos, 0.5);
          return around(mid, 7, 2, 1.3 + k * 0.3, 1.6, 1.4)(k);
        },
        lines: [
          [CALDER, 'Ivarr. Give me the bell, and come back with me.'],
          [IVARR, 'Back to what? A kingdom built on a sleeping corpse? Morvane showed me, brother.'],
          [IVARR, 'When Osseran stands up, everything rotten falls off his back. The lords. The Church. All of it.'],
          [CALDER, 'Everyone falls off his back, Ivarr. Your mother. My sisters. Everyone.'],
          [IVARR, 'Then let them fall. Draw your sword.'],
        ],
      },
    ], () => {
      cal.dispose();
      ivA.dispose();
      g.cut.clearActors();
      iv.group.visible = true;
      if (!g.enemies.includes(iv)) g.addEnemy(iv);
      iv.state = 'chase';
      this.stage = 'boss';
      g.nav.minS = this.sFort + 6;
      g.nav.maxS = g.path.length;
      this.placePlayer(this.sFort + 24, 0);
      g.audio.setMusic('boss');
      g.setPalette('storm');
      iv.onPhase2 = () => {
        g.cam.addTrauma(0.5);
        g.hud.say(IVARR, 'The song… it’s louder… FIGHT ME, CALDER!', 3.5);
        g.hud.hint('His blade burns now. Heavy swings send a shockwave along the ground.', 5);
      };
      g.hud.hint('He reads your swings and guards. Strike when he overcommits.', 5);
    });
  }

  protected onBossDead(kind: string): boolean {
    if (kind !== 'ivarr') return false;
    const g = this.g;
    g.slowmo(2);
    g.hud.setBoss(null);
    g.player.lockTarget = null;
    g.audio.setMusic('silence');
    this.stage = 'ending';
    this.endT = 0;
    return true;
  }

  private ending(): void {
    const g = this.g;
    const iv = this.ivarr;
    const at = iv.pos.clone();
    iv.group.visible = false;
    const ivA = g.cut.actor(IVARR, 'ivarr', at, iv.yaw);
    ivA.setPose('slump');
    const cal = g.cut.actor(CALDER, 'calder', this.near(g.player.pos, at, 4), g.player.yaw);
    const kneel = at.clone().addScaledVector(new THREE.Vector3(Math.sin(iv.yaw), 0, Math.cos(iv.yaw)), 1.3);
    this.cutscene([
      {
        dur: 4,
        start: () => cal.walkTo(kneel, 1.2, () => cal.setPose('kneel').face(ivA.pos)),
        camFn: around(at, 5, 1.6, 0.2, 0.7, 0.9),
        lines: [[IVARR, 'Cal…? It’s quiet. The singing stopped.']],
      },
      {
        dur: 6,
        camFn: () => ({ pos: cal.pos.clone().addScaledVector(new THREE.Vector3(Math.cos(iv.yaw), 0, -Math.sin(iv.yaw)), 1.6).setY(cal.pos.y + 1.0), look: ivA.pos.clone().setY(ivA.pos.y + 0.8) }),
        lines: [
          [IVARR, 'I opened the gate. I thought I could listen to them and still be me.'],
          [IVARR, 'Take it. The bell. I kept it from him. That much I did.'],
          [CALDER, 'Ivarr, stay with me.'],
          [IVARR, 'Morvane went home, Cal. To Velmour. Down into the mountain, to Osseran’s heart.'],
          [IVARR, 'He means to wake him all the way. Stop him. Ring it… for me.'],
        ],
      },
      {
        dur: 5,
        camFn: (k) => ({ pos: at.clone().add(new THREE.Vector3(0, 3 + k * 10, 0)).addScaledVector(new THREE.Vector3(Math.sin(iv.yaw), 0, Math.cos(iv.yaw)), 5 + k * 10), look: at.clone().setY(at.y + 0.6) }),
        narr: [
          'Ser Ivarr died in the snow, himself again at the end.',
          'Calder joined the two halves of the Cradle Bell. For the first time in three hundred years, it was whole.',
          'Now it had to be rung at the heart of Osseran, where Morvane was waiting.',
        ],
        start: () => g.vfx.holyMotes(at.clone().setY(at.y + 1), 50),
        apply: () => g.setPalette('snow'),
        fadeOut: 2.5,
      },
    ], () => g.showEnd());
  }

  protected onRespawnBoss(): void {
    const g = this.g;
    if (this.stage === 'boss' && this.ivarr.alive) {
      g.removeEnemies((e) => e === this.ivarr);
      this.ivarr.reset();
      this.ivarr.group.removeFromParent();
      g.nav.minS = 0;
      g.nav.maxS = this.finalGate;
      g.hud.setBoss(null);
      g.audio.setMusic('dread');
      // The gate stays open: walk back in to fight again.
      this.fired.add('rematch-armed');
      this.stage = 'gate';
    }
  }

  protected onStage(stage: string): void {
    const g = this.g;
    if (stage === 'ridge' || stage === 'gate' || stage === 'boss' || stage === 'ending') {
      g.setPalette('storm', true);
      g.weather.ashLevel = 1;
    }
    if (stage === 'boss') {
      this.gateK = this.gateTarget = 1;
      g.frost!.setGate(1);
      const iv = this.ivarr;
      iv.reset();
      iv.place(g.frost!.arenaCenter.clone().addScaledVector(g.path.at(this.sFort + 40).tangent, 6), this.yawAlong(this.sFort, true));
      iv.state = 'chase';
      g.addEnemy(iv);
      this.stage = 'boss';
      g.nav.minS = this.sFort + 6;
      g.nav.maxS = g.path.length;
      g.audio.setMusic('boss');
      this.placePlayer(this.sFort + 22, 0);
    }
    if (stage === 'ending') {
      this.gateK = this.gateTarget = 1;
      g.frost!.setGate(1);
      const iv = this.ivarr;
      iv.reset();
      iv.place(g.frost!.arenaCenter.clone(), this.yawAlong(this.sFort, true));
      g.addEnemy(iv);
      iv.hp = 0;
      iv.alive = false;
      iv.state = 'dead';
      iv.stateT = 3;
      this.stage = 'ending';
      this.placePlayer(this.sFort + 30, 2);
      this.endT = 2.5;
    }
  }

  protected onTick(dt: number, _t: number, s: number): void {
    const g = this.g;
    if (Math.abs(this.gateK - this.gateTarget) > 0.001) {
      this.gateK += Math.sign(this.gateTarget - this.gateK) * Math.min(Math.abs(this.gateTarget - this.gateK), dt * 0.4);
      g.frost!.setGate(this.gateK);
    }
    // Rematch: walking back into the courtyard after a death restarts the duel.
    if (this.fired.has('rematch-armed') && this.enc.gate === 'cleared' && s > this.sFort + 14 && !g.cut.active && this.stage !== 'boss' && this.stage !== 'ending') {
      this.fired.delete('rematch-armed');
      const iv = this.ivarr;
      iv.reset();
      iv.place(g.frost!.arenaCenter.clone().addScaledVector(g.path.at(this.sFort + 40).tangent, 6), this.yawAlong(this.sFort, true));
      iv.state = 'chase';
      g.addEnemy(iv);
      this.stage = 'boss';
      g.nav.minS = this.sFort + 6;
      g.nav.maxS = g.path.length;
      g.audio.setMusic('boss');
      g.hud.say(IVARR, 'Again, brother.', 2.5);
    }
    if (this.endT >= 0) {
      const prev = this.endT;
      this.endT += dt;
      if (prev < 2.6 && this.endT >= 2.6) this.ending();
    }
  }
}

export type { Actor };
