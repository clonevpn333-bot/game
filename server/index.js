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
import { dec, enc, S2C } from '../site/games/summit/shared/protocol.js';
import { TICK_HZ, NET, MAX_PLAYERS } from '../site/games/summit/shared/constants.js';
import { reap, allRooms, roomCount } from '../site/games/summit/sim/rooms.js';
import { route, newCtx, dropConnection } from '../site/games/summit/sim/router.js';

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

wss.on('connection', (ws) => {
  const ctx = newCtx();
  const link = { send: (t, d) => { if (ws.readyState === 1) { try { ws.send(enc(t, d)); } catch {} } }, close: () => ws.close() };
  ws.on('message', (raw) => {
    const msg = dec(String(raw));
    if (!msg) return;
    try { route(ctx, msg, link); } catch (err) { console.error('msg error', msg.t, err.message); }
  });
  ws.on('close', () => dropConnection(ctx));
  ws.send(enc(S2C.WELCOME, { server: 'summit', v: 1, max: MAX_PLAYERS, tick: TICK_HZ }));
});

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
