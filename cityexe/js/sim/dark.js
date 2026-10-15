// The city's dark side. A handful of citizens hide something: a killer who
// walks the streets at night looking for someone alone, a stalker fixated on a
// neighbour or coworker, con artists draining pensioners' savings, an arsonist,
// people with a violent streak. They prey on *other citizens* (the player is
// rarely the target), and detectives work every case: clues pile up, a serial
// pattern makes the news, and sooner or later the police come knocking.
import { persona } from './persona.js';
import { rand } from '../core/rng.js';
import { dist, clamp } from '../core/math.js';

const NIGHT = (h) => h >= 22 || h < 4;
const NICK_A = ['Night', 'Harbor', 'Quiet', 'Midnight', 'Lantern', 'Rain', 'Alley', 'Ninth Street'];
const NICK_B = ['Caller', 'Ripper', 'Walker', 'Shadow', 'Stranger', 'Butcher', 'Visitor'];

export class DarkSide {
  constructor(W) {
    this.W = W;
    this.st = {};            // per-citizen state { kind, target, level, next, ... }
    this.hunts = [];         // killers out on the street right now
    this.lurks = new Map();  // stalkers watching a building
    this.rosterDay = -1;
    this.roster = [];
    this.tick = 0;
    W.on('hour', ({ hour }) => this.hourly(hour));
    W.on('day', () => this.daily());
  }

  // who hides what (persona-derived, stable per citizen); only a few killers are active at a time
  refresh() {
    const W = this.W;
    this.rosterDay = W.day;
    this.roster = [];
    for (const c of W.citizens) {
      if (c.status === 'dead' || c.status === 'left' || c.age < 18 || c.isPlayer) continue;
      const kind = persona(c).dark;
      if (!kind) continue;
      this.roster.push(c);
      if (!this.st[c.id]) this.st[c.id] = { kind, level: 0, next: W.day + (kind === 'killer' ? rand.int(2, 12) : kind === 'arsonist' ? rand.int(3, 25) : rand.int(0, 4)), victims: 0 };
    }
    // only a few are active at any time; the rest lie dormant
    for (const [kind, n] of [['killer', 3], ['arsonist', 1]]) {
      this.roster.filter((c) => this.st[c.id].kind === kind).forEach((c, i) => { if (i >= n) this.st[c.id].dormant = true; else delete this.st[c.id].dormant; });
    }
  }
  stats() {
    const n = {};
    for (const c of this.roster) n[this.st[c.id].kind] = (n[this.st[c.id].kind] || 0) + 1;
    return { ...n, hunts: this.hunts.length, lurks: this.lurks.size };
  }
  free(c) {
    const inc = c.flags.suspectOf ? this.W.incidents.get(c.flags.suspectOf) : null;
    return c.status === 'ok' && !c.possessed && c.duty == null && !c.flags.cuffed && !(inc && !inc.closed) && c.veh == null;
  }
  isPlayerTargetable() { const p = this.W.life?.player; return p && p.status === 'ok' ? p : null; }

  // ------------------------------------------------------------ schedule
  hourly(hour) {
    const W = this.W;
    if (this.rosterDay !== W.day) this.refresh();
    for (const c of this.roster) {
      const s = this.st[c.id];
      if (!s || c.status !== 'ok') continue;
      if (s.kind === 'killer' && !s.dormant && NIGHT(hour) && W.day >= s.next && this.free(c) && !this.hunts.some((h) => h.k === c.id)) this.startHunt(c, s);
      else if (s.kind === 'stalker' && s.tonight && NIGHT(hour) && this.free(c)) this.comeFor(c, s);
      else if (s.kind === 'stalker' && hour >= 17 && hour <= 23 && rand.chance(0.3)) this.stalk(c, s);
      else if (s.kind === 'violent' && (hour >= 21 || hour < 2) && c.at != null && rand.chance(0.08)) this.lashOut(c, s);
      else if (s.kind === 'arsonist' && !s.dormant && hour === 2 && W.day >= s.next && c.state === 'inside') this.arson(c, s);
    }
  }
  daily() {
    const W = this.W;
    if (this.rosterDay !== W.day) this.refresh();
    for (const c of this.roster) {
      const s = this.st[c.id];
      if (!s || c.status !== 'ok') continue;
      if (s.kind === 'con artist' && rand.chance(0.07)) this.scam(c, s);
      if (s.kind === 'stalker' && s.target != null) this.escalate(c, s);
    }
  }

