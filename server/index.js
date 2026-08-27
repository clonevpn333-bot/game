/* Summit authoritative game server.
 *
 *   npm run server                 # ws://localhost:8787
 *   PORT=9000 npm run server
 *
 * Serves the whole `site/` directory too, so a single process can host both the
 * arcade and the game when you are running it yourself. */
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { dec, enc, C2S, S2C, TICK_HZ, NET, MAX_PLAYERS } from './shared.js';
import { createRoom, getRoom, canJoin, findRoomByToken, reap, allRooms, roomCount } from './rooms.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site');
const PORT = Number(process.env.PORT || 8787);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  if (url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
    res.end(JSON.stringify({ ok: true, rooms: roomCount(), players: allRooms().reduce((n, r) => n + r.players.size, 0), up: Math.round(process.uptime()) }));
    return;
  }
  let file = url.startsWith('/h/') ? '/hub.html' : url;
  if (file.endsWith('/')) file += 'index.html';
  const abs = path.join(ROOT, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  if (!abs.startsWith(ROOT)) { res.writeHead(403).end('no'); return; }
  try {
    const s = await stat(abs);
    const target = s.isDirectory() ? path.join(abs, 'index.html') : abs;
    res.writeHead(200, { 'content-type': TYPES[path.extname(target)] || 'application/octet-stream' });
    res.end(await readFile(target));
  } catch { res.writeHead(404, { 'content-type': 'text/plain' }).end('not found'); }
});

const wss = new WebSocketServer({ server, path: '/ws' });
let idSeq = 1;

wss.on('connection', (ws) => {
  const ctx = { room: null, player: null, alive: true };
  ws.on('message', (raw) => {
    const msg = dec(String(raw));
    if (!msg) return;
    try { route(ws, ctx, msg); } catch (err) { console.error('msg error', msg.t, err.message); }
  });
  ws.on('close', () => { if (ctx.room && ctx.player) ctx.room.dropPlayer(ctx.player); });
  ws.on('pong', () => { ctx.alive = true; });
  ws.send(enc(S2C.WELCOME, { server: 'summit', v: 1, max: MAX_PLAYERS, tick: TICK_HZ }));
});

function route(ws, ctx, { t, d }) {
  if (t === C2S.PING) { ws.send(enc(S2C.PONG, { t: d.t, s: Date.now() })); return; }

  if (t === C2S.HELLO) {
    // Reconnect straight back into whatever run this token was in.
    const found = d.token && findRoomByToken(d.token);
    if (found) {
      ctx.room = found.room;
      ctx.player = found.room.reconnect(ws, d.token);
      if (ctx.player) {
        ctx.player.name = (d.name || ctx.player.name).slice(0, 16);
        if (d.cosmetics) ctx.player.cosmetics = d.cosmetics;
        ws.send(enc(S2C.WELCOME, { id: ctx.player.id, token: d.token, room: ctx.room.roomState(), seed: ctx.room.seed, resumed: true }));
        return;
      }
    }
    ws.send(enc(S2C.WELCOME, { server: 'summit', v: 1, max: MAX_PLAYERS, tick: TICK_HZ }));
    return;
  }

  if (t === C2S.CREATE) {
    const room = createRoom(d.seed);
    join(ws, ctx, room, d);
    return;
  }

  if (t === C2S.JOIN) {
    const room = getRoom(d.code);
    if (!room) { ws.send(enc(S2C.ERROR, { msg: 'No room with that code' })); return; }
    if (!canJoin(room)) { ws.send(enc(S2C.ERROR, { msg: 'That room is full' })); return; }
    join(ws, ctx, room, d);
    return;
  }

  const { room, player } = ctx;
  if (!room || !player) return;
  player.lastSeen = Date.now();

  switch (t) {
    case C2S.INPUT:
      if (player.inputs.length < 24) player.inputs.push(d);
      break;
    case C2S.READY:
      player.ready = !!d.v;
      room.broadcast(S2C.ROOM, room.roomState());
      break;
    case C2S.START:
      room.startRun();
      break;
    case C2S.ACT:
      room.action(player, d);
      break;
    case C2S.CHAT:
      room.broadcast(S2C.CHAT, { id: player.id, name: player.name, text: String(d.text || '').slice(0, 160) });
      break;
    case C2S.EMOTE:
      room.event('emote', { id: player.id, k: String(d.k || '').slice(0, 12) });
      break;
    case C2S.COSMETIC:
      player.cosmetics = d.c || {};
      player.pack = d.pack || player.pack;
      room.broadcast(S2C.ROOM, room.roomState());
      break;
    case C2S.NAME:
      player.name = String(d.name || 'Climber').slice(0, 16);
      room.broadcast(S2C.ROOM, room.roomState());
      break;
    case C2S.LEAVE:
      room.removePlayer(player);
      ctx.room = null; ctx.player = null;
      break;
  }
}

function join(ws, ctx, room, d) {
  const token = d.token || `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const id = 'p' + (idSeq++);
  const p = room.addPlayer(ws, { id, token, name: d.name, cosmetics: d.cosmetics });
  if (!p) { ws.send(enc(S2C.ERROR, { msg: 'That room is full' })); return; }
  if (d.pack) p.pack = d.pack;
  ctx.room = room; ctx.player = p;
  ws.send(enc(S2C.WELCOME, { id, token, room: room.roomState(), seed: room.seed, resumed: false }));
  room.broadcast(S2C.ROOM, room.roomState());
}

/* ---- fixed-step loop ---- */
const STEP = 1000 / TICK_HZ;
let acc = 0, last = Date.now();
setInterval(() => {
  const now = Date.now();
  acc += now - last; last = now;
  if (acc > 400) acc = STEP;         // never spiral after a stall
  while (acc >= STEP) { acc -= STEP; for (const room of allRooms()) room.update(STEP / 1000); }
}, Math.max(4, Math.floor(STEP / 2)));

setInterval(reap, 30000);
setInterval(() => {
  for (const client of wss.clients) { if (client.readyState === 1) { try { client.ping(); } catch {} } }
}, NET.heartbeatMs);

server.listen(PORT, () => {
  console.log(`Summit server  ws://localhost:${PORT}/ws   (site on http://localhost:${PORT})`);
});
