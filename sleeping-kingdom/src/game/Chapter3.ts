import * as THREE from 'three';
import type { Game } from './Game';
import { ChapterBase } from './ChapterBase';
import { around, type Actor } from './Cutscene';
import { Mats } from '../world/Materials';

const CALDER = 'Ser Calder';

/** Turn the Knellwarden into Choirmaster Oswin: verdigris plate, weed-green cape, drowned-blue light. */
function drownBoss(g: Game): void {
  const b = g.boss;
  (b as unknown as { name: string }).name = 'Choirmaster Oswin';
  const cache = new Map<THREE.Material, THREE.Material>();
  b.group.traverse((o) => {
    const me = o as THREE.Mesh;
    if (!me.isMesh) return;
    const mat = me.material as THREE.MeshStandardMaterial;
    if (mat.emissiveIntensity > 1 && mat.emissive.getHex() !== 0) {
      mat.emissive.set('#5ac8ff');
      return;
    }
    let c = cache.get(mat) as THREE.MeshStandardMaterial | undefined;
    if (!c) {
      c = mat.clone();
      if (c.metalness > 0.5) c.color.set('#6a9a88');
      else c.color.multiply(new THREE.Color('#90a8a0'));
      cache.set(mat, c);
    }
    me.material = c;
  });
  (b.cape.mesh.material as THREE.MeshStandardMaterial).color.set('#4a6a50');
}

function ghostly(a: Actor): void {
  a.group.traverse((o) => {
    const me = o as THREE.Mesh;
    if (!me.isMesh) return;
    const m = (me.material as THREE.MeshStandardMaterial).clone();
    m.transparent = true;
    m.opacity = 0.5;
    m.emissive = new THREE.Color('#4a9ac8');
    m.emissiveIntensity = 0.8;
    m.depthWrite = false;
    me.material = m;
    me.castShadow = false;
  });
}

/** Chapter III: The Drowned Choir. The first half of the Cradle Bell, under Saint Merrow's Mere. */
export class Chapter3 extends ChapterBase {
  protected readonly palette = 'marsh' as const;
  protected readonly music = 'dread' as const;
  protected readonly titleCard: [string, string] = ['The Drowned Choir', "Saint Merrow's Mere"];
  private bossT = -1;
  private endT = -1;
  private tamsin: Actor | null = null;
  private readonly sCause: number;
  private readonly sVillage: number;
  private readonly sVillageEnd: number;
  private readonly sNave: number;
  private readonly sChoir: number;

