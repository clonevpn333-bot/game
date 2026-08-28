/* A room: up to four climbers, one seed, one authoritative simulation. */
import {
  createWorld, newMoveState, newVitals, packPlayer, S2C, PHASE, MAX_PLAYERS,
  TICK_HZ, SNAPSHOT_HZ, FLIGHT, WORLD, SURVIVAL, rng, RECONNECT_GRACE_MS, PACKS,
} from './shared.js';
import { spawnLoot, packItems } from './loot.js';
import { simulate } from './simulate.js';
import { handleAction } from './actions.js';

let seqCounter = 1;

export class Room {
  constructor(code, seed) {
    this.code = code;
    this.seed = seed >>> 0;
    this.world = createWorld(this.seed);
    this.players = new Map();
    this.items = spawnLoot(this.world, this.seed);
    this.anchors = []; this.ziplines = []; this.marks = []; this.flares = [];
    this.camps = this.world.campfires.map(() => false);
    this.checkpoint = 0;
    this.phase = PHASE.LOBBY;
    this.phaseT = 0;
    this.tick = 0;
    this.seqId = 1;
    this.peak = 0;
    this.rand = rng(this.seed ^ 0x7f4a7c15);
    this.itemsDirty = true;
    this.pending = [];
    this.plane = { x: 0, y: FLIGHT.altitude, z: 0, yaw: 0, t: 0 };
    this.heli = null;
    this.createdAt = Date.now();
    this.startedAt = 0;
    this.results = null;
    this.slots = [0, 1, 2, 3];
    // The airfield is flat ground, not the mountain — the lobby simulates against this.
    this.flatWorld = {
      height: () => 0,
      normal: (x, z, out = { x: 0, y: 1, z: 0 }) => { out.x = 0; out.y = 1; out.z = 0; return out; },
      slope: () => 1,
      campfires: [], route: [],
    };
  }

  /* ---------------- players ---------------- */
  addPlayer(link, { id, token, name, cosmetics }) {
    if (this.players.size >= MAX_PLAYERS) return null;
    const spawn = lobbySpawn(this.players.size);
    const p = {
      id, token, link, name: (name || 'Climber').slice(0, 16), cosmetics: cosmetics || {},
      connected: true, lastSeen: Date.now(), ready: false, slot: this.slots.shift() ?? 0,
      move: Object.assign(newMoveState(spawn.x, spawn.y, spawn.z), { yaw: spawn.yaw }),
      vitals: newVitals(), inputs: [], ack: 0, lastBtn: 0,
      inv: [], pack: 'small', heldItem: null, carrying: null, carriedBy: null,
      anim: 'idle', inPlane: false, boarded: false, nearFire: -1,
      chalkT: 0, ropeT: 0, boostT: 0, hornCd: 0, warmthT: 0, reviveHold: 0,
      grapple: null, riding: null, zipStart: null,
      stats: { falls: 0, deaths: 0, revives: 0, boosts: 0, assists: 0, items: 0, carried: 0, peak: 0 },
    };
    this.players.set(id, p);
    this.broadcast(S2C.ROOM, this.roomState());
    return p;
  }

  reconnect(link, token) {
    for (const p of this.players.values()) {
      if (p.token === token) {
        try { p.link?.close?.(); } catch {}
        p.link = link; p.connected = true; p.lastSeen = Date.now();
        this.broadcast(S2C.ROOM, this.roomState());
        return p;
      }
    }
    return null;
  }

  dropPlayer(p) {
    p.connected = false; p.lastSeen = Date.now(); p.link = null;
    if (p.carrying) { const t = this.players.get(p.carrying); if (t) t.carriedBy = null; p.carrying = null; }
    this.broadcast(S2C.ROOM, this.roomState());
  }

  removePlayer(p) {
    this.players.delete(p.id);
    this.slots.push(p.slot);
    if (p.carrying) { const t = this.players.get(p.carrying); if (t) t.carriedBy = null; }
    this.broadcast(S2C.ROOM, this.roomState());
  }

  /* ---------------- messaging ---------------- */
  send(p, type, data) { try { p.link?.send(type, data); } catch {} }
  tell(p, kind, data) { this.send(p, S2C.EVENT, { e: kind, ...data }); }
  broadcast(type, data) { for (const p of this.players.values()) this.send(p, type, data); }
  event(kind, data = {}) { this.pending.push({ e: kind, ...data }); }
  eventSink() { return []; }

  roomState() {
    return {
      code: this.code, seed: this.seed, phase: this.phase, camps: this.camps,
      players: [...this.players.values()].map((p) => ({
        i: p.id, n: p.name, c: p.cosmetics, r: p.ready, o: p.connected, s: p.slot,
        d: p.vitals.dead, w: p.vitals.downed, pk: p.pack,
      })),
    };
  }