  // ------------------------------------------------------------ killers
  pickVictim(k) {
    const W = this.W;
    const kp = W.citizenPos(k);
    if (!kp) return null;
    const pl = this.isPlayerTargetable();
    if (pl && pl.ped && rand.chance(0.03) && dist(pl.ped.x, pl.ped.z, kp.x, kp.z) < 700) return pl;
    let best = null, bs = -Infinity;
    for (const p of W.peds.list) {
      const o = W.citizens[p.cid];
      if (!o || o === k || o.possessed || o.duty != null || o.age < 16 || o.status !== 'ok' || p.fallen > 0 || p.action === 'down') continue;
      const d = dist(p.x, p.z, kp.x, kp.z);
      if (d > 600) continue;
      const crowd = W.peds.near(p.x, p.z, 22).length;
      const s = -d / 200 - crowd * 0.8 + (o.age > 65 ? 0.4 : 0) + rand.float();
      if (s > bs) { bs = s; best = o; }
    }
    return best;
  }
  startHunt(k, s) {
    const W = this.W;
    if (W.abstract) return this.abstractKill(k, s);
    const v = this.pickVictim(k);
    if (!v) return;
    if (k.state === 'inside') { if (!W.citizenAI.leaveBuilding(k)) return; }
    if (!k.ped) return;
    k.trip = null;
    k.goal = { type: 'crime', label: 'Out for a late walk', run: false };
    this.hunts.push({ k: k.id, v: v.id, t0: W.time, next: 0, strikes: 0 });
    if (v.isPlayer && W.life) W.life.msg('👁', 'The street is quiet. You get the feeling someone is following you.');
  }
  // a stalker's breaking point when the target is the player: they come looking
  comeFor(c, s) {
    const W = this.W, t = W.citizens[s.target];
    s.tonight = false;
    if (!t || !t.ped || W.abstract) return;
    if (c.state === 'inside' && !W.citizenAI.leaveBuilding(c)) return;
    if (!c.ped) return;
    c.trip = null;
    c.goal = { type: 'crime', label: `Looking for ${t.first}` };
    this.hunts.push({ k: c.id, v: t.id, t0: W.time, next: 0, strikes: 0 });
  }
  // nobody is watching (fast-forward): resolve offscreen, a home invasion or a body found at dawn
  abstractKill(k, s) {
    const W = this.W;
    const pool = W.citizens.filter((o) => o.status === 'ok' && !o.isPlayer && o !== k && o.age >= 16 && o.duty == null && !o.possessed);
    const v = rand.pick(pool);
    if (!v) return;
    const b = W.city.buildings[v.at ?? v.home];
    const pos = { x: b.door[0], z: b.door[1] };
    W.citizenAI.die(v, 'stabbed');
    k.record.crimes++;
    W.history.citizenLog(k, `Killed ${v.name}`, true);
    W.combat.homicide(v, k, pos, 'stabbed');
    this.afterKill(k, s, v);
  }
  afterKill(k, s, v) {
    const W = this.W;
    s.victims++;
    s.next = W.day + rand.int(4, 12);
    const linked = W.investigations.list.filter((x) => x.culprit === k.id && x.type === 'homicide');
    if (linked.length >= 2 && !s.nick) {
      s.nick = `the ${rand.pick(NICK_A)} ${rand.pick(NICK_B)}`;
      W.history.cityEvent(`Police fear a serial killer — ${linked.length} deaths now linked. Papers call them "${s.nick}"`, { type: 'crime', x: v && W.citizenPos(v)?.x, z: v && W.citizenPos(v)?.z });
      for (const x of linked) x.nick = s.nick;
    } else if (s.nick) W.history.cityEvent(`"${s.nick}" strikes again: victim #${s.victims} named as ${v.name}`, { type: 'crime' });
  }
  updateHunt(h, dt) {
    const W = this.W;
    const k = W.citizens[h.k], v = W.citizens[h.v];
    const done = (resume = true) => { this.hunts.splice(this.hunts.indexOf(h), 1); if (resume && k.status === 'ok' && !k.flags.cuffed) W.citizenAI.resume(k); };
    if (!k || k.status !== 'ok' || k.possessed || k.flags.cuffed || !k.ped) return done(false);
    if (!v || v.status === 'dead') {
      // done: slip away into the night
      const inc = k.flags.suspectOf ? W.incidents.get(k.flags.suspectOf) : null;
      this.hunts.splice(this.hunts.indexOf(h), 1);
      if (inc && !inc.closed) W.incidents.flee(k, inc, false); else W.citizenAI.resume(k);
      return;
    }
    if (W.time - h.t0 > 75) return done();
    if (v.status !== 'ok' && v.status !== 'hospital') return done();
    const vp = v.ped;
    if (!vp) {
      // they made it indoors: sometimes the killer follows them home
      if (v.at != null && v.at === v.home && !v.isPlayer && rand.chance(0.25) && W.city.buildings[v.at].kind === 'house') {
        const b = W.city.buildings[v.at];
        W.citizenAI.die(v, 'stabbed');
        k.record.crimes++;
        W.history.citizenLog(k, `Killed ${v.name}`, true);
        W.combat.homicide(v, k, { x: b.door[0], z: b.door[1] }, 'stabbed in their home');
        this.afterKill(k, this.st[k.id], v);
      }
      return done();
    }
    h.next -= dt;
    if (h.next > 0) return;
    h.next = 0.5;
    const kp = k.ped;
    const d = dist(kp.x, kp.z, vp.x, vp.z);
    if (d < 1.5 && vp.action !== 'down') {
      // strike
      kp.h = Math.atan2(vp.x - kp.x, vp.z - kp.z);
      kp.action = 'build'; setTimeout(() => { if (kp.action === 'build') kp.action = ''; }, 300);
      W.combat.melee(k, 'knife', v);
      h.strikes++;
      if (v.status === 'dead') this.afterKill(k, this.st[k.id], v);
      else if (h.strikes === 1 && !v.possessed && v.ped && vp.fallen < 1) {
        W.peds.walkTo(vp, vp.x + (vp.x - kp.x) * 12, vp.z + (vp.z - kp.z) * 12, () => W.citizenAI.resume(v), { run: true, direct: true });
        vp.speed = 3;
      }
      if (h.strikes > 6) return done();
      return;
    }
    if (vp.action === 'down' && v.status === 'ok' && d < 2) { W.combat.melee(k, 'knife', v); if (v.status === 'dead') this.afterKill(k, this.st[k.id], v); return; }
    // follow: casually from afar, then close the gap fast
    const near = d < 28;
    W.peds.walkTo(kp, vp.x, vp.z, null, { direct: near, run: d < 10 || h.strikes > 0 });
    kp.speed = d < 10 ? 3.4 : 1.5;
  }

