/* Message routing. Identical whether the room is running on a Node server or
 * inside the host player's browser tab — only the link differs. */
import { C2S, S2C, MAX_PLAYERS, TICK_HZ } from './shared.js';
import { createRoom, getRoom, canJoin, findRoomByToken } from './rooms.js';

let idSeq = 1;
export const newCtx = () => ({ room: null, player: null });

/**
 * @param ctx   per-connection state
 * @param msg   { t, d }
 * @param link  { send(type, data), close?() }
 */
export function route(ctx, msg, link) {
  const { t, d } = msg;
  if (t === C2S.PING) { link.send(S2C.PONG, { t: d.t, s: Date.now() }); return; }

  if (t === C2S.HELLO) {
    const found = d.token && findRoomByToken(d.token);
    if (found) {
      ctx.room = found.room;
      ctx.player = found.room.reconnect(link, d.token);
      if (ctx.player) {
        ctx.player.name = (d.name || ctx.player.name).slice(0, 16);
        if (d.cosmetics) ctx.player.cosmetics = d.cosmetics;
        link.send(S2C.WELCOME, { id: ctx.player.id, token: d.token, room: ctx.room.roomState(), seed: ctx.room.seed, resumed: true });
        return;
      }
    }
    link.send(S2C.WELCOME, { server: 'summit', v: 1, max: MAX_PLAYERS, tick: TICK_HZ });
    return;
  }

  if (t === C2S.CREATE) { join(link, ctx, createRoom(d.seed, d.code), d); return; }

  if (t === C2S.JOIN) {
    const room = getRoom(d.code);
    if (!room) { link.send(S2C.ERROR, { msg: 'No room with that code' }); return; }
    if (!canJoin(room)) { link.send(S2C.ERROR, { msg: 'That room is full' }); return; }
    join(link, ctx, room, d);
    return;
  }

  const { room, player } = ctx;
  if (!room || !player) return;
  player.lastSeen = Date.now();

  switch (t) {
    case C2S.INPUT: if (player.inputs.length < 24) player.inputs.push(d); break;
    case C2S.READY: player.ready = !!d.v; room.broadcast(S2C.ROOM, room.roomState()); break;
    case C2S.START: room.startRun(); break;
    case C2S.ACT: room.action(player, d); break;
    case C2S.CHAT: room.broadcast(S2C.CHAT, { id: player.id, name: player.name, text: String(d.text || '').slice(0, 160) }); break;
    case C2S.EMOTE: room.event('emote', { id: player.id, k: String(d.k || '').slice(0, 12) }); break;
    case C2S.COSMETIC:
      player.cosmetics = d.c || {};
      player.pack = d.pack || player.pack;
      room.broadcast(S2C.ROOM, room.roomState());
      break;
    case C2S.NAME: player.name = String(d.name || 'Climber').slice(0, 16); room.broadcast(S2C.ROOM, room.roomState()); break;
    case C2S.LEAVE: room.removePlayer(player); ctx.room = null; ctx.player = null; break;
  }
}

function join(link, ctx, room, d) {
  const token = d.token || `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const id = 'p' + (idSeq++);
  const p = room.addPlayer(link, { id, token, name: d.name, cosmetics: d.cosmetics });
  if (!p) { link.send(S2C.ERROR, { msg: 'That room is full' }); return; }
  if (d.pack) p.pack = d.pack;
  ctx.room = room; ctx.player = p;
  link.send(S2C.WELCOME, { id, token, room: room.roomState(), seed: room.seed, resumed: false });
  room.broadcast(S2C.ROOM, room.roomState());
}

export function dropConnection(ctx) {
  if (ctx.room && ctx.player) ctx.room.dropPlayer(ctx.player);
}
