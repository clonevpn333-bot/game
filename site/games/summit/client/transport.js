/* How the client reaches a room. Three ways, one interface:
 *   local  — you are the host; the room runs in this tab
 *   peer   — you joined someone's tab over WebRTC (free public broker, wss:443)
 *   ws     — a dedicated Node server, if you happen to run one
 * The message shape is identical in all three cases. */
import { ROOM } from '../shared/constants.js';

const BROKER = { host: '0.peerjs.com', port: 443, path: '/', secure: true, debug: 0 };
const ICE = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:global.stun.twilio.com:3478'] },
    // TCP/443 relay so restrictive networks still connect
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

export const peerIdFor = (code) => 'summit-v1-' + String(code).toUpperCase();
export function randomCode() {
  const A = ROOM.codeAlphabet;
  let c = '';
  for (let i = 0; i < ROOM.codeLen; i++) c += A[Math.floor(Math.random() * A.length)];
  return c;
}

let peerLibPromise = null;
export function loadPeerLib() {
  if (window.Peer) return Promise.resolve(window.Peer);
  if (!peerLibPromise) {
    peerLibPromise = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = new URL('../../../vendor/peerjs/peerjs.min.js', import.meta.url).href;
      s.onload = () => res(window.Peer);
      s.onerror = () => rej(new Error('peer library failed to load'));
      document.head.append(s);
    });
  }
  return peerLibPromise;
}

/** Talks straight to a room object in this tab. No network at all. */
export class LocalTransport {
  constructor(host) {
    this.host = host;
    this.status = 'online';
    this.onMessage = null;
    this.link = { send: (t, d) => this.onMessage?.({ t, d }) };
  }
  connect() { this.status = 'online'; this.onOpen?.(); }
  send(t, d) { this.host.receive(this.ctx, { t, d }, this.link); }
  close() { this.status = 'offline'; }
}

/** Joins a host's tab over WebRTC. */
export class PeerTransport {
  constructor(code) {
    this.code = String(code).toUpperCase();
    this.status = 'idle';
    this.onMessage = null;
    this.queue = [];
  }
  async connect() {
    this.status = 'connecting';
    const Peer = await loadPeerLib();
    this.peer = new Peer(undefined, { ...BROKER, config: ICE });
    this.peer.on('open', () => this.dial());
    this.peer.on('error', (e) => {
      this.status = 'error';
      this.onError?.(brokerMessage(e));
    });
  }
  dial() {
    this.conn = this.peer.connect(peerIdFor(this.code), { reliable: true, serialization: 'json', metadata: { v: 1 } });
    this.conn.on('open', () => {
      this.status = 'online';
      for (const m of this.queue.splice(0)) this.conn.send(m);
      this.onOpen?.();
    });
    this.conn.on('data', (m) => { if (Array.isArray(m)) this.onMessage?.({ t: m[0], d: m[1] ?? {} }); });
    this.conn.on('close', () => { this.status = 'offline'; this.onClose?.(); });
    this.conn.on('error', () => { this.status = 'error'; });
  }
  send(t, d) {
    const m = [t, d];
    if (this.conn && this.conn.open) this.conn.send(m);
    else if (this.queue.length < 60) this.queue.push(m);
  }
  close() { this.status = 'offline'; try { this.conn?.close(); this.peer?.destroy(); } catch {} }
}

/** A dedicated Node server, for when you run one. */
export class WsTransport {
  constructor(url) { this.url = url; this.status = 'idle'; this.onMessage = null; }
  connect() {
    this.status = 'connecting';
    try { this.ws = new WebSocket(this.url); } catch { this.status = 'error'; this.onError?.('Bad server address'); return; }
    this.ws.onopen = () => { this.status = 'online'; this.onOpen?.(); };
    this.ws.onclose = () => { this.status = 'offline'; this.onClose?.(); };
    this.ws.onerror = () => { this.status = 'error'; this.onError?.('Could not reach ' + this.url); };
    this.ws.onmessage = (ev) => {
      try {
        const v = JSON.parse(ev.data);
        if (Array.isArray(v)) this.onMessage?.({ t: v[0], d: v[1] ?? {} });
      } catch {}
    };
  }
  send(t, d) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify([t, d])); }
  close() { this.status = 'offline'; try { this.ws?.close(); } catch {} }
}

function brokerMessage(e) {
  const type = e?.type || '';
  if (type === 'peer-unavailable') return 'No run with that code. Check the letters, or ask your friend to host again.';
  if (type === 'unavailable-id') return 'That code is already hosting. Try again.';
  if (type === 'network' || type === 'server-error') return 'Could not reach the matchmaking broker from this network.';
  if (type === 'browser-incompatible') return 'This browser cannot do peer-to-peer.';
  return e?.message || 'Connection failed';
}