  // ------------------------------------------------------------ stalkers
  chooseObsession(c) {
    const W = this.W;
    const pl = this.isPlayerTargetable();
    if (pl && rand.chance(0.05)) return pl.id;
    const known = Object.keys(c.rel).map(Number).filter((id) => { const o = W.citizens[id]; return o && o.status === 'ok' && o.age >= 18 && c.rel[id].t !== 'family' && !o.isPlayer; });
    if (known.length) return rand.pick(known);
    const any = W.citizens.filter((o) => o.status === 'ok' && o.age >= 18 && o !== c && !o.isPlayer && dist(W.city.buildings[o.home].x, W.city.buildings[o.home].z, W.city.buildings[c.home].x, W.city.buildings[c.home].z) < 400);
    return any.length ? rand.pick(any).id : null;
  }
  stalk(c, s) {
    const W = this.W;
    if (s.target == null || W.citizens[s.target]?.status === 'dead' || W.citizens[s.target]?.status === 'left') { s.target = this.chooseObsession(c); s.level = 0; if (s.target == null) return; }
    const t = W.citizens[s.target];
    if (!this.free(c) || c.state !== 'inside' || c.working || t.at == null || t.at === c.at) return;
    const b = W.city.buildings[t.at];
    if (!b || W.abstract) { s.level += 0.03; return; }
    // stand across the street from wherever they are
    const [dx, dz] = W.citizenAI.doorOut(b);
    const off = { N: [0, -9], S: [0, 9], E: [9, 0], W: [-9, 0] }[b.front] || [0, 9];
    c.goal = { type: 'lurk', label: `Watching ${t.first} ${t.last || ''} from across the street`.trim(), point: [dx + off[0], dz + off[1]] };
    W.citizenAI.startTrip(c, null, [dx + off[0] + (rand.float() - 0.5) * 4, dz + off[1] + (rand.float() - 0.5) * 4]);
    this.lurks.set(c.id, { b: b.id, t: t.id, until: W.time + 50 + rand.float() * 60, p: [dx + off[0], dz + off[1]] });
    s.level = Math.min(1.2, s.level + 0.05);
  }
  updateLurks() {
    const W = this.W;
    for (const [cid, L] of this.lurks) {
      const c = W.citizens[cid], t = W.citizens[L.t];
      if (!c || c.status !== 'ok' || c.possessed || !t) { this.lurks.delete(cid); continue; }
      if (W.time > L.until || t.at !== L.b) {
        this.lurks.delete(cid);
        if (c.ped && t.ped && dist(c.ped.x, c.ped.z, t.ped.x, t.ped.z) < 40 && !W.abstract) {
          // they came out: follow them for a while
          c.trip = null; W.parkLife.list.delete(c.id);
          c.goal = { type: 'lurk', label: `Following ${t.first}` };
          W.peds.walkTo(c.ped, t.ped.x, t.ped.z, () => W.citizenAI.resume(c), {});
          if (t.isPlayer && W.life && rand.chance(0.5)) W.life.msg('👁', 'Unknown number: "You look nice tonight."');
        } else if (c.state === 'walking' && !c.trip) W.citizenAI.resume(c);
        continue;
      }
      // don't wander off into the park when the walk ends: stand and watch
      if (W.parkLife.list.has(cid)) { W.parkLife.list.delete(cid); if (c.ped) W.peds.stop(c.ped); }
      if (c.ped && c.ped.state === 'idle') { const b = W.city.buildings[L.b]; c.ped.h = Math.atan2(b.x - c.ped.x, b.z - c.ped.z); c.ped.action = rand.chance(0.002) ? 'phone' : c.ped.action; }
    }
  }
  escalate(c, s) {
    const W = this.W, t = W.citizens[s.target];
    if (!t || t.status !== 'ok') return;
    s.level = Math.min(1.2, s.level + 0.04 + rand.float() * 0.05);
    if (t.isPlayer && W.life) {
      const lines = s.level < 0.4 ? ['Unknown number: "Saw you today. You didn\'t see me."', 'Unknown number: "Nice place you have."']
        : s.level < 0.8 ? [`Unknown number: "Why were you talking to them? You know who."`, 'Unknown number: "I left something at your door."', 'Unknown number: "Answer me."']
          : ['Unknown number: "If I can\'t have you no one can."', 'Unknown number: "I know your schedule."'];
      if (rand.chance(0.5)) W.life.msg('👁', rand.pick(lines));
      if (s.level >= 0.6 && !s.revealed && rand.chance(0.25)) { s.revealed = true; W.life.msg('👁', `You recognise the person who keeps showing up: ${c.name}. Report it to the police (talk to an officer or visit the station).`); t.flags.stalker = c.id; }
    } else {
      if (s.level > 0.25 && rand.chance(0.4)) { W.history.citizenLog(t, rand.pick(['Noticed the same person outside again', 'Got another anonymous message', 'Felt like someone was watching them']), false); t.stress = clamp((t.stress || 0) + 0.12, 0, 1); }
      if (s.level > 0.6 && !s.reported && rand.chance(0.3)) { s.reported = true; W.history.citizenLog(t, `Reported being stalked`, true); W.investigations.open('stalking', t, c, W.citizenPos(t) || { x: 0, z: 0 }, 'stalking'); }
    }
    // the breaking point
    if (s.level >= 1 && rand.chance(0.25)) {
      if (t.isPlayer) { W.life && W.life.msg('⚠', `Unknown number: "Tonight."`); s.level = 0.75; s.tonight = true; return; }
      const b = W.city.buildings[t.home];
      if (rand.chance(0.25)) {
        W.citizenAI.die(t, 'killed by a stalker');
        W.combat.homicide(t, c, { x: b.door[0], z: b.door[1] }, 'killed by an obsessed acquaintance');
        s.target = null;
      } else {
        t.injured = Math.max(t.injured || 0, 0.4);
        W.history.citizenLog(t, `Was attacked by ${c.name}, who had been stalking them`, true);
        W.history.citizenLog(c, `Attacked ${t.name}`, true);
        c.record.crimes++;
        W.investigations.open('assault', t, c, { x: b.door[0], z: b.door[1] }, 'assault', 0.7);
        s.level = 0.3;
      }
    }
  }

