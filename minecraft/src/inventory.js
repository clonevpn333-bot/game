// ============================================================================
//  Inventory: 9 hotbar + 27 main + 4 armor, plus mouse-held cursor stack
// ============================================================================
import { maxStack, itemDef } from './items.js';

export class Inventory {
  constructor() {
    this.slots = new Array(36).fill(null); // 0..8 hotbar, 9..35 main
    this.armor = new Array(4).fill(null);  // helmet, chest, legs, boots
    this.selected = 0;
    this.cursor = null; // {id,count,dmg?}
  }

  held() { return this.slots[this.selected]; }
  select(i) { this.selected = ((i % 9) + 9) % 9; }
  scroll(d) { this.select(this.selected + d); }

  countOf(id) {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return n;
  }

  addItem(id, count = 1) {
    const max = maxStack(id);
    // merge into existing
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id && s.count < max) {
        const add = Math.min(max - s.count, count);
        s.count += add; count -= add;
      }
    }
    // empty slots (hotbar first already by order)
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      if (!this.slots[i]) {
        const add = Math.min(max, count);
        this.slots[i] = { id, count: add }; count -= add;
      }
    }
    return count; // leftover
  }

  removeItem(id, count = 1) {
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const take = Math.min(s.count, count);
        s.count -= take; count -= take;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    return count === 0;
  }

  consumeHeld(n = 1) {
    const s = this.held();
    if (!s) return;
    s.count -= n;
    if (s.count <= 0) this.slots[this.selected] = null;
  }
  replaceHeld(id) { this.slots[this.selected] = id == null ? null : { id, count: 1 }; }

  damageHeld(n = 1) {
    const s = this.held();
    if (!s) return;
    const d = itemDef(s.id);
    if (!d || !d.durability) return;
    s.dmg = (s.dmg || 0) + n;
    if (s.dmg >= d.durability) this.slots[this.selected] = null;
  }

  // give item to player, returns true if all fit
  give(id, count = 1) { return this.addItem(id, count) === 0; }

  serialize() {
    return {
      selected: this.selected,
      slots: this.slots.map(s => s ? [s.id, s.count, s.dmg || 0] : null),
      armor: this.armor.map(s => s ? [s.id, s.count, s.dmg || 0] : null),
    };
  }
  load(data) {
    if (!data) return;
    this.selected = data.selected || 0;
    this.slots = (data.slots || []).map(s => s ? { id: s[0], count: s[1], dmg: s[2] } : null);
    while (this.slots.length < 36) this.slots.push(null);
    this.armor = (data.armor || [null, null, null, null]).map(s => s ? { id: s[0], count: s[1], dmg: s[2] } : null);
  }

  armorValue() {
    let v = 0;
    for (const s of this.armor) if (s) { const d = itemDef(s.id); if (d && d.armor) v += d.armor; }
    return v;
  }
}
