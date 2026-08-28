/* One authoritative simulation tick for every player in a room. */
import {
  step, newModifiers, statusModifiers, tickVitals, damage, fallDamage, restAtFire,
  PLAYER, PHASE, STAMINA, SURVIVAL, BIOMES, biomeIndexAt, inventoryWeight, PACKS, FLIGHT,
} from './shared.js';

const BTN = { JUMP: 1, SPRINT: 2, GRAB: 4, USE: 8 };
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

export function simulate(room, dt) {
  for (const p of room.players.values()) {
    p.hornCd = Math.max(0, p.hornCd - dt);
    p.chalkT = Math.max(0, p.chalkT - dt);
    p.ropeT = Math.max(0, p.ropeT - dt);
    p.boostT = Math.max(0, p.boostT - dt);
    if (p.reviveHold > 0) { p.reviveHold -= dt; if (p.reviveHold <= 0) p.vitals.reviving = null; }
    else if (p.vitals.reviving) p.vitals.reviving = null;
  }

  for (const p of room.players.values()) {
    if (room.phase === PHASE.FLIGHT && p.inPlane) { rideThePlane(room, p, dt); continue; }
    if (p.carriedBy) { dragged(room, p, dt); continue; }
    stepPlayer(room, p, dt);
  }

  for (const p of room.players.values()) {
    if (p.vitals.dead && !p.vitals.ghost) p.vitals.ghost = true;
    if (room.phase === PHASE.CLIMB || room.phase === PHASE.EXTRACT) tickSurvival(room, p, dt);
    p.stats.peak = Math.max(p.stats.peak, p.move.y);
  }

  room.peak = Math.max(room.peak, ...[...room.players.values()].map((p) => p.move.y));
  decay(room, dt);
}

function inputsFor(p, dt) {
  const out = [];
  let budget = Math.min(0.12, dt * 3.2);
  while (p.inputs.length && budget > 0) {
    const inp = p.inputs.shift();
    const d = Math.min(0.05, Math.max(0.002, inp.dt || dt));
    budget -= d;
    p.ack = inp.q;
    out.push({ ...inp, dt: d });
  }
  if (!out.length) out.push({ q: p.ack, dt, mv: { x: 0, y: 0 }, yaw: p.move.yaw, pitch: p.move.pitch, btn: p.lastBtn || 0 });
  return out;
}

function buildMods(room, p) {
  const mod = newModifiers();
  statusModifiers(p.vitals, mod);
  mod.ghost = p.vitals.ghost;
  mod.mass = inventoryWeight(p.inv);
  const biome = BIOMES[biomeIndexAt(p.move.y)];
  mod.grip = biome.grip * (p.chalkT > 0 ? 1.28 : 1);
  mod.chalk = p.chalkT > 0 ? 1 : 0;

  let rope = p.ropeT > 0 ? 1 : 0;
  for (const a of room.anchors) {
    if (dist3(p.move, a) < a.len) { rope = Math.max(rope, a.kind === 'rope' ? 1 : 0.55); break; }
  }
  mod.rope = rope;

  const fire = room.world.campfires.find((f, i) => room.camps[i] && dist3(p.move, f) < 7);
  mod.nearFire = !!fire;
  p.nearFire = fire ? fire.index : -1;

  if (p.boostT > 0) mod.boost = p.move.climbing ? 2.4 : 7.4;
  const pack = PACKS[p.pack] || PACKS.none;
  mod.speed *= pack.speed;
  return mod;
}

function stepPlayer(room, p, dt) {
  const mod = buildMods(room, p);
  const phase = room.phase === PHASE.DIVE || (room.phase === PHASE.FLIGHT && !p.inPlane) ? PHASE.DIVE : room.phase;
  const onField = room.phase === PHASE.LOBBY || room.phase === PHASE.RESULTS;
  const world = onField ? room.flatWorld : room.world;

  if (p.grapple) {
    p.grapple.t += dt;
    const k = Math.min(1, p.grapple.t / p.grapple.dur);
    const e = 1 - Math.pow(1 - k, 3);
    p.move.x += (p.grapple.x - p.move.x) * e * 0.55;
    p.move.y += (p.grapple.y - p.move.y) * e * 0.55;
    p.move.z += (p.grapple.z - p.move.z) * e * 0.55;
    p.move.vx = p.move.vy = p.move.vz = 0;
    p.move.stamina = Math.max(0, p.move.stamina - 6 * dt);
    if (k >= 1) { p.grapple = null; p.move.y = room.world.height(p.move.x, p.move.z); }
    p.anim = 'grapple';
    return;
  }

  if (p.riding) {
    const z = p.riding.zip;
    p.riding.t += dt * (14 / Math.max(1, Math.hypot(z.b.x - z.a.x, z.b.y - z.a.y, z.b.z - z.a.z)));
    const k = Math.min(1, p.riding.t);
    p.move.x = z.a.x + (z.b.x - z.a.x) * k;
    p.move.y = z.a.y + (z.b.y - z.a.y) * k - 1.1;
    p.move.z = z.a.z + (z.b.z - z.a.z) * k;
    p.move.vx = p.move.vy = p.move.vz = 0;
    p.anim = 'zip';
    if (k >= 1) { p.riding = null; p.move.y = room.world.height(p.move.x, p.move.z); }
    return;
  }

  for (const inp of inputsFor(p, dt)) {
    p.lastBtn = inp.btn;
    const input = {
      mv: { x: clamp1(inp.mv?.x), y: clamp1(inp.mv?.y) },
      yaw: Number.isFinite(inp.yaw) ? inp.yaw : p.move.yaw,
      pitch: Math.max(-1.5, Math.min(1.5, inp.pitch || 0)),
      jump: !!(inp.btn & BTN.JUMP), sprint: !!(inp.btn & BTN.SPRINT), grab: !!(inp.btn & BTN.GRAB),
      dt: inp.dt,
    };
    step(p.move, input, world, mod, phase);

    if (p.move.impact > 0) {
      const dmg = fallDamage(p.move.impact);
      if (dmg > 0) {
        damage(p.vitals, dmg, room.eventSink(p));
        p.stats.falls++;
        room.event('fall', { id: p.id, d: Math.round(dmg) });
        if (dmg > 22) p.vitals.status.injury = 0;
      }
    }
    // zipline mount
    if (input.grab && !p.riding) {
      for (const z of room.ziplines) {
        if (dist3(p.move, z.a) < 3.2) { p.riding = { zip: z, t: 0 }; break; }
        if (dist3(p.move, z.b) < 3.2) { p.riding = { zip: { a: z.b, b: z.a }, t: 0 }; break; }
      }
    }
  }
  if (onField) {
    const r = Math.hypot(p.move.x, p.move.z);
    if (r > 74) { const k = 74 / r; p.move.x *= k; p.move.z *= k; p.move.vx = 0; p.move.vz = 0; }
  }
  p.anim = animFor(p);
}

