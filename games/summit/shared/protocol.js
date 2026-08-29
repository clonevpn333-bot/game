/* Wire protocol. JSON with short keys — at 4 players and 15 Hz this is a few
 * KB/s, and being readable is worth more than the bytes. */
export const C2S = {
  HELLO: 'hi', CREATE: 'mk', JOIN: 'jn', LEAVE: 'lv', READY: 'rd',
  INPUT: 'in', ACT: 'ac', CHAT: 'ch', EMOTE: 'em', PING: 'pi',
  BUY: 'by', COSMETIC: 'cs', START: 'st', NAME: 'nm',
};
export const S2C = {
  WELCOME: 'we', ROOM: 'rm', SNAP: 'sn', EVENT: 'ev', PHASE: 'ph',
  CHAT: 'ch', PONG: 'po', ERROR: 'er', PROFILE: 'pf', RESULTS: 'rs', MARK: 'mk',
};

/** Actions a client can request; the server validates and applies all of them. */
export const ACT = {
  PICKUP: 'pickup', DROP: 'drop', USE: 'use', GIVE: 'give', SWAP: 'swap',
  ANCHOR: 'anchor', GRAPPLE: 'grapple', ZIPLINE: 'zipline', PITON: 'piton',
  GRAB_PLAYER: 'grabp', RELEASE_PLAYER: 'relp', BOOST: 'boost', REVIVE: 'revive',
  ROPE_THROW: 'rope', CAMP: 'camp', BOARD_HELI: 'heli', PING: 'mark', HORN: 'horn',
  RESPAWN_GHOST: 'ghost', TOGGLE_VIEW: 'view',
};

export const enc = (type, data) => JSON.stringify([type, data]);
export function dec(raw) {
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v) || typeof v[0] !== 'string') return null;
    return { t: v[0], d: v[1] ?? {} };
  } catch { return null; }
}

/** Compact player state written into every snapshot. */
export function packPlayer(p) {
  return {
    i: p.id, n: p.name, c: p.cosmetics,
    x: r2(p.move.x), y: r2(p.move.y), z: r2(p.move.z),
    a: r3(p.move.yaw), b: r3(p.move.pitch),
    s: r1(p.move.stamina), h: r1(p.vitals.hp),
    u: r1(p.vitals.hunger), t: r1(p.vitals.temp),
    f: flags(p), st: Object.keys(p.vitals.status),
    e: p.anim, k: p.carrying || null, g: p.heldItem || null,
    v: [r2(p.move.vx), r2(p.move.vy), r2(p.move.vz)],
  };
}
function flags(p) {
  return (p.move.climbing ? 1 : 0) | (p.move.onGround ? 2 : 0) | (p.vitals.downed ? 4 : 0) |
    (p.vitals.dead ? 8 : 0) | (p.move.chute ? 16 : 0) | (p.ready ? 32 : 0) |
    (p.connected ? 64 : 0) | (p.move.swimming ? 128 : 0) | (p.move.exhausted ? 256 : 0);
}
export const FLAG = { CLIMB: 1, GROUND: 2, DOWNED: 4, DEAD: 8, CHUTE: 16, READY: 32, ONLINE: 64, SWIM: 128, TIRED: 256 };

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const r3 = (v) => Math.round(v * 1000) / 1000;
