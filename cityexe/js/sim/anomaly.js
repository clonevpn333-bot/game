// EXE Mode. Optional, off by default. When enabled, rare things that should not
// be possible slowly accumulate underneath the ordinary simulation. Nothing
// announces itself loudly; most of it is only noticed if you go looking.
import { rand } from '../core/rng.js';
import { newCitizen } from './citizens.js';
import { dist } from '../core/math.js';

const TRANSMISSIONS = [
  'the city sleeps when nobody watches it',
  'who is moving the people around',
  'there are more of us on the census than in the streets',
  'do not go to the platform at the end of the line',
  'we can see the camera',
  'it is the same day again',
  'please stop zooming in',
  'Wren was here before the city was',
];
const AWARE = [
  'You can see me, can\'t you?',
  'Every time I look up, there\'s someone there.',
  'Who moves me when you\'re not here?',
  'I had a whole life before you clicked on me. Didn\'t I?',
  'Don\'t make me walk into traffic again.',
  'I remember being someone else yesterday.',
  'Is it Tuesday? It\'s always Tuesday.',
  'You again.',
];

export class Anomalies {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.count = 0;
    this.watchT = 0;
  }
  attach() { this.world.anomalies = this; return this; }

  daily() {
    const W = this.world;
    if (!W.exeMode) return;
    // rare, accelerating slowly with time spent in EXE mode
    const p = Math.min(0.5, 0.12 + this.count * 0.03);
    if (rand.chance(p)) this.spawn();
  }

  force() { this.spawn(true); }

  record(text, data = {}) {
    const W = this.world;
    this.list.push({ t: W.time, text, ...data });
    W.history.cityEvent(text, { type: 'anomaly', anomaly: true, minor: !data.visible, ...data });
  }

  spawn(forced) {
    const W = this.world;
    this.count++;
    const alive = W.citizens.filter((c) => c.status === 'ok' && !c.possessed);
    const kinds = ['ageless', 'records', 'duplicate', 'transmission', 'aware', 'building', 'transmission', 'records'];
    const kind = rand.pick(kinds);
    switch (kind) {
      case 'ageless': {
        const c = rand.pick(alive);
        c.flags.ageless = true;
        c.flags.anomalyNote = `Birth record: Year -${rand.int(40, 90)}. Age unchanged in every census since.`;
        c.log.unshift({ t: -1e6, text: 'Arrived in the city (date illegible)', major: true });
        this.record(`[unexplained] Census office flags record #${c.id}: age has not changed in ${rand.int(30, 70)} years`, { who: c.id });
        break;
      }
      case 'records': {
        const c = rand.pick(alive);
        const notes = [`Death certificate on file: ${W.history.dateStr(Math.max(0, W.time - rand.int(1, 9) * 1440))}.`, 'Employment records show three jobs held at once, all at the same hour.', 'Listed as resident of a unit that was never built.', 'Fingerprints match a citizen who left the city.'];
        c.flags.anomalyNote = rand.pick(notes);
        this.record(`[unexplained] A records clerk at City Hall reports a filing error that will not go away (#${c.id})`, { who: c.id });
        break;
      }
      case 'duplicate': {
        const src = rand.pick(alive);
        const home = W.findVacancy(() => true);
        if (home == null) return;
        const c = newCitizen(rand, { id: W.citizens.length, first: src.first, last: src.last, age: src.age });
        c.look = { ...src.look };
        c.traits = { ...src.traits };
        W.citizens.push(c);
        W.citizenAI.setHome(c, home);
        W.citizenAI.placeInside(c, home);
        c.lastNeedT = W.time; c.nextThink = W.time + 10;
        c.flags.dup = src.id; src.flags.dup = c.id;
        c.flags.anomalyNote = `Another living record shares this identity (#${src.id}).`;
        src.flags.anomalyNote = `Another living record shares this identity (#${c.id}).`;
        c.log.push({ t: W.time, text: `Moved into ${W.citizenAI.buildingName(home)}`, major: true });
        this.record(`[unexplained] Two residents named ${src.name} now appear in the city records`, { who: c.id });
        break;
      }
      case 'transmission': {
        const msg = rand.pick(TRANSMISSIONS);
        const garbled = msg.split('').map((ch) => (rand.chance(0.12) ? '░' : ch)).join('');
        this.record(`[radio 104.7, 03:1${rand.int(0, 9)}] “${garbled}”`, { visible: true });
        break;
      }
      case 'aware': {
        const c = rand.pick(alive);
        c.flags.aware = true;
        c.flags.anomalyNote = 'Keeps looking up.';
        this.record(`[unexplained] Neighbors say ${c.first} ${c.last} has started staring at the sky`, { who: c.id });
        break;
      }
      case 'building': {
        // a small building appears where there was none
        const P = W.city.park;
        const spots = [[P.x0 + 14, P.z1 - 14], [P.x1 - 14, P.z1 - 14], [P.x0 + 14, P.z0 + 60]];
        const [x, z] = rand.pick(spots);
        if (W.city.buildings.some((b) => b.anomaly && dist(b.x, b.z, x, z) < 10)) return;
        const b = {
          id: W.city.buildings.length, block: W.blockOf(x, z).id, code: 'P', district: 'Greenway Park', x, z, w: 6, d: 6, x0: x - 3, z0: z - 3, x1: x + 3, z1: z + 3, h: 6.8, floors: 2,
          kind: 'brick', style: 7, color: '#8a8a86', trim: '#5a5a58', roof: 'flat', front: 'S', door: [x, z + 3], sw: [x, z + 6], roadId: null, laneNear: null, laneFar: null,
          name: '', bizType: null, resUnits: 0, civic: null, residents: [], bizId: null, occupants: new Set(), state: 'ok', damage: 0, fire: 0, burned: 0, zone: 'C', powered: true,
          parts: [{ x, z, y: 3.4, w: 6, d: 6, h: 6.8, style: 7, color: '#8a8a86' }], seed: 1, rent: 0, value: 0, lit: 0, anomaly: { kind: 'building', note: 'This building is not on any city map. The door is unlocked.' },
        };
        W.city.buildings.push(b);
        W.city.blockAt(Math.floor(x / 88 + 5), Math.floor(z / 88 + 5))?.buildings.push(b.id);
        W.buildBuildingGrid();
        W.emit('anomalyBuilding', b);
        this.record('[unexplained] Park visitors report a building near the trees that is not on the map', { x, z, b: b.id });
        break;
      }
    }
  }

  update(dtMin) {
    const W = this.world;
    if (!W.exeMode) return;
    // aware citizens stop and look at the camera when you watch them closely
    this.watchT += dtMin;
    if (this.watchT < 1) return;
    this.watchT = 0;
    for (const p of W.peds.list) {
      const c = W.citizens[p.cid];
      if (!c.flags.aware || c.possessed) continue;
      const d = dist(p.x, p.z, W.focus.x, W.focus.z);
      if (d < 30 && p.state === 'idle') p.h = Math.atan2(W.focus.x - p.x, W.focus.z - p.z);
    }
  }

  onPossess(c) {
    const W = this.world;
    if (!W.exeMode) return;
    if (c.flags.aware) setTimeout(() => W.emit('anomalyLine', { c, text: 'You again.' }), 2500);
    else if (rand.chance(0.04)) W.history.citizenLog(c, 'Felt strangely watched today', false);
  }

  awareLine() { return rand.pick(AWARE); }

  serialize() {
    const W = this.world;
    const extra = W.city.buildings.filter((b) => b.anomaly && b.anomaly.kind === 'building').map((b) => ({ x: b.x, z: b.z }));
    return { list: this.list.slice(-50), count: this.count, extra };
  }
  deserialize(d) {
    const W = this.world;
    this.list = d.list || []; this.count = d.count || 0;
    for (const e of d.extra || []) {
      if (W.city.buildings.some((b) => b.anomaly && dist(b.x, b.z, e.x, e.z) < 2)) continue;
      this.spawnBuildingAt(e.x, e.z);
    }
  }
  spawnBuildingAt(x, z) {
    const W = this.world;
    const b = {
      id: W.city.buildings.length, block: W.blockOf(x, z).id, code: 'P', district: 'Greenway Park', x, z, w: 6, d: 6, x0: x - 3, z0: z - 3, x1: x + 3, z1: z + 3, h: 6.8, floors: 2,
      kind: 'brick', style: 7, color: '#8a8a86', trim: '#5a5a58', roof: 'flat', front: 'S', door: [x, z + 3], sw: [x, z + 6], roadId: null, laneNear: null, laneFar: null,
      name: '', bizType: null, resUnits: 0, civic: null, residents: [], bizId: null, occupants: new Set(), state: 'ok', damage: 0, fire: 0, burned: 0, zone: 'C', powered: true,
      parts: [{ x, z, y: 3.4, w: 6, d: 6, h: 6.8, style: 7, color: '#8a8a86' }], seed: 1, rent: 0, value: 0, lit: 0, anomaly: { kind: 'building', note: 'This building is not on any city map. The door is unlocked.' },
    };
    W.city.buildings.push(b);
    W.blockOf(x, z)?.buildings.push(b.id);
    W.buildBuildingGrid();
    W.emit('anomalyBuilding', b);
  }
}
