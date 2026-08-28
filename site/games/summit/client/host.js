/* Hosting a run from your own browser tab. The authoritative room — the same
 * code the Node server runs — lives here, ticks at 30 Hz, and answers both you
 * and everyone who dialled in over WebRTC. No server, no downloads. */
import { route, newCtx, dropConnection } from '../sim/router.js';
import { createRoom, allRooms, reap } from '../sim/rooms.js';
import { TICK_HZ } from '../shared/constants.js';
import { loadPeerLib, peerIdFor, randomCode } from './transport.js';

const BROKER = { host: '0.peerjs.com', port: 443, path: '/', secure: true, debug: 0 };
const ICE = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

function brokerReason(e) {
  const t = e?.type || '';
  if (t === 'network' || t === 'server-error' || t === 'socket-error') return 'This network blocks the matchmaking broker.';
  if (t === 'browser-incompatible') return 'This browser cannot do peer-to-peer.';
  return e?.message || 'The matchmaking broker refused the connection.';
}

export class Host {
  constructor() {
    this.settled = false;
    this.online = false;
    this.code = null;
    this.room = null;
    this.guests = new Set();
    this.running = false;
    this.onStatus = null;
  }

  /** Starts the room immediately, then claims its code on the public broker so
   *  friends can dial in. If the broker is unreachable the run still works —
   *  you just climb alone until the network lets someone through. */
  async open(attempt = 0) {
    if (!this.room) {
      this.code = randomCode();
      this.room = createRoom(undefined, this.code);
      this.start();
    }
    let Peer;
    try { Peer = await loadPeerLib(); }
    catch { this.online = false; return { code: this.code, online: false, reason: 'The peer library did not load.' }; }

    return new Promise((resolve) => {
      const peer = new Peer(peerIdFor(this.code), { ...BROKER, config: ICE });
      this.peer = peer;
      const settle = (v) => { if (!this.settled) { this.settled = true; resolve(v); } };
      peer.on('error', (e) => {
        if (this.online) { this.onStatus?.('peer error: ' + (e?.type || 'unknown')); return; }
        try { peer.destroy(); } catch {}
        if (e?.type === 'unavailable-id' && attempt < 4) {
          this.settled = false; this.code = randomCode();
          this.room.code = this.code;
          settle(this.open(attempt + 1));
          return;
        }
        this.online = false;
        settle({ code: this.code, online: false, reason: brokerReason(e) });
      });
      peer.on('open', () => { this.online = true; settle({ code: this.code, online: true }); });
      peer.on('connection', (conn) => this.accept(conn));
      setTimeout(() => { if (!this.settled) { this.online = false; settle({ code: this.code, online: false, reason: 'The matchmaking broker did not answer.' }); } }, 9000);
    });
  }

  accept(conn) {
    const ctx = newCtx();
    const link = {
      send: (t, d) => { if (conn.open) { try { conn.send([t, d]); } catch {} } },
      close: () => conn.close(),
    };
    this.guests.add(conn);
    conn.on('data', (m) => {
      if (!Array.isArray(m)) return;
      try { route(ctx, { t: m[0], d: m[1] ?? {} }, link); } catch (err) { console.warn('guest message', err); }
    });
    conn.on('close', () => { this.guests.delete(conn); dropConnection(ctx); });
    conn.on('error', () => { this.guests.delete(conn); dropConnection(ctx); });
    conn.on('open', () => link.send('we', { server: 'summit', v: 1, max: 4, tick: TICK_HZ }));
  }

  /** The host's own connection: straight function calls, zero latency. */
  localCtx() { return newCtx(); }
  receive(ctx, msg, link) { route(ctx, msg, link); }

  start() {
    if (this.running) return;
    this.running = true;
    const STEP = 1000 / TICK_HZ;
    let acc = 0, last = performance.now();
    const tick = () => {
      if (!this.running) return;
      const now = performance.now();
      acc += now - last; last = now;
      if (acc > 400) acc = STEP;
      let guard = 0;
      while (acc >= STEP && guard++ < 8) { acc -= STEP; for (const r of allRooms()) r.update(STEP / 1000); }
      this.timer = setTimeout(tick, Math.max(2, STEP / 2));
    };
    tick();
    this.reaper = setInterval(reap, 30000);
  }

  stop() {
    this.running = false;
    clearTimeout(this.timer);
    clearInterval(this.reaper);
    for (const c of this.guests) { try { c.close(); } catch {} }
    this.guests.clear();
    try { this.peer?.destroy(); } catch {}
  }

  get playerCount() { return this.room?.players.size ?? 0; }
}
