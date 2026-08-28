/* Headless multiplayer integration test. Drives a full run through every phase
 * and exercises actions, reconnect and drop-out. Run the server first. */
import WebSocket from 'ws';
import { C2S, S2C, ACT, dec, enc } from '../site/games/summit/sim/shared.js';

const URL = process.env.WS || 'ws://localhost:8787/ws';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
let failures = 0;
const check = (label, ok, extra = '') => { log(`${ok ? 'PASS' : 'FAIL'}  ${label} ${extra}`); if (!ok) failures++; };

function client(name) {
  const ws = new WebSocket(URL);
  const c = { ws, name, id: null, code: null, snaps: 0, phase: null, seq: 0, last: null, events: [], errors: [], notes: [] };
  ws.on('message', (raw) => {
    const m = dec(String(raw)); if (!m) return;
    if (m.t === S2C.WELCOME && m.d.id) { c.id = m.d.id; c.code = m.d.room.code; c.token = m.d.token; c.resumed = m.d.resumed; }
    if (m.t === S2C.SNAP) { c.snaps++; c.last = m.d; c.phase = m.d.ph; if (m.d.it) c.items = m.d.it; if (m.d.p) c.maxFall = Math.min(c.maxFall ?? 0, m.d.p.find((x) => x.i === c.id)?.v?.[1] ?? 0); }
    if (m.t === S2C.PHASE) c.phase = m.d.phase;
    if (m.t === S2C.EVENT) { c.events.push(m.d.e); if (m.d.text) c.notes.push(m.d.text); }
    if (m.t === S2C.ROOM) c.room = m.d;
    if (m.t === S2C.ERROR) c.errors.push(m.d.msg);
    if (m.t === S2C.RESULTS) c.results = m.d;
  });
  c.send = (t, d) => ws.readyState === 1 && ws.send(enc(t, d));
  c.input = (mv = { x: 0, y: 0 }, btn = 0, yaw = 0, pitch = 0) => c.send(C2S.INPUT, { q: ++c.seq, dt: 1 / 30, mv, yaw, pitch, btn });
  c.me = () => c.last?.p.find((p) => p.i === c.id);
  return new Promise((res) => ws.on('open', () => res(c)));
}

async function drive(clients, ms, fn) {
  const end = Date.now() + ms;
  let i = 0;
  while (Date.now() < end) {
    for (const c of clients) fn(c, i);
    await wait(28); i++;
  }
}
async function until(pred, ms, clients, fn) {
  const end = Date.now() + ms;
  let i = 0;
  while (Date.now() < end && !pred()) {
    for (const c of clients) fn(c, i);
    await wait(28); i++;
  }
  return pred();
}

const a = await client('Ada');
a.send(C2S.CREATE, { name: 'Ada' });
await wait(300);
check('room created', !!a.code && !!a.id, a.code);

const b = await client('Bo');
b.send(C2S.JOIN, { code: a.code, name: 'Bo' });
await wait(300);
check('second player joined', !!b.id && b.errors.length === 0);
check('roster has 2', a.room?.players.length === 2);

const bad = await client('Cy');
bad.send(C2S.JOIN, { code: 'ZZZZZ', name: 'Cy' });
await wait(250);
check('bad code rejected', bad.errors.length === 1, bad.errors[0] || '');

a.send(C2S.READY, { v: true }); b.send(C2S.READY, { v: true });
const flying = await until(() => a.phase === 'flight', 12000, [a, b], (c) => c.input({ x: 0, y: 1 }));
check('lobby -> flight', flying, a.phase);

await drive([a, b], 7600, (c) => c.input({ x: 0, y: 0 }, 0));
const dove = await until(() => a.phase === 'dive', 9000, [a, b], (c) => c.input({ x: 0, y: 0 }, c.phase === 'flight' ? 1 : 0));
check('jumped from the plane', dove, a.phase);


const landed = await until(() => a.phase === 'climb', 90000, [a, b], (c) => c.input({ x: 0, y: 0 }, 0));
check('dive -> climb (landed)', landed, `y=${a.me()?.y}`);
check('freefall reaches terminal speed', (a.maxFall ?? 0) < -60, 'peak vy=' + Math.round(a.maxFall ?? 0));
check('landed on the beach, not the sea', Math.hypot(a.me()?.x ?? 9e9, a.me()?.z ?? 0) < 2470 && (a.me()?.y ?? -99) > -6, `r=${Math.round(Math.hypot(a.me()?.x ?? 0, a.me()?.z ?? 0))} y=${a.me()?.y}`);
check('no fall damage under canopy', (a.me()?.h ?? 0) > 90, 'hp=' + a.me()?.h);

// walk uphill, then hold grab to climb the steep part
const y0 = a.me()?.y ?? 0;
// forward is (-sin yaw, -cos yaw); aim it at the summit at (0,0)
await drive([a, b], 24000, (c) => { const m = c.me(); c.input({ x: 0, y: 1 }, 4 | 2, m ? Math.atan2(m.x, m.z) : 0); });
const y1 = a.me()?.y ?? 0;
check('climbed uphill', y1 > y0 + 8, `${Math.round(y0)} -> ${Math.round(y1)}`);
check('stamina is being spent', (a.me()?.s ?? 100) < 100, 's=' + a.me()?.s);
check('hunger ticks down', (a.me()?.u ?? 100) < 100, 'u=' + a.me()?.u);

// actions: ping, horn, pick up the nearest container
a.send(C2S.ACT, { a: ACT.PING, x: 10, y: 10, z: 10 });
a.send(C2S.ACT, { a: ACT.HORN });
await wait(300);
check('ping + horn broadcast', a.events.includes('mark') && a.events.includes('horn'));
check('marks are in the snapshot', (a.last?.mk?.length ?? 0) > 0);

const items = a.items || [];
check('world has loot', items.length > 50, items.length + ' spots');

// reconnect with the same token
const token = a.token;
a.ws.close();
await wait(400);
const a2 = await client('Ada');
a2.send(C2S.HELLO, { token, name: 'Ada' });
await wait(500);
check('reconnect resumes the same climber', a2.resumed === true && a2.id === a.id, a2.id);

// run continues with a player gone
b.ws.close();
await drive([a2], 1500, (c) => c.input({ x: 0, y: 1 }, 0));
check('run continues after a drop', a2.snaps > 0 && a2.phase === 'climb');

log(failures ? `\n${failures} FAILURES` : '\nall green');
process.exit(failures ? 1 : 0);