  // ------------------------------------------------------------ con artists
  scam(c, s) {
    const W = this.W;
    const pool = W.citizens.filter((o) => o.status === 'ok' && o !== c && !o.isPlayer && (o.bank || 0) + o.money > 800 && (o.age > 62 || o.traits.caution < 0.35 || (c.rel[o.id] && c.rel[o.id].a > 0.3)));
    const v = rand.pick(pool);
    if (!v) return;
    const pitch = rand.pick(['a fake bank fraud call', 'a "can\'t-lose" crypto scheme', 'a fake charity', 'a romance scam', 'a phony contractor deposit', 'a lottery "processing fee"']);
    let amt = Math.round(Math.min((v.bank || 0) * 0.35 + v.money * 0.5, 300 + rand.float() * 4500));
    if (amt < 80) return;
    const fromBank = Math.min(v.bank || 0, amt);
    v.bank = (v.bank || 0) - fromBank; v.money = Math.max(0, v.money - (amt - fromBank));
    c.money += amt;
    c.record.crimes++;
    s.victims++;
    W.history.citizenLog(v, `Lost $${amt} to ${pitch}`, true);
    W.history.citizenLog(c, `Scammed ${v.name} out of $${amt}`, false);
    v.stress = clamp((v.stress || 0) + 0.25, 0, 1);
    if (rand.chance(0.35)) W.investigations.open('fraud', v, c, W.citizenPos(v) || { x: 0, z: 0 }, pitch, 0.1);
    if (amt > 2500 && rand.chance(0.5)) W.history.cityEvent(`${v.name} loses $${amt.toLocaleString()} to ${pitch}`, { type: 'crime', minor: true });
  }
  // the player gets a pitch too, now and then (via LifeSim events): accepting loses money
  scamPlayer() {
    const c = this.roster.find((x) => this.st[x.id].kind === 'con artist' && x.status === 'ok');
    return c ? { con: c.id, pitch: rand.pick(['your bank\'s "fraud department"', 'a crypto "investment club"', 'a prize claim line']) } : null;
  }

