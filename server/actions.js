/* Every verb a player can perform. The client only ever *requests* these; the
 * server checks range, ownership, weight and state before anything happens. */
import {
  ACT, ITEMS, PACKS, inventoryWeight, consume, addStatus, SURVIVAL, PLAYER, STAMINA,
} from './shared.js';
import { addToInventory, removeFromInventory, makeDrop } from './loot.js';

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const near = (a, b, r) => dist(a, b) <= r;

export function handleAction(room, p, d) {
  const type = d.a;
  const H = HANDLERS[type];
  if (!H) return;
  if (p.vitals.dead && type !== ACT.PING && type !== ACT.HORN) return;
  H(room, p, d);
}

const HANDLERS = {
  [ACT.PICKUP](room, p, d) {
    const it = room.items.get(d.id);
    if (!it || it.taken || !near(p.move, it, PLAYER.reach + 1.4)) return;
    const pack = PACKS[p.pack] || PACKS.none;
    if (!it.open) {
      it.open = true;
      room.event('open', { id: it.id, by: p.id, kind: it.kind });
      return;
    }
    let anyTaken = false;
    const cap = pack.capacity;
    for (let i = it.contents.length - 1; i >= 0; i--) {
      const c = it.contents[i];
      if (inventoryWeight(p.inv) + (ITEMS[c.id]?.kg || 0) > cap) continue;
      const res = addToInventory(p.inv, pack, c.id, c.n);
      if (res.added > 0) {
        anyTaken = true;
        c.n -= res.added;
        if (c.n <= 0) it.contents.splice(i, 1);
      }
    }
    if (!it.contents.length) { it.taken = true; room.items.delete(it.id); }
    if (anyTaken) { p.stats.items++; room.event('pickup', { by: p.id, id: it.id }); room.itemsDirty = true; }
    else room.tell(p, 'note', { text: 'Pack is full or too heavy' });
  },

  [ACT.DROP](room, p, d) {
    const got = removeFromInventory(p.inv, d.slot | 0, d.n || 1);
    if (!got) return;
    const drop = makeDrop(got.id, got.n, p.move.x + Math.sin(p.move.yaw) * -0.9, p.move.y + 0.4, p.move.z + Math.cos(p.move.yaw) * -0.9);
    drop.y = room.world.height(drop.x, drop.z) + 0.25;
    room.items.set(drop.id, drop);
    room.itemsDirty = true;
  },

  [ACT.USE](room, p, d) {
    const slot = p.inv[d.slot | 0];
    if (!slot) return;
    const def = ITEMS[slot.id];
    if (!def) return;
    const use = def.use;
    if (use === 'anchor') return HANDLERS[ACT.ANCHOR](room, p, { slot: d.slot });
    if (use === 'piton') return HANDLERS[ACT.PITON](room, p, { slot: d.slot });
    if (use === 'grapple') return HANDLERS[ACT.GRAPPLE](room, p, { slot: d.slot });
    if (use === 'zipline') return HANDLERS[ACT.ZIPLINE](room, p, { slot: d.slot });
    if (use === 'chalk') {
      p.chalkT = 45; removeFromInventory(p.inv, d.slot | 0, 1);
      room.event('chalk', { by: p.id }); return;
    }
    if (use === 'flare') {
      const f = { id: 'f' + room.seqId++, x: p.move.x, y: p.move.y + 0.2, z: p.move.z, t: 70 };
      room.flares.push(f); removeFromInventory(p.inv, d.slot | 0, 1);
      room.event('flare', f); return;
    }
    if (use === 'bugle') return HANDLERS[ACT.HORN](room, p, d);

    const roll = room.rand();
    const { ok, events } = consume(p.vitals, def, roll);
    if (!ok) return;
    for (const e of events) {
      if (e.startsWith('stamina:')) p.move.stamina = Math.min(STAMINA.max, p.move.stamina + Number(e.split(':')[1]));
    }
    removeFromInventory(p.inv, d.slot | 0, 1);
    p.stats.items++;
    room.event('use', { by: p.id, item: slot.id, events });
  },

  [ACT.GIVE](room, p, d) {
    const to = room.players.get(d.to);
    const slot = p.inv[d.slot | 0];
    if (!to || !slot || !near(p.move, to.move, 3.2)) return;
    const pack = PACKS[to.pack] || PACKS.none;
    if (inventoryWeight(to.inv) + (ITEMS[slot.id]?.kg || 0) > pack.capacity) {
      room.tell(p, 'note', { text: to.name + "'s pack is full" }); return;
    }
    const res = addToInventory(to.inv, pack, slot.id, 1);
    if (res.added) { removeFromInventory(p.inv, d.slot | 0, 1); room.event('give', { by: p.id, to: to.id, item: slot.id }); }
  },

  [ACT.ANCHOR](room, p, d) {
    const idx = d.slot != null ? d.slot | 0 : p.inv.findIndex((s) => s.id === 'rope');
    if (idx < 0 || p.inv[idx]?.id !== 'rope') return;
    const a = { id: 'a' + room.seqId++, kind: 'rope', x: p.move.x, y: p.move.y, z: p.move.z, by: p.id, len: 22, t: 0 };
    room.anchors.push(a);
    removeFromInventory(p.inv, idx, 1);
    room.event('anchor', a);
  },

  [ACT.PITON](room, p, d) {
    const idx = d.slot != null ? d.slot | 0 : p.inv.findIndex((s) => s.id === 'piton' || s.id === 'spike');
    const slot = p.inv[idx];
    if (!slot || (slot.id !== 'piton' && slot.id !== 'spike')) return;
    const a = { id: 'a' + room.seqId++, kind: slot.id, x: p.move.x, y: p.move.y, z: p.move.z, by: p.id, len: 5.5, t: 0 };
    room.anchors.push(a);
    removeFromInventory(p.inv, idx, 1);
    room.event('anchor', a);
  },

  [ACT.GRAPPLE](room, p, d) {
    const idx = d.slot != null ? d.slot | 0 : p.inv.findIndex((s) => s.id === 'grapple');
    if (idx < 0 || p.inv[idx]?.id !== 'grapple') return;
    const hit = raycastTerrain(room.world, p.move, 34);
    if (!hit) { room.tell(p, 'note', { text: 'Nothing in range' }); return; }
    p.grapple = { x: hit.x, y: hit.y + 0.4, z: hit.z, t: 0, dur: 0.85 };
    room.event('grapple', { by: p.id, x: hit.x, y: hit.y, z: hit.z });
  },

  [ACT.ZIPLINE](room, p, d) {
    const idx = d.slot != null ? d.slot | 0 : p.inv.findIndex((s) => s.id === 'zipline');
    if (idx < 0 || p.inv[idx]?.id !== 'zipline') return;
    if (!p.zipStart) {
      p.zipStart = { x: p.move.x, y: p.move.y + 1.4, z: p.move.z };
      room.tell(p, 'note', { text: 'Anchor set — walk to the far side and use it again' });
      return;
    }
    const b = { x: p.move.x, y: p.move.y + 1.4, z: p.move.z };
    const len = dist(p.zipStart, b);
    if (len < 8) { room.tell(p, 'note', { text: 'Too short' }); return; }
    if (len > 120) { room.tell(p, 'note', { text: 'Too long — the wire will not reach' }); return; }
    const z = { id: 'z' + room.seqId++, a: p.zipStart, b, by: p.id };
    room.ziplines.push(z);
    p.zipStart = null;
    removeFromInventory(p.inv, idx, 1);
    room.event('zipline', z);
  },

  [ACT.GRAB_PLAYER](room, p, d) {
    const t = room.players.get(d.id);
    if (!t || t === p || !near(p.move, t.move, 2.6)) return;
    if (!t.vitals.downed && !t.vitals.dead) return;
    if (t.carriedBy) return;
    p.carrying = t.id; t.carriedBy = p.id;
    room.event('grab', { by: p.id, id: t.id });
  },
  [ACT.RELEASE_PLAYER](room, p) {
    const t = room.players.get(p.carrying);
    if (t) t.carriedBy = null;
    p.carrying = null;
  },

  [ACT.BOOST](room, p, d) {
    const t = room.players.get(d.id);
    if (!t || t === p || !near(p.move, t.move, 2.8)) return;
    if (p.move.stamina < 14) { room.tell(p, 'note', { text: 'Not enough left in the legs' }); return; }
    p.move.stamina -= 14;
    t.boostT = 0.55;
    p.stats.boosts++;
    room.event('boost', { by: p.id, id: t.id });
  },

  [ACT.REVIVE](room, p, d) {
    const t = room.players.get(d.id);
    if (!t || !t.vitals.downed || !near(p.move, t.move, 2.4)) return;
    t.vitals.reviving = p.id;
    t.reviveHold = 0.35;
    p.stats.revives += d.done ? 1 : 0;
  },

  [ACT.ROPE_THROW](room, p, d) {
    const idx = p.inv.findIndex((s) => s.id === 'rope');
    const t = room.players.get(d.id);
    if (idx < 0 || !t || t === p || dist(p.move, t.move) > 30) return;
    removeFromInventory(p.inv, idx, 1);
    t.ropeT = 16;
    p.stats.assists++;
    room.event('ropethrow', { by: p.id, id: t.id });
  },

  [ACT.CAMP](room, p) {
    const c = room.world.campfires.find((f) => near(p.move, f, 7));
    if (!c) return;
    if (!room.camps[c.index]) {
      room.camps[c.index] = true;
      room.checkpoint = Math.max(room.checkpoint, c.index + 1);
      // lighting a fire brings the ghosts back
      for (const q of room.players.values()) {
        if (q.vitals.dead) {
          q.vitals.dead = false; q.vitals.ghost = false; q.vitals.downed = false;
          q.vitals.hp = 55; q.vitals.downedHp = SURVIVAL.downedHp;
          q.move.x = c.x + (room.rand() - 0.5) * 3; q.move.z = c.z + (room.rand() - 0.5) * 3;
          q.move.y = room.world.height(q.move.x, q.move.z);
          q.move.vx = q.move.vy = q.move.vz = 0;
          room.event('respawn', { id: q.id, at: c.index });
        }
      }
      room.event('camp', { index: c.index, by: p.id });
    }
  },

  [ACT.BOARD_HELI](room, p) {
    if (!room.heli || room.heli.state !== 'landed') return;
    if (!near(p.move, room.heli, 9)) return;
    p.boarded = true;
    room.event('board', { id: p.id });
  },

  [ACT.PING](room, p, d) {
    const m = { id: 'm' + room.seqId++, x: +d.x || 0, y: +d.y || 0, z: +d.z || 0, by: p.id, t: 14, kind: d.kind || 'mark' };
    room.marks.push(m);
    room.event('mark', m);
  },

  [ACT.HORN](room, p, d) {
    if (p.hornCd > 0) return;
    p.hornCd = 4;
    const idx = p.inv.findIndex((s) => s.id === 'bugle');
    room.event('horn', { by: p.id, x: p.move.x, y: p.move.y, z: p.move.z, big: idx >= 0 });
  },
};

/** Steps a ray along the look direction and returns the first terrain hit. */
export function raycastTerrain(world, m, maxDist) {
  const dx = -Math.sin(m.yaw) * Math.cos(m.pitch);
  const dy = Math.sin(m.pitch);
  const dz = -Math.cos(m.yaw) * Math.cos(m.pitch);
  let t = 0.6;
  const stepLen = 0.55;
  let px = m.x, py = m.y + PLAYER.eye, pz = m.z;
  while (t < maxDist) {
    const x = px + dx * t, y = py + dy * t, z = pz + dz * t;
    if (y <= world.height(x, z)) return { x, y: world.height(x, z), z, dist: t };
    t += stepLen;
  }
  return null;
}