  constructor(g: Game) {
    super(g);
    const p = g.path;
    this.sCause = p.zoneStart('causeway');
    this.sVillage = p.zoneStart('village');
    this.sVillageEnd = p.zoneEnd('village');
    this.sNave = p.zoneStart('nave');
    this.sChoir = p.zoneStart('choir');
    this.finalGate = this.sChoir + 6;
    this.boss = g.boss;
    drownBoss(g);
    const sv = this.sVillage;
    this.encs = [
      {
        id: 'reeds',
        at: 70,
        gate: 120,
        spawn: () => {
          this.spawn('drowned', 104, -1.5, 'reeds');
          this.spawn('drowned', 112, 2, 'reeds');
          this.spawn('mite', 96, 0, 'reeds');
          this.after(0.6, () => this.think('Monks. Drowned monks, walking up out of the water.'));
        },
        done: () => this.after(1, () => this.say(CALDER, 'Rest now, brothers. Whatever is keeping you here, I will end it.')),
      },
      {
        id: 'causeway',
        at: this.sCause + 50,
        gate: this.sCause + 110,
        spawn: () => {
          this.spawn('cantor', this.sCause + 96, 0, 'causeway');
          this.spawn('drowned', this.sCause + 78, -1, 'causeway', false);
          this.spawn('drowned', this.sCause + 84, 1.5, 'causeway', false);
          this.after(1.2, () => this.g.hud.hint('Cantors sing bolts of drowned light. <kbd>Space</kbd> roll through them, then close the distance.', 6));
        },
      },
      {
        id: 'village',
        at: sv + 16,
        gate: sv + 70,
        spawn: () => {
          this.spawn('drowned', sv + 36, -4, 'village', false);
          this.spawn('drowned', sv + 40, 4, 'village', false);
          this.spawn('drowned', sv + 52, 0, 'village', false);
          this.spawn('cantor', sv + 60, -6, 'village');
          this.spawn('mite', sv + 30, 3, 'village');
          this.spawn('mite', sv + 32, -3, 'village');
          this.g.audio.toll(this.spot(sv + 34, -10), false);
        },
        done: () => this.after(1.5, () => this.ghostScene()),
      },
      {
        id: 'causeway2',
        at: this.sVillageEnd + 60,
        gate: this.sNave - 10,
        spawn: () => {
          const s0 = this.sVillageEnd + 90;
          this.spawn('drowned', s0, -1, 'causeway2', false);
          this.spawn('drowned', s0 + 8, 1, 'causeway2', false);
          this.spawn('cantor', s0 + 20, 0, 'causeway2');
          this.spawn('cantor', s0 + 26, 1.5, 'causeway2');
        },
      },
      {
        id: 'nave',
        at: this.sNave + 16,
        gate: this.sChoir - 4,
        spawn: () => {
          for (let i = 0; i < 4; i += 1) this.spawn('drowned', this.sNave + 30 + i * 10, (i % 2 ? 1 : -1) * 3, 'nave');
          this.spawn('cantor', this.sNave + 62, 0, 'nave');
          this.spawn('mite', this.sNave + 40, 0, 'nave');
        },
        done: () => this.after(1, () => this.g.hud.setObjective('Face the Choirmaster')),
      },
    ];
    this.beatDefs = [
      { id: 'mist', at: 30, fn: () => this.think('The water is black and still. Not even frogs. Just that singing, under everything.') },
      {
        id: 'village-card',
        at: sv - 6,
        needs: 'causeway',
        fn: () => {
          this.g.hud.area('Low Merrow', 'The village that sank in a single night', 5);
          this.after(4, () => this.think('Rooftops in the water. A bell tower leaning like a drunk. The whole village just… went under.'));
        },
      },
      {
        id: 'cathedral-sight',
        at: this.sVillageEnd + 30,
        needs: 'village',
        fn: () => {
          this.say(CALDER, 'There. The cathedral of Saint Merrow, half sunk, with its rose window still lit.');
          this.think('Somebody is keeping those candles burning.');
        },
      },
      {
        id: 'nave-card',
        at: this.sNave - 2,
        needs: 'causeway2',
        fn: () => {
          this.g.hud.area('Cathedral of Saint Merrow', 'Where the dead still sing', 5);
          this.g.setPalette('choir');
          this.g.fogDensity = 0.011;
        },
      },
      { id: 'boss-intro', at: this.sChoir + 2, needs: 'nave', fn: () => this.bossIntro() },
    ];
    this.stages = [
      { name: 'shore', s: 10, cleared: [], candles: 0 },
      { name: 'causeway', s: this.sCause + 40, cleared: ['reeds'], candles: 1, start: 'causeway' },
      { name: 'village', s: sv + 8, cleared: ['reeds', 'causeway'], candles: 1, start: 'village' },
      { name: 'nave', s: this.sNave + 6, cleared: ['reeds', 'causeway', 'village', 'causeway2'], candles: 3, start: 'nave' },
      { name: 'boss', s: this.sChoir + 4, cleared: ['reeds', 'causeway', 'village', 'causeway2', 'nave'], candles: 4 },
      { name: 'ending', s: this.sChoir + 30, cleared: ['reeds', 'causeway', 'village', 'causeway2', 'nave'], candles: 4 },
    ];
    this.init([
      [this.sCause - 8, 3, 'causeway'],
      [this.sVillageEnd + 6, -3, 'village'],
      [this.sNave - 8, 3, 'portal'],
      [this.sChoir - 8, -3.5, 'choir'],
    ]);
  }

  protected onReset(): void {
    const g = this.g;
    g.weather.rainLevel = 0.25;
    g.weather.moteLevel = 0.4;
    g.weather.setSnow(false);
    g.fogDensity = 0.0085;
    g.moonBase = 2.6;
    this.bossT = -1;
    this.endT = -1;
    g.boss.reset();
    g.boss.group.removeFromParent();
    const marsh = g.marsh!;
    if (!marsh.bellHalf.parent) marsh.group.add(marsh.bellHalf);
    g.audio.setBeds({ wind: 0.25, rain: 0.2, crowd: 0, rumble: 0, fire: 0 });
    this.tamsin = null;
  }

