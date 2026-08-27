/* Room registry: codes, creation, lookup, reaping. */
import { Room } from './room.js';
import { ROOM, MAX_PLAYERS } from './shared.js';

const rooms = new Map();

function makeCode() {
  const A = ROOM.codeAlphabet;
  let c;
  do {
    c = '';
    for (let i = 0; i < ROOM.codeLen; i++) c += A[Math.floor(Math.random() * A.length)];
  } while (rooms.has(c));
  return c;
}

export function createRoom(seed) {
  const code = makeCode();
  const room = new Room(code, seed ?? (Math.random() * 0xffffffff) >>> 0);
  rooms.set(code, room);
  return room;
}

export const getRoom = (code) => rooms.get(String(code || '').toUpperCase().trim());
export const allRooms = () => [...rooms.values()];
export const roomCount = () => rooms.size;

export function findRoomByToken(token) {
  for (const room of rooms.values()) for (const p of room.players.values()) if (p.token === token) return { room, player: p };
  return null;
}

export function canJoin(room) {
  return room && room.players.size < MAX_PLAYERS;
}

/** Drops rooms that have been empty for a while. */
export function reap() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const anyone = [...room.players.values()].some((p) => p.connected);
    if (!anyone) {
      room.emptySince = room.emptySince || now;
      if (now - room.emptySince > 5 * 60 * 1000) rooms.delete(code);
    } else room.emptySince = 0;
  }
}
