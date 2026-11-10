// Pixel-world physics: AABB bodies against the tile grid and moving solids.
// Bodies are positioned by their feet-centre (x, y = bottom).
import { T, TS, isSolid } from './tiles.js';

export function boxOf(b) { return { x: b.x - b.w / 2, y: b.y - b.h, w: b.w, h: b.h }; }
export function overlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function tileBlocksX(L, tx, y0, y1) {
  for (let ty = Math.floor(y0 / TS); ty <= Math.floor((y1 - 0.01) / TS); ty++) if (isSolid(L.get(tx, ty))) return true;
  return false;
}

export function moveBody(L, b, dt, solids = null) {
  if (b.riding) { b.x += b.riding.dx; b.y += b.riding.dy; b.riding = null; }
  const wasGround = b.onGround;
  b.onGround = false; b.hitCeil = false; b.wallDir = 0; b.groundTile = 0; b.crushed = false;

  // ---- X axis
  let dx = b.vx * dt, n = Math.max(1, Math.ceil(Math.abs(dx) / 7));
  for (let i = 0; i < n; i++) {
    b.x += dx / n;
    const top = b.y - b.h, bot = b.y;
    if (dx > 0) { const tx = Math.floor((b.x + b.w / 2) / TS); if (tileBlocksX(L, tx, top, bot) || (b.wallX != null && b.x + b.w / 2 > b.wallX)) { b.x = Math.min(tx * TS, b.wallX ?? 1e9) - b.w / 2 - 0.001; b.vx = 0; b.wallDir = 1; break; } }
    else if (dx < 0) { const tx = Math.floor((b.x - b.w / 2) / TS); if (tileBlocksX(L, tx, top, bot)) { b.x = (tx + 1) * TS + b.w / 2 + 0.001; b.vx = 0; b.wallDir = -1; break; } }
  }
  // ---- Y axis
  let dy = b.vy * dt; n = Math.max(1, Math.ceil(Math.abs(dy) / 7));
  for (let i = 0; i < n; i++) {
    const prevBot = b.y;
    b.y += dy / n;
    const x0 = Math.floor((b.x - b.w / 2) / TS), x1 = Math.floor((b.x + b.w / 2 - 0.01) / TS);
    if (dy >= 0) {
      const ty = Math.floor(b.y / TS); let hit = false;
      for (let tx = x0; tx <= x1; tx++) {
        const t = L.get(tx, ty);
        if (isSolid(t)) { hit = true; if (!b.groundTile || tx === Math.floor(b.x / TS)) { b.groundTile = t; b.groundTx = tx; b.groundTy = ty; } }
        else if ((t === T.ONEWAY || t === T.CRUMBLE) && prevBot <= ty * TS + 0.5 && !(b.dropT > 0 && t === T.ONEWAY)) { hit = true; if (!b.groundTile || tx === Math.floor(b.x / TS)) { b.groundTile = t; b.groundTx = tx; b.groundTy = ty; } }
      }
      if (hit) { b.y = ty * TS; b.vy = 0; b.onGround = true; break; }
    } else {
      const ty = Math.floor((b.y - b.h) / TS);
      for (let tx = x0; tx <= x1; tx++) if (isSolid(L.get(tx, ty))) { b.y = (ty + 1) * TS + b.h; b.vy = 0; b.hitCeil = true; break; }
      if (b.hitCeil) break;
    }
  }
  // ---- moving solids (lifts, crushers, gates, boss fists)
  if (solids) for (const s of solids) {
    if (s.off) continue;
    const bx = b.x - b.w / 2, by = b.y - b.h;
    if (!(bx < s.x + s.w && bx + b.w > s.x && by < s.y + s.h && b.y > s.y)) {
      // standing exactly on top?
      if (b.vy >= 0 && bx < s.x + s.w && bx + b.w > s.x && Math.abs(b.y - s.y) < 1.5 && !b.onGround) { b.y = s.y; b.vy = 0; b.onGround = true; b.riding = s; }
      continue;
    }
    const up = b.y - s.y, down = s.y + s.h - by, left = bx + b.w - s.x, right = s.x + s.w - bx;
    const m = Math.min(up, down, left, right);
    if (m === up && (b.vy >= 0 || s.dy < 0)) { b.y = s.y; if (b.vy > 0) b.vy = 0; b.onGround = true; b.riding = s; }
    else if (m === down) { b.y = s.y + s.h + b.h; if (b.vy < 0) b.vy = 0; if (wasGround || tileUnder(L, b)) b.crushed = true; }
    else if (left < right) { b.x = s.x - b.w / 2 - 0.01; b.wallDir = 1; if (tileBlocksX(L, Math.floor((b.x - b.w / 2) / TS), b.y - b.h, b.y)) b.crushed = true; }
    else { b.x = s.x + s.w + b.w / 2 + 0.01; b.wallDir = -1; if (tileBlocksX(L, Math.floor((b.x + b.w / 2) / TS), b.y - b.h, b.y)) b.crushed = true; }
  }
}
function tileUnder(L, b) { return isSolid(L.get(Math.floor(b.x / TS), Math.floor((b.y + 1) / TS))); }

// Is there a wall directly beside the body? (for wall slides)
export function touchingWall(L, b, dir) {
  const px = b.x + dir * (b.w / 2 + 1.5), tx = Math.floor(px / TS);
  return isSolid(L.get(tx, Math.floor((b.y - b.h + 4) / TS))) && isSolid(L.get(tx, Math.floor((b.y - 6) / TS)));
}
export function canStand(L, b, h) {
  const x0 = Math.floor((b.x - b.w / 2) / TS), x1 = Math.floor((b.x + b.w / 2 - 0.01) / TS), ty0 = Math.floor((b.y - h) / TS), ty1 = Math.floor((b.y - 0.01) / TS);
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(L.get(tx, ty))) return false;
  return true;
}
export function groundAhead(L, x, y) { const t = L.get(Math.floor(x / TS), Math.floor((y + 2) / TS)); return isSolid(t) || t === T.ONEWAY || t === T.CRUMBLE; }
export function solidAt(L, x, y) { return isSolid(L.get(Math.floor(x / TS), Math.floor(y / TS))); }