  protected onBegin(): void {
    const g = this.g;
    const cal = g.cut.actor(CALDER, 'calder', this.spot(11, 0), this.yawAlong(11));
    const tPos = this.spot(26, 3.2);
    const tamsin = g.cut.actor('Old Tamsin', 'folk', tPos, this.yawAlong(26) - Math.PI / 2 - 0.4, { robe: Mats().robeBrown, skin: '#b89880', mood: 'old', hood: true, lantern: true });
    tamsin.setPose('sitWall');
    this.tamsin = tamsin;
    const nave = this.spot(this.sNave, 0);
    const start = this.spot(0, 0);
    this.cutscene([
      {
        dur: 13,
        fadeIn: 2.5,
        camFn: (k) => ({ pos: start.clone().add(new THREE.Vector3(-60 + k * 30, 46 - k * 14, 30 - k * 60)), look: nave.clone().lerp(start, 0.6 - k * 0.3).setY(nave.y + 6) }),
        narr: [
          'The story so far…',
          'Osseran, the Founder that Velmour is built on, is waking up. Its great eye is already open.',
          'Mother Sallow told Calder the only way to sing it back to sleep: ring the Cradle Bell.',
          'Long ago the Church broke that bell in half, so no one could misuse it.',
          'One half sank with the cathedral of Saint Merrow, out on the Mere.',
        ],
        card: this.titleCard,
      },
      {
        dur: 5,
        start: () => cal.walkTo(this.spot(21, 0.6), 1.45),
        camFn: (k) => ({ pos: cal.pos.clone().add(new THREE.Vector3(2.4 - k, 1.7, 3.2)), look: cal.pos.clone().setY(cal.pos.y + 1.5).addScaledVector(g.path.at(10).tangent, 3) }),
        lines: [[CALDER, "Saint Merrow's Mere. The cathedral sank the year I was born. They say the monks are still down there, singing."]],
      },
      {
        dur: 3,
        start: () => {
          cal.face(tamsin.pos);
          tamsin.face(cal.pos);
        },
        camFn: () => ({ pos: cal.pos.clone().lerp(tamsin.pos, 0.5).addScaledVector(g.path.at(20).right, -4).setY(cal.pos.y + 1.8), look: tamsin.pos.clone().setY(tamsin.pos.y + 0.9) }),
        lines: [['Old Tamsin', 'Turn back, knight. The monks drowned holding their hymnbooks, and now they walk the causeway and drag the living under.']],
      },
      {
        dur: 3,
        camFn: () => ({ pos: tamsin.pos.clone().addScaledVector(g.path.at(20).tangent, 1.2).addScaledVector(g.path.at(20).right, 1).setY(tamsin.pos.y + 1.5), look: cal.pos.clone().setY(cal.pos.y + 1.6) }),
        lines: [[CALDER, "I'm looking for half of a bell. A big one."]],
      },
      {
        dur: 3,
        camFn: () => ({ pos: cal.pos.clone().addScaledVector(g.path.at(20).tangent, -1.2).addScaledVector(g.path.at(20).right, 1.2).setY(cal.pos.y + 1.7), look: tamsin.pos.clone().setY(tamsin.pos.y + 0.9) }),
        lines: [
          ['Old Tamsin', "Then you're looking for the Choirmaster. Old Oswin took the bell down with him when the waters rose."],
          ['Old Tamsin', "He'll not give it up. Not to the living, not to anyone."],
        ],
        apply: () => {
          g.hud.setObjective("Cross the Mere to Saint Merrow's cathedral");
        },
      },
    ], () => {
      cal.dispose();
      g.cut.actors.splice(g.cut.actors.indexOf(cal), 1);
      this.placePlayer(20, -0.5);
      g.hud.area(this.titleCard[0], this.titleCard[1], 5);
    });
  }

