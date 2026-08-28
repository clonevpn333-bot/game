/* Network client: room join, input send, server reconciliation for the local
 * climber, and snapshot interpolation for everyone else. */
import { C2S, S2C } from '../shared/protocol.js';
import { step, newMoveState, newModifiers } from '../shared/locomotion.js';
import { NET, PHASE, BIOMES, biomeIndexAt, STATUS } from '../shared/constants.js';
import { inventoryWeight, PACKS } from '../shared/items.js';

const BTN = { JUMP: 1, SPRINT: 2, GRAB: 4, USE: 8 };
export { BTN };

export class Net {
  constructor({ onEvent, onPhase, onRoom, onResults, onChat, onWelcome }) {
    this.on = { event: onEvent, phase: onPhase, room: onRoom, results: onResults, chat: onChat, welcome: onWelcome };
    this.transport = null;
    this.rejoinOnOpen = false;
    this.id = null;
    this.token = localStorage.getItem('summit.token') || null;
    this.room = null;
    this.seed = null;
    this.phase = PHASE.LOBBY;
    this.snapshots = [];
    this.seq = 0;
    this.pred = newMoveState();
    this.history = [];
    this.mods = newModifiers();
    this.inv = [];
    this.pack = 'small';
    this.nearFire = -1;
    this.zipStart = false;
    this.rtt = 0;
    this.clockOffset = 0;
    this.world = null;
    this.lastServerMe = null;
    this.corr = { x: 0, y: 0, z: 0 };
    this.items = [];
    this.reconnectTimer = null;
    this.pendingJoin = null;
    this.wantsReconnect = true;
  }