function clamp1(v) { v = Number(v) || 0; return v < -1 ? -1 : v > 1 ? 1 : v; }

function animFor(p) {
  const m = p.move;
  if (p.vitals.ghost) return 'ghost';
  if (p.vitals.downed) return 'downed';
  if (m.chute) return 'chute';
  if (!m.onGround && !m.climbing && m.vy < -9) return 'fall';
  if (m.climbing) return Math.hypot(m.vx, m.vz) > 0.15 ? 'climb' : 'hang';
  if (m.swimming) return 'swim';
  if (!m.onGround) return 'air';
  const sp = Math.hypot(m.vx, m.vz);
  if (p.carrying) return sp > 0.4 ? 'carrywalk' : 'carryidle';
  if (sp > 5.4) return 'run';
  if (sp > 0.5) return 'walk';
  return m.exhausted ? 'tired' : 'idle';
}

function dragged(room, p, dt) {
  const c = room.players.get(p.carriedBy);
  if (!c) { p.carriedBy = null; return; }
  const bx = c.move.x + Math.sin(c.move.yaw) * 1.15;
  const bz = c.move.z + Math.cos(c.move.yaw) * 1.15;
  p.move.x += (bx - p.move.x) * Math.min(1, dt * 9);
  p.move.z += (bz - p.move.z) * Math.min(1, dt * 9);
  p.move.y = room.world.height(p.move.x, p.move.z);
  p.move.yaw = c.move.yaw;
  p.anim = p.vitals.dead ? 'ghost' : 'dragged';
  c.stats.carried += dt;
}

function rideThePlane(room, p, dt) {
  const pl = room.plane;
  p.move.x = pl.x + (p.slot - 1.5) * 1.6;
  p.move.y = pl.y - 0.6;
  p.move.z = pl.z + (p.slot % 2 ? 1.4 : -1.4);
  p.move.vx = p.move.vy = p.move.vz = 0;
  p.anim = 'plane';
  // The door is open once the plane is over the water; jump to leave it.
  const canJump = room.phaseT > 7;
  for (const inp of inputsFor(p, dt)) {
    p.lastBtn = inp.btn;
    if (Number.isFinite(inp.yaw)) p.move.yaw = inp.yaw;
    if (Number.isFinite(inp.pitch)) p.move.pitch = inp.pitch;
    if (canJump && (inp.btn & BTN.JUMP)) {
      p.inPlane = false;
      p.move.vx = -Math.sin(pl.yaw) * 26; p.move.vz = -Math.cos(pl.yaw) * 26; p.move.vy = -2; p.move.diveT = 0;
      p.move.chute = false;
      room.event('jumped', { id: p.id });
      break;
    }
  }
}

function tickSurvival(room, p, dt) {
  const ctx = { altitude: p.move.y, climbing: p.move.climbing, nearFire: p.nearFire >= 0, warmthBoost: p.warmthT > 0 ? 26 : 0 };
  p.warmthT = Math.max(0, (p.warmthT || 0) - dt);
  const events = tickVitals(p.vitals, dt, ctx);
  for (const e of events) {
    if (e === 'died') { room.event('death', { id: p.id }); p.stats.deaths++; }
    else if (e === 'downed') room.event('downed', { id: p.id });
    else if (e === 'revived') room.event('revived', { id: p.id });
    else if (e === 'cold' || e === 'burning') room.event('status', { id: p.id, s: e });
  }
  if (p.nearFire >= 0) restAtFire(p.vitals, p.move, dt);
}

function decay(room, dt) {
  for (let i = room.marks.length - 1; i >= 0; i--) { room.marks[i].t -= dt; if (room.marks[i].t <= 0) room.marks.splice(i, 1); }
  for (let i = room.flares.length - 1; i >= 0; i--) { room.flares[i].t -= dt; if (room.flares[i].t <= 0) room.flares.splice(i, 1); }
}