  /** After the village: a drowned novice who will not fight explains who the Choirmaster is. */
  private ghostScene(): void {
    const g = this.g;
    const s0 = this.sVillage + 66;
    const ghost = g.cut.actor('Brother Aldo', 'folk', this.spot(s0, 2), this.yawAlong(s0, true), { robe: Mats().robeGrey, skin: '#a8b8c0', mood: 'fear', hood: true });
    ghostly(ghost);
    ghost.setPose('pray');
    const cal = g.cut.actor(CALDER, 'calder', g.player.pos.clone(), g.player.yaw);
    this.cutscene([
      {
        dur: 3,
        start: () => cal.walkTo(this.spot(s0 - 3, 0.5), 1.4),
        cam: { from: this.spot(s0 + 4, -3).setY(this.spot(s0, 0).y + 1.6), look: this.spot(s0 - 2, 0.5).setY(this.spot(s0, 0).y + 1.3) },
        lines: [['', 'Someone is kneeling in the road. You can see the water through him.']],
      },
      {
        dur: 4,
        start: () => {
          ghost.setPose('idle').face(cal.pos);
          cal.face(ghost.pos);
        },
        camFn: around(this.spot(s0, 2), 3.2, 1.5, 0.8, 1.4, 1.3),
        lines: [
          ['Brother Aldo', 'You can hear it too, ser? The hymn, under the water. He keeps us singing so we can never rest.'],
          [CALDER, 'Who does?'],
          ['Brother Aldo', 'Choirmaster Oswin. Twenty years ago, Morvane sent men to take the bell. Oswin would not let them.'],
          ['Brother Aldo', 'He broke the dam and drowned the cathedral, and the village, and all of us in it, to keep the bell hidden.'],
        ],
      },
      {
        dur: 4,
        camFn: () => ({ pos: ghost.pos.clone().addScaledVector(g.path.at(s0).tangent, 2).setY(ghost.pos.y + 1.6), look: cal.pos.clone().setY(cal.pos.y + 1.6) }),
        lines: [
          [CALDER, "Then he was trying to stop Morvane. Same as me."],
          ['Brother Aldo', 'He thinks everyone who comes is Morvane. Free him, ser. Free all of us.'],
        ],
        apply: () => {
          ghost.dispose();
          g.cut.actors.splice(g.cut.actors.indexOf(ghost), 1);
          g.hud.setObjective('Reach the cathedral and free the Choirmaster');
        },
      },
    ], () => {
      cal.dispose();
      g.cut.actors.splice(g.cut.actors.indexOf(cal), 1);
      g.vfx.holyMotes(this.spot(s0, 2).setY(this.spot(s0, 0).y + 1), 30);
    });
  }

  private bossIntro(): void {
    const g = this.g;
    const marsh = g.marsh!;
    const b = g.boss;
    b.reset();
    b.place(marsh.arenaCenter.clone().addScaledVector(g.path.at(this.sChoir + 20).tangent, 8), this.yawAlong(this.sChoir, true));
    if (!g.enemies.includes(b)) g.addEnemy(b);
    b.persistent = true;
    b.onPhase2 = () => {
      g.cam.addTrauma(0.5);
      g.hud.hint('The choir answers him. Drowned monks rise from the flood.', 4);
      this.spawn('drowned', this.sChoir + 10, -6, 'boss-adds', false);
      this.spawn('drowned', this.sChoir + 34, 6, 'boss-adds', false);
    };
    this.stage = 'boss';
    g.nav.minS = this.sChoir - 2;
    g.nav.maxS = g.path.length;
    const c = marsh.arenaCenter;
    const cal = g.cut.actor(CALDER, 'calder', this.spot(this.sChoir - 2, 0), this.yawAlong(this.sChoir));
    cal.armed(true);
    this.cutscene([
      {
        dur: 4,
        start: () => cal.walkTo(this.spot(this.sChoir + 6, 0), 1.3),
        camFn: (k) => ({ pos: c.clone().add(new THREE.Vector3(0, 9 - k * 4, 0)).addScaledVector(g.path.at(this.sChoir).tangent, -26 + k * 6), look: b.pos.clone().setY(b.pos.y + 2.5) }),
        lines: [['', 'A giant in rusted bell-armour kneels before the altar, singing into the water.']],
      },
      {
        dur: 4,
        start: () => b.wake(),
        camFn: around(b.pos, 7, 2.6, 2.6, 3.4, 3),
        lines: [
          ['Choirmaster Oswin', 'Another of Morvane’s hounds, come sniffing for the bell.'],
          [CALDER, "I'm not his. I'm here to put Osseran back to sleep."],
          ['Choirmaster Oswin', 'Lies sound like hymns, down here. Sing with us, then. Sing forever.'],
        ],
        card: ['Choirmaster Oswin', 'Keeper of the Drowned Choir'],
      },
    ], () => {
      cal.dispose();
      g.cut.actors.splice(g.cut.actors.indexOf(cal), 1);
      this.placePlayer(this.sChoir + 6, 0);
      g.audio.setMusic('boss');
      g.hud.hint('His bell-toll ripples outward. Roll through the ring, then punish him.', 5);
    });
  }

  protected onBossDead(kind: string): boolean {
    if (kind !== 'boss') return false;
    const g = this.g;
    g.slowmo(1.8);
    g.hud.setBoss(null);
    g.player.lockTarget = null;
    g.audio.setMusic('silence');
    g.removeEnemies((e) => e.encounter === 'boss-adds');
    this.stage = 'ending';
    this.endT = 0;
    return true;
  }

