/* World items: what is lying on the mountain, who picked it up, what is inside
 * the crates and luggage. All authoritative. */
import { LOOT, ITEMS, stackMax, rng } from './shared.js';

const CONTAINERS = ['crate', 'luggage', 'bush', 'cache'];

export function spawnLoot(world, seed) {
  const r = rng(seed ^ 0x2545f491);
  const spots = world.lootSpots(104);
  const items = new Map();
  spots.forEach((s, i) => {
    const table = LOOT[Math.max(0, Math.min(LOOT.length - 1, s.biome))];
    const kind = s.rollA < 0.34 ? 'crate' : s.rollA < 0.6 ? 'luggage' : s.rollA < 0.86 ? 'bush' : 'cache';
    const n = kind === 'bush' ? 1 : kind === 'cache' ? 3 : 2;
    const contents = [];
    for (let k = 0; k < n; k++) {
      const id = table[Math.floor(r() * table.length)];
      const count = Math.min(stackMax(id), 1 + Math.floor(r() * (stackMax(id) > 1 ? 3 : 1)));
      contents.push({ id, n: count });
    }
    items.set(s.id, {
      id: s.id, kind, x: s.x, y: s.y, z: s.z,
      open: false, contents, taken: false, spin: r() * 6.28,
    });
  });
  return items;
}

/** Loose items dropped by players get their own ids. */
let dropSeq = 0;
export function makeDrop(itemId, n, x, y, z) {
  return { id: 'd' + (++dropSeq), kind: 'drop', x, y, z, open: true, contents: [{ id: itemId, n }], taken: false, spin: 0 };
}

export function packItems(items) {
  const out = [];
  for (const it of items.values()) {
    if (it.taken) continue;
    out.push([it.id, it.kind, Math.round(it.x * 10) / 10, Math.round(it.y * 10) / 10, Math.round(it.z * 10) / 10,
      it.open ? 1 : 0, it.contents.map((c) => c.id + ':' + c.n).join(',')]);
  }
  return out;
}

/** Inventory helpers — capacity is weight based, slots are per-pack. */
export function addToInventory(inv, packDef, id, n) {
  const max = stackMax(id);
  let left = n;
  for (const slot of inv) {
    if (slot.id === id && slot.n < max) {
      const room = Math.min(max - slot.n, left);
      slot.n += room; left -= room;
      if (left <= 0) return { added: n, full: false };
    }
  }
  while (left > 0 && inv.length < packDef.slots) {
    const take = Math.min(max, left);
    inv.push({ id, n: take }); left -= take;
  }
  return { added: n - left, full: left > 0 };
}

export function removeFromInventory(inv, slotIndex, n = 1) {
  const slot = inv[slotIndex];
  if (!slot) return null;
  const take = Math.min(slot.n, n);
  slot.n -= take;
  const id = slot.id;
  if (slot.n <= 0) inv.splice(slotIndex, 1);
  return { id, n: take };
}

export const describe = (it) => (it.contents || []).map((c) => `${ITEMS[c.id]?.name || c.id}${c.n > 1 ? ' ×' + c.n : ''}`).join(', ');
export { CONTAINERS };