  // ------------------------------------------------------------ arsonists & violent people
  arson(c, s) {
    const W = this.W;
    const home = W.city.buildings[c.home];
    const pool = W.city.buildings.filter((b) => b.state === 'ok' && !b.fire && b.kind !== 'park' && b.civic == null && b.h < 24 && dist(b.x, b.z, home.x, home.z) < 700 && dist(b.x, b.z, home.x, home.z) > 80);
    const b = rand.pick(pool);
    if (!b) return;
    s.next = W.day + rand.int(6, 20);
    s.victims++;
    W.incidents.ignite(b, 'arson', 0.06);
    c.record.crimes++;
    W.history.citizenLog(c, `Set fire to ${W.citizenAI.buildingName(b.id)}`, true);
    W.investigations.open('arson', null, c, { x: b.door[0], z: b.door[1] }, `fire at ${W.citizenAI.buildingName(b.id)}`, 0.05, b.id);
    if (s.victims >= 2) W.history.cityEvent(`Fire marshal suspects a serial arsonist after another night-time blaze`, { type: 'crime', x: b.x, z: b.z });
  }
  lashOut(c, s) {
    const W = this.W;
    const b = W.city.buildings[c.at];
    if (!b) return;
    const others = Array.from(b.occupants).map((id) => W.citizens[id]).filter((o) => o && o !== c && o.status === 'ok' && !o.possessed && o.age >= 16);
    if (!others.length) return;
    const partner = W.citizenAI.partner?.(c);
    const o = partner && others.includes(partner) && rand.chance(0.5) ? partner : rand.pick(others);
    W.incidents.fight(c, o, b);
    s.victims++;
    if (o === partner) { W.history.citizenLog(o, `Was hurt by ${c.first} at home`, true); if (rand.chance(0.3)) W.investigations.open('assault', o, c, { x: b.door[0], z: b.door[1] }, 'domestic assault', 0.5); }
  }