  private ending(): void {
    const g = this.g;
    const marsh = g.marsh!;
    const b = g.boss;
    const cal = g.cut.actor(CALDER, 'calder', this.near(g.player.pos, b.pos, 5), g.player.yaw);
    const kneelAt = b.pos.clone().addScaledVector(g.path.at(this.sChoir).tangent, -1.6);
    this.cutscene([
      {
        dur: 3,
        start: () => cal.walkTo(kneelAt, 1.2, () => cal.setPose('kneel').face(b.pos)),
        camFn: around(b.pos, 6, 2.2, 0.4, 1.0, 1.8),
        lines: [['Choirmaster Oswin', 'Ser… the singing… it has stopped.']],
      },
      {
        dur: 5,
        camFn: () => ({ pos: cal.pos.clone().addScaledVector(g.path.at(this.sChoir).right, 2).setY(cal.pos.y + 1.4), look: b.pos.clone().setY(b.pos.y + 2.2) }),
        lines: [
          ['Choirmaster Oswin', 'Forgive an old man. For twenty years, everyone who came was his.'],
          ['Choirmaster Oswin', 'Take the bell. It is only half. The other half went north, with the Bell Guard, into the Frostspine.'],
          ['Choirmaster Oswin', 'Their captain carried it. Ser Ivarr.'],
          [CALDER, 'Ivarr? Ivarr is my sworn brother. We took our vows on the same night.'],
          ['Choirmaster Oswin', 'Then pray he is still himself. Morvane hollows out good men, and leaves only the armour.'],
        ],
      },
      {
        dur: 5,
        start: () => {
          cal.setPose('idle');
          cal.walkTo(marsh.altar.clone().addScaledVector(g.path.at(this.sChoir).tangent, -1.4), 1.3, () => cal.setPose('reach'));
        },
        camFn: (k) => ({ pos: marsh.altar.clone().addScaledVector(g.path.at(this.sChoir).tangent, -6 + k).addScaledVector(g.path.at(this.sChoir).right, 2.5).setY(marsh.altar.y + 2), look: marsh.bellHalf.position }),
        narr: ['Calder took the first half of the Cradle Bell.', 'Far to the north, in the Frostspine, his oldest friend held the other.'],
        tick: (k) => {
          if (k > 0.75 && marsh.bellHalf.parent) {
            marsh.bellHalf.removeFromParent();
            g.vfx.holyMotes(marsh.altar.clone().setY(marsh.altar.y + 1.4), 40);
          }
        },
        apply: () => {
          g.setPalette('choir');
        },
        fadeOut: 2,
      },
    ], () => {
      marsh.bellHalf.removeFromParent();
      g.showEnd();
    });
  }

  protected onRespawnBoss(): void {
    const g = this.g;
    if (this.stage === 'boss' && g.boss.alive) {
      g.removeEnemies((e) => e === g.boss);
      g.boss.reset();
      g.boss.group.removeFromParent();
      g.nav.minS = 0;
      g.nav.maxS = this.finalGate;
      g.hud.setBoss(null);
      g.audio.setMusic('dread');
      this.fired.delete('boss-intro');
      this.stage = 'nave';
    }
  }

  protected onStage(stage: string): void {
    const g = this.g;
    if (stage === 'nave' || stage === 'boss' || stage === 'ending') {
      g.setPalette('choir', true);
      g.fogDensity = 0.011;
    }
    if (stage === 'boss') {
      this.fired.delete('boss-intro');
    }
    if (stage === 'ending') {
      this.fired.add('boss-intro');
      const b = g.boss;
      b.reset();
      b.place(g.marsh!.arenaCenter.clone().addScaledVector(g.path.at(this.sChoir + 20).tangent, 8), this.yawAlong(this.sChoir, true));
      b.persistent = true;
      g.addEnemy(b);
      b.hp = 0;
      b.alive = false;
      b.state = 'dead';
      b.stateT = 3;
      this.stage = 'ending';
      this.placePlayer(this.sChoir + 18, 2);
      this.endT = 2.5;
    }
  }

  protected onTick(dt: number, _t: number, _s: number): void {
    if (this.endT >= 0) {
      const prev = this.endT;
      this.endT += dt;
      if (prev < 2.6 && this.endT >= 2.6) this.ending();
    }
    void this.bossT;
    void this.tamsin;
  }
}