  /* ---------------- phase machine ---------------- */
  setPhase(next) {
    this.phase = next; this.phaseT = 0;
    this.broadcast(S2C.PHASE, { phase: next, t: Date.now(), seed: this.seed, camps: this.camps });
  }

  startRun() {
    if (this.phase !== PHASE.LOBBY) return;
    // A fresh seed per run: the mountain is never the same twice.
    this.seed = ((Math.random() * 0xffffffff) >>> 0);
    this.world = createWorld(this.seed);
    this.camps = this.world.campfires.map(() => false);
    this.rand = rng(this.seed ^ 0x7f4a7c15);
    // Out over the water, across the beach, on toward the peak. The jump window
    // is the stretch where a canopy can still reach the sand.
    const b = this.world.beach;
    const th = Math.atan2(b.z, b.x);
    // heading such that the plane's forward vector (-sin yaw, -cos yaw) points inland
    const yaw = Math.atan2(Math.cos(th), Math.sin(th));
    this.plane = {
      x: b.x * 1.38, y: FLIGHT.altitude, z: b.z * 1.38, t: 0, yaw,
      sx: b.x * 1.38, sz: b.z * 1.38, ex: b.x * 0.588, ez: b.z * 0.588,
      dur: 30,
    };
    for (const p of this.players.values()) {
      p.inPlane = true; p.boarded = false;
      p.move = Object.assign(newMoveState(this.plane.x, this.plane.y, this.plane.z), { yaw: this.plane.yaw });
      p.vitals = newVitals();
      p.inv = [{ id: 'bandage', n: 2 }, { id: 'berry', n: 2 }];
      p.stats = { falls: 0, deaths: 0, revives: 0, boosts: 0, assists: 0, items: 0, carried: 0, peak: 0 };
      p.ready = false;
    }
    this.items = spawnLoot(this.world, this.seed);
    this.anchors = []; this.ziplines = []; this.marks = []; this.flares = [];
    this.camps = this.world.campfires.map(() => false);
    this.itemsDirty = true;
    this.peak = 0; this.startedAt = Date.now(); this.heli = null; this.results = null;
    this.setPhase(PHASE.FLIGHT);
  }

  updatePhase(dt) {
    this.phaseT += dt;
    const alive = [...this.players.values()].filter((p) => p.connected);

    if (this.phase === PHASE.LOBBY) {
      const ready = alive.filter((p) => p.ready);
      if (alive.length && ready.length === alive.length) {
        this.countdown = (this.countdown ?? 5) - dt;
        this.broadcast(S2C.EVENT, { e: 'countdown', t: Math.max(0, this.countdown) });
        if (this.countdown <= 0) { this.countdown = null; this.startRun(); }
      } else this.countdown = 5;
      return;
    }

    if (this.phase === PHASE.FLIGHT) {
      const pl = this.plane;
      pl.t = Math.min(1, this.phaseT / (pl.dur || 30));
      pl.x = pl.sx + (pl.ex - pl.sx) * pl.t;
      pl.z = pl.sz + (pl.ez - pl.sz) * pl.t;
      pl.y = FLIGHT.altitude + Math.sin(this.phaseT * 0.5) * 14;
      if (pl.t > 0.45) for (const p of this.players.values()) {
        if (p.inPlane) { p.inPlane = false; p.move.vx = -Math.sin(pl.yaw) * 26; p.move.vz = -Math.cos(pl.yaw) * 26; this.event('jumped', { id: p.id, auto: true }); }
      }
      if (![...this.players.values()].some((p) => p.inPlane)) this.setPhase(PHASE.DIVE);
      return;
    }

    if (this.phase === PHASE.DIVE) {
      const anyAir = [...this.players.values()].some((p) => !p.move.onGround);
      if (!anyAir || this.phaseT > 150) this.setPhase(PHASE.CLIMB);
      return;
    }

    if (this.phase === PHASE.CLIMB) {
      const s = this.world.summitPos;
      const atTop = [...this.players.values()].some((p) => !p.vitals.dead && Math.hypot(p.move.x - s.x, p.move.z - s.z) < 46);
      if (atTop) {
        this.heli = { x: s.x, y: s.y + 190, z: s.z + 120, state: 'inbound', t: 0 };
        this.event('heli', { state: 'inbound' });
        this.setPhase(PHASE.EXTRACT);
      }
      return;
    }

    if (this.phase === PHASE.EXTRACT) {
      const h = this.heli, s = this.world.summitPos;
      h.t += dt;
      if (h.state === 'inbound') {
        const k = Math.min(1, h.t / 16);
        const e = k * k * (3 - 2 * k);
        h.x = s.x + (1 - e) * 40; h.z = s.z + (1 - e) * 120; h.y = s.y + 190 * (1 - e) + 3.2;
        if (k >= 1) { h.state = 'landed'; h.t = 0; this.event('heli', { state: 'landed' }); }
      } else if (h.state === 'landed') {
        const living = [...this.players.values()].filter((p) => !p.vitals.dead && p.connected);
        const boarded = living.filter((p) => p.boarded);
        if (living.length && boarded.length === living.length) { h.state = 'away'; h.t = 0; this.event('heli', { state: 'away' }); }
        else if (h.t > 90) { h.state = 'away'; h.t = 0; this.event('heli', { state: 'away' }); }
      } else if (h.state === 'away') {
        h.y += dt * 22; h.z -= dt * 30;
        if (h.t > 5) this.finish(true);
      }
      return;
    }

    if (this.phase === PHASE.RESULTS) {
      if (this.phaseT > 40) {
        for (const p of this.players.values()) {
          p.ready = false; p.vitals = newVitals();
          const sp = lobbySpawn(p.slot);
          p.move = Object.assign(newMoveState(sp.x, sp.y, sp.z), { yaw: sp.yaw });
          p.inv = [];
        }
        this.setPhase(PHASE.LOBBY);
        this.broadcast(S2C.ROOM, this.roomState());
      }
    }
  }