  /** Point the client at a transport (local host, peer, or dedicated server). */
  attach(transport) {
    this.transport?.close?.();
    this.transport = transport;
    transport.onMessage = (msg) => this.handle(msg);
    transport.onOpen = () => {
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.send(C2S.PING, { t: performance.now() }), 2000);
      if (this.token && this.rejoinOnOpen) this.send(C2S.HELLO, { token: this.token, name: this.name, cosmetics: this.cos });
      this.onOpen?.();
    };
    transport.onClose = () => {
      clearInterval(this.pingTimer);
      if (this.wantsReconnect) {
        this.rejoinOnOpen = true;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => transport.connect(), 1800);
      }
    };
    transport.onError = (msg) => this.on.event?.({ e: 'error', text: msg });
    transport.connect();
    return transport;
  }

  get status() { return this.transport?.status || 'idle'; }

  disconnect() {
    this.wantsReconnect = false;
    clearTimeout(this.reconnectTimer);
    clearInterval(this.pingTimer);
    this.transport?.close();
  }

  send(t, d = {}) { this.transport?.send(t, d); }

  createRoom(name, cos, pack, code) { this.name = name; this.cos = cos; this.send(C2S.CREATE, { name, cosmetics: cos, pack, code, token: this.token }); }
  joinRoom(code, name, cos, pack) { this.name = name; this.cos = cos; this.send(C2S.JOIN, { code, name, cosmetics: cos, pack, token: this.token }); }
  setReady(v) { this.send(C2S.READY, { v }); }
  startRun() { this.send(C2S.START, {}); }
  act(a, extra = {}) { this.send(C2S.ACT, { a, ...extra }); }
  chat(text) { this.send(C2S.CHAT, { text }); }
  emote(k) { this.send(C2S.EMOTE, { k }); }
  setCosmetics(c, pack) { this.cos = c; this.send(C2S.COSMETIC, { c, pack }); }
  setName(name) { this.name = name; this.send(C2S.NAME, { name }); }

  handle(msg) {
    if (!msg) return;
    const { t, d } = msg;
    switch (t) {
      case S2C.WELCOME:
        if (d.id) {
          this.id = d.id;
          this.token = d.token || this.token;
          if (this.token) localStorage.setItem('summit.token', this.token);
          this.room = d.room;
          this.seed = d.seed;
          this.phase = d.room?.phase || this.phase;
          this.on.welcome?.(d);
          this.on.room?.(d.room);
        }
        break;
      case S2C.ROOM:
        this.room = d;
        this.phase = d.phase;
        this.on.room?.(d);
        break;
      case S2C.PHASE:
        this.phase = d.phase;
        if (d.seed != null) this.seed = d.seed;
        this.on.phase?.(d);
        break;
      case S2C.SNAP: this.onSnapshot(d); break;
      case S2C.EVENT: this.on.event?.(d); break;
      case S2C.CHAT: this.on.chat?.(d); break;
      case S2C.RESULTS: this.on.results?.(d); break;
      case S2C.PONG: {
        this.rtt = performance.now() - d.t;
        this.clockOffset = d.s + this.rtt / 2 - Date.now();
        break;
      }
      case S2C.ERROR: this.on.event?.({ e: 'error', text: d.msg }); break;
    }
  }

  onSnapshot(s) {
    s.recv = performance.now();
    this.snapshots.push(s);
    if (this.snapshots.length > 24) this.snapshots.shift();
    this.phase = s.ph;
    if (s.it) this.items = s.it;
    if (s.iv) this.inv = s.iv;
    if (s.pkk) this.pack = s.pkk;
    this.nearFire = s.nf;
    this.zipStart = s.zs;
    const me = s.p.find((p) => p.i === this.id);
    if (me) { this.lastServerMe = me; this.reconcile(me, s.ac); }
  }

  /** Rewinds to the authoritative state and replays every input the server has
   *  not acknowledged yet, then keeps the visual error and eases it out. */
  reconcile(me, ack) {
    if (!this.world) return;
    const before = { x: this.pred.x, y: this.pred.y, z: this.pred.z };
    this.pred.x = me.x; this.pred.y = me.y; this.pred.z = me.z;
    this.pred.vx = me.v[0]; this.pred.vy = me.v[1]; this.pred.vz = me.v[2];
    this.pred.stamina = me.s;
    this.history = this.history.filter((h) => h.q > ack);
    this.buildMods(me);
    for (const h of this.history) {
      step(this.pred, h.input, this.world, this.mods, this.serverPhase());
    }
    const dx = before.x - this.pred.x, dy = before.y - this.pred.y, dz = before.z - this.pred.z;
    if (Math.hypot(dx, dy, dz) < 6) { this.corr.x = dx; this.corr.y = dy; this.corr.z = dz; }
    else { this.corr.x = this.corr.y = this.corr.z = 0; }
  }

  serverPhase() {
    if (this.phase === PHASE.DIVE) return PHASE.DIVE;
    if (this.phase === PHASE.FLIGHT) return PHASE.DIVE;
    return this.phase;
  }

  buildMods(me) {
    const m = this.mods;
    m.speed = 1; m.staminaMult = 1;
    for (const id of me?.st || []) {
      const d = STATUS[id];
      if (d) { m.speed *= d.speed; m.staminaMult *= d.staminaMult; }
    }
    m.ghost = !!(me && (me.f & 8));
    m.downed = !!(me && (me.f & 4));
    m.mass = inventoryWeight(this.inv);
    m.grip = BIOMES[biomeIndexAt(this.pred.y)].grip;
    m.nearFire = this.nearFire >= 0;
    m.speed *= (PACKS[this.pack] || PACKS.small).speed;
    return m;
  }

  /** Advances the local prediction by one frame and ships the input. */
  tick(dt, intent) {
    const input = {
      mv: intent.mv, yaw: intent.yaw, pitch: intent.pitch,
      jump: intent.jump, sprint: intent.sprint, grab: intent.grab, dt,
    };
    const q = ++this.seq;
    this.history.push({ q, input });
    if (this.history.length > 90) this.history.shift();
    this.buildMods(this.lastServerMe);
    if (this.world && this.phase !== PHASE.FLIGHT) step(this.pred, input, this.world, this.mods, this.serverPhase());
    const btn = (intent.jump ? BTN.JUMP : 0) | (intent.sprint ? BTN.SPRINT : 0) | (intent.grab ? BTN.GRAB : 0) | (intent.use ? BTN.USE : 0);
    this.send(C2S.INPUT, { q, dt: Math.min(dt, 0.05), mv: intent.mv, yaw: intent.yaw, pitch: intent.pitch, btn });
    const decay = Math.pow(0.0025, dt);
    this.corr.x *= decay; this.corr.y *= decay; this.corr.z *= decay;
    return this.pred;
  }

  /** Renders other players slightly in the past and interpolates between snapshots. */
  sampleOthers(nowPerf) {
    const target = nowPerf - NET.interpDelayMs;
    const out = [];
    if (this.snapshots.length < 2) {
      const last = this.snapshots[this.snapshots.length - 1];
      if (last) for (const p of last.p) if (p.i !== this.id) out.push({ ...p });
      return out;
    }
    let a = this.snapshots[0], b = this.snapshots[1];
    for (let i = 0; i < this.snapshots.length - 1; i++) {
      if (this.snapshots[i].recv <= target && this.snapshots[i + 1].recv >= target) { a = this.snapshots[i]; b = this.snapshots[i + 1]; break; }
      a = this.snapshots[this.snapshots.length - 2]; b = this.snapshots[this.snapshots.length - 1];
    }
    const span = Math.max(1, b.recv - a.recv);
    const k = Math.max(0, Math.min(1 + NET.maxExtrapolateMs / span, (target - a.recv) / span));
    for (const pb of b.p) {
      if (pb.i === this.id) continue;
      const pa = a.p.find((x) => x.i === pb.i) || pb;
      out.push({
        i: pb.i, n: pb.n, c: pb.c, e: pb.e, f: pb.f, st: pb.st, k: pb.k, g: pb.g,
        x: lerp(pa.x, pb.x, k), y: lerp(pa.y, pb.y, k), z: lerp(pa.z, pb.z, k),
        a: lerpAngle(pa.a, pb.a, k), b: lerp(pa.b, pb.b, k),
        s: lerp(pa.s, pb.s, k), h: lerp(pa.h, pb.h, k), u: lerp(pa.u, pb.u, k), t: lerp(pa.t, pb.t, k),
        v: pb.v,
      });
    }
    return out;
  }

  latest() { return this.snapshots[this.snapshots.length - 1] || null; }
  meState() { return this.lastServerMe; }
  roster() { return this.room?.players || []; }
}

const lerp = (a, b, t) => a + (b - a) * t;
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
