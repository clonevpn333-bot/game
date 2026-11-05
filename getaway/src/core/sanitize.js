// GETAWAY! — state sanitizer. Runs every frame after the simulation: anything whose position/velocity became NaN or
// infinite, or that fell out of the world, is put back to its last good state (the player, their car, mission
// vehicles) or removed (traffic, debris, pedestrians). A single bad number used to spread into the camera and the
// renderer and look like a frozen or black screen.
import { G } from './context.js';
import { Guard } from './guard.js';

const fin = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
const sane = (v, lim = 6000) => fin(v) && Math.abs(v.x) < lim && Math.abs(v.z) < lim && v.y > -80 && v.y < 3000;
const MAXV = 140; // m/s: nothing in the game should move faster than this
let t = 0;

function fixVehicle(v) {
  const ok = sane(v.pos) && fin(v.vel) && Number.isFinite(v.yaw) && Number.isFinite(v.pitch || 0) && Number.isFinite(v.roll || 0) && Number.isFinite(v.speed || 0);
  if (ok) {
    const sp = v.vel.length(); if (sp > MAXV) v.vel.multiplyScalar(MAXV / sp);
    if (Math.abs(v.yawRate || 0) > 12) v.yawRate = Math.sign(v.yawRate) * 12;
    if (v.mode === 'drive' && (t % 0.5) < G.dt) v._good = { x: v.pos.x, y: v.pos.y, z: v.pos.z, yaw: v.yaw };
    return;
  }
  const important = v.isPlayer || v.keep || G.player.vehicle === v;
  if (!important || !v._good) { if (!v.isPlayer && G.player.vehicle !== v) { Guard.note(`removed broken vehicle ${v.type}`); G.vehicles.remove(v); return; } }
  const g = v._good || { x: G.player.pos.x, y: G.player.pos.y + 1, z: G.player.pos.z, yaw: 0 };
  if (v.rigid) { try { G.rigid.remove(v.rigid); } catch (e) {} v.rigid = null; }
  v.mode = 'drive'; v.pos.set(g.x, g.y + 0.6, g.z); v.vel.set(0, 0, 0); v.yaw = Number.isFinite(g.yaw) ? g.yaw : 0; v.yawRate = 0; v.pitch = 0; v.roll = 0; v.pitchV = 0; v.rollV = 0; v.speed = 0; v.flipped = false; v.airborne = false;
  Guard.note(`restored ${v.type} to its last good position`);
}

export function sanitize(dt) {
  t += dt;
  for (const v of [...G.vehicles.list]) fixVehicle(v);
  // physics debris
  for (const b of [...G.rigid.bodies]) if (b.kind !== 'vehicle' && (!fin(b.pos) || !fin(b.vel) || b.pos.y < -80)) G.rigid.remove(b);
  // the player on foot
  const P = G.player;
  if (!P.vehicle) {
    if (sane(P.pos) && fin(P.vel)) { if ((t % 0.5) < dt && !P.swimming && P.alive) P._good = P.pos.clone(); }
    else { const g = P._good || P.pos.set(0, 0.2, 0); Guard.note('player restored to last good position'); P.teleport(g.x, g.y + 0.5, g.z, 0); }
  }
  // pedestrians / combatants: remove broken ones (they are not essential)
  if (G.peds) for (const p of [...G.peds.list]) if (!sane(p.pos)) { G.peds.remove(p); if (p.human) p.human.visible = false; }
  if (G.npcs) for (const n of [...G.npcs.list]) if (!sane(n.pos)) { n.alive = false; if (n.dispose) n.dispose(); G.npcs.list.splice(G.npcs.list.indexOf(n), 1); Guard.note('removed broken npc'); }
}

// last line of defence for the view: a NaN camera renders nothing (looks like a freeze)
export function sanitizeCamera() {
  const c = G.camera; const q = c.quaternion;
  if (fin(c.position) && Number.isFinite(q.x + q.y + q.z + q.w)) return;
  const f = G.player.vehicle ? G.player.vehicle.pos : G.player.pos; const s = sane(f) ? f : { x: 0, y: 2, z: 0 };
  c.position.set(s.x, s.y + 4, s.z - 8); c.quaternion.identity(); c.lookAt(s.x, s.y + 1, s.z); if (G.cam && G.cam.pos) G.cam.pos.copy(c.position);
  Guard.note('camera restored');
}