  finish(extracted) {
    const list = [...this.players.values()];
    const badge = (label, pick, fmt) => {
      let best = null;
      for (const p of list) if (!best || pick(p) > pick(best)) best = p;
      return best && pick(best) > 0 ? { label, who: best.name, id: best.id, value: fmt ? fmt(pick(best)) : Math.round(pick(best)) } : null;
    };
    this.results = {
      extracted,
      peak: Math.round(this.peak),
      duration: Math.round((Date.now() - this.startedAt) / 1000),
      camps: this.camps.filter(Boolean).length,
      players: list.map((p) => ({
        id: p.id, name: p.name, peak: Math.round(p.stats.peak), falls: p.stats.falls,
        deaths: p.stats.deaths, revives: p.stats.revives, boosts: p.stats.boosts,
        items: p.stats.items, carried: Math.round(p.stats.carried),
        alive: !p.vitals.dead, boarded: !!p.boarded,
        reward: Math.round(p.stats.peak * 0.6 + p.stats.revives * 120 + p.stats.boosts * 40 + (extracted && !p.vitals.dead ? 600 : 0)),
      })),
      badges: [
        badge('Took the most air', (p) => p.stats.falls),
        badge('Carried the team', (p) => p.stats.revives * 2 + p.stats.carried * 0.1 + p.stats.boosts),
        badge('Highest point', (p) => p.stats.peak),
        badge('Pack mule', (p) => p.stats.items),
      ].filter(Boolean),
    };
    this.setPhase(PHASE.RESULTS);
    this.broadcast(S2C.RESULTS, this.results);
  }

  /* ---------------- main loop ---------------- */
  update(dt) {
    this.tick++;
    this.updatePhase(dt);
    simulate(this, dt);
    // reconnect grace
    for (const p of [...this.players.values()]) {
      if (!p.connected && Date.now() - p.lastSeen > RECONNECT_GRACE_MS) this.removePlayer(p);
    }
    if (this.tick % Math.round(TICK_HZ / SNAPSHOT_HZ) === 0) this.sendSnapshots();
    if (this.pending.length) {
      for (const ev of this.pending) this.broadcast(S2C.EVENT, ev);
      this.pending.length = 0;
    }
  }

  sendSnapshots() {
    const players = [...this.players.values()].map(packPlayer);
    const base = {
      k: this.tick, t: Date.now(), ph: this.phase,
      p: players, mk: this.marks, fl: this.flares, an: this.anchors, zp: this.ziplines,
      cp: this.camps, pk: Math.round(this.peak),
      pl: this.phase === 'flight' ? { x: r(this.plane.x), y: r(this.plane.y), z: r(this.plane.z), yaw: r(this.plane.yaw), t: r(this.plane.t) } : null,
      he: this.heli ? { x: r(this.heli.x), y: r(this.heli.y), z: r(this.heli.z), s: this.heli.state } : null,
    };
    if (this.itemsDirty || this.tick % (SNAPSHOT_HZ * 4) === 0) { base.it = packItems(this.items); this.itemsDirty = false; }
    for (const p of this.players.values()) {
      this.send(p, S2C.SNAP, { ...base, ac: p.ack, me: p.id, iv: p.inv, pkk: p.pack, nf: p.nearFire, zs: !!p.zipStart });
    }
  }

  action(p, d) { handleAction(this, p, d); }
}

function lobbySpawn(i) {
  const a = -0.6 + i * 0.4;
  return { x: -16 + Math.cos(a) * 7, y: 0, z: 12 + Math.sin(a) * 7, yaw: Math.PI * 0.5 };
}
const r = (v) => Math.round(v * 100) / 100;