  // ------------------------------------------------------------ per frame
  update(dt) {
    for (let i = this.hunts.length - 1; i >= 0; i--) this.updateHunt(this.hunts[i], dt);
    this.tick -= dt;
    if (this.tick <= 0) { this.tick = 1; this.updateLurks(); }
  }

  serialize() { return { st: this.st }; }
  deserialize(d) { this.st = d.st || {}; this.rosterDay = -1; }
}

// ---------------------------------------------------------------- detectives
const CASE_LABEL = { homicide: 'Homicide', stalking: 'Stalking', fraud: 'Fraud', arson: 'Arson', assault: 'Assault' };
const SENTENCE = { homicide: 40, stalking: 4, fraud: 6, arson: 14, assault: 5 };

export class Investigations {
  constructor(W) {
    this.W = W;
    this.list = [];
    this.nid = 1;
    W.on('day', () => this.daily());
  }
  open(type, victim, culprit, pos, what, start = 0, b = null) {
    const W = this.W;
    if (!culprit) return null;
    if (victim && this.list.some((k) => k.victim === victim.id && k.type === type && k.status === 'open')) return null;
    const k = { id: this.nid++, type, victim: victim ? victim.id : null, victimName: victim ? victim.name : what, culprit: culprit.id, x: pos.x, z: pos.z, b, day: W.day, clues: start + rand.float() * 0.15, status: 'open', what };
    // the player leaves more evidence when seen; a known record helps too
    if (culprit.record.crimes > 3) k.clues += 0.1;
    this.list.push(k);
    if (this.list.length > 120) this.list.splice(0, this.list.findIndex((x) => x.status !== 'open') + 1 || 1);
    if (type === 'homicide') W.history.cityEvent(`Detectives open a murder inquiry into the death of ${k.victimName}`, { type: 'crime', x: pos.x, z: pos.z, minor: true });
    return k;
  }
  forCulprit(cid) { return this.list.filter((k) => k.culprit === cid && k.status === 'open'); }
  daily() {
    const W = this.W;
    const cops = W.citizens.filter((c) => c.job?.role === 'officer' && c.status === 'ok').length;
    for (const k of this.list) {
      if (k.status !== 'open') continue;
      const c = W.citizens[k.culprit];
      if (!c || c.status === 'dead') { k.status = 'closed'; k.outcome = 'suspect deceased'; continue; }
      if (c.status === 'jail') { k.clues += 0.3; }
      // linked cases share evidence: serial offenders get caught
      const linked = this.forCulprit(c.id).length;
      k.clues += (0.04 + rand.float() * 0.09) * (1 + cops / 40) * (k.type === 'homicide' ? 1.2 : 0.8) * (1 + (linked - 1) * 0.35);
      if (k.clues >= 1) this.solve(k, c);
      else if (W.day - k.day > 25) { k.status = 'cold'; if (k.type === 'homicide') W.history.cityEvent(`The ${k.victimName} murder case goes cold`, { type: 'crime', minor: true }); }
    }
  }
  solve(k, c) {
    const W = this.W;
    k.status = 'solved';
    const all = this.forCulprit(c.id);
    for (const o of all) { o.status = 'solved'; }
    const worst = [k, ...all].reduce((a, o) => (SENTENCE[o.type] > SENTENCE[a.type] ? o : a), k);
    const label = CASE_LABEL[worst.type];
    // already behind bars (or just served time for it): nothing more to do
    if (c.status === 'jail' || (c.lastJailed != null && c.lastJailed > (k.day - 1) * 1440)) return;
    if (c.isPlayer) {
      if (W.life) W.life.msg('🚔', `Detectives have a warrant for your arrest (${label.toLowerCase()} — ${worst.victimName}). Lawyer up, or run.`);
      W.combat.raiseHeat(worst.type === 'homicide' ? 4 : 2);
      return;
    }
    const nick = W.dark?.st[c.id]?.nick;
    W.history.cityEvent(nick ? `Police arrest ${c.name} — believed to be "${nick}"` : `${c.name} charged with ${label.toLowerCase()}${worst.victimName ? ` (${worst.victimName})` : ''}`, { type: 'crime', x: k.x, z: k.z, who: c.id });
    W.history.citizenLog(c, `Arrested for ${label.toLowerCase()}`, true);
    c.record.arrests++;
    W.history.counters.arrests++;
    if (c.ped && c.state === 'walking' && !W.abstract && c.status === 'ok') {
      // picked up on the street: a real pursuit
      const inc = W.incidents.create(worst.type === 'homicide' ? 'homicide' : 'wanted', { x: c.ped.x, z: c.ped.z, suspects: [c.id], priority: 2, needs: { police: 2 }, title: `Warrant: ${label}` });
      c.flags.suspectOf = inc.id;
      c.record.wanted = 2;
      return;
    }
    if (c.status === 'ok') {
      c.flags.jailFor = SENTENCE[worst.type];
      W.incidents.jail(c, (W.city.special.police || [c.home])[0]);
    }
  }
  // the panel shown on the police computer / phone news
  html(esc) {
    const W = this.W;
    const rows = this.list.slice(-12).reverse();
    if (!rows.length) return '<p class="muted">No open cases.</p>';
    return rows.map((k) => `<div class="job"><span><b>${CASE_LABEL[k.type]}</b> — ${esc(k.victimName || '')}${k.nick ? ` <small>("${esc(k.nick)}")</small>` : ''}<br><small>Day ${k.day + 1} · ${k.status}${k.status === 'open' ? ` · evidence ${Math.round(clamp(k.clues, 0, 1) * 100)}%` : ''}</small></span></div>`).join('') + `<p class="muted"><small>${W.dark ? '' : ''}</small></p>`;
  }
  serialize() { return { list: this.list, nid: this.nid }; }
  deserialize(d) { this.list = d.list || []; this.nid = d.nid || 1; }
}
