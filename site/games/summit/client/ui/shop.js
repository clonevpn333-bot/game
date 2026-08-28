/* Cosmetics shop. Coins come from finished runs; everything is generated, so a
 * purchase just unlocks a description. */
import { h, clear, loadProfile, saveProfile } from './kit.js';
import { OUTFITS, HATS, PACKS_COSMETIC, SKIN_TONES } from '../char/cosmetics.js';

export class Shop {
  constructor(root, { onClose, onLook }) {
    this.profile = loadProfile();
    this.onLook = onLook;
    this.wallet = h('span', { class: 'wallet' }, this.profile.coins + ' coins');
    this.body = h('div', { class: 'list' });
    this.el = h('div', { class: 'screen' }, h('div', { class: 'card' },
      h('div', { class: 'row' },
        h('div', {}, h('div', { class: 'eyebrow' }, 'Airfield · outfitters'),
          h('h1', { style: { fontSize: '38px' } }, 'Kit up')),
        h('span', { style: { flex: '1' } }), this.wallet),
      h('div', { class: 'sep' }),
      this.body,
      h('div', { class: 'sep' }),
      h('div', { class: 'row row--end' },
        h('button', { class: 'btn btn--primary', onclick: () => { this.el.remove(); onClose?.(); } }, 'Done'))));
    root.append(this.el);
    this.render();
  }

  own(kind, id) { return (this.profile.owned[kind] || []).includes(id); }

  buy(kind, id, price) {
    if (this.own(kind, id)) { this.equip(kind, id); return; }
    if (this.profile.coins < price) return;
    this.profile.coins -= price;
    this.profile.owned[kind] = [...(this.profile.owned[kind] || []), id];
    this.equip(kind, id);
  }

  equip(kind, id) {
    this.profile.look[kind] = id;
    saveProfile(this.profile);
    this.wallet.textContent = this.profile.coins + ' coins';
    this.onLook?.(this.profile.look);
    this.render();
  }

  section(title, kind, table, swatch) {
    const tiles = h('div', { class: 'tiles' });
    for (const [id, def] of Object.entries(table)) {
      const owned = this.own(kind, id);
      const on = this.profile.look[kind] === id;
      tiles.append(h('div', {
        class: 'tile' + (on ? ' is-on' : '') + (owned || def.price === 0 ? '' : ' is-locked'),
        onclick: () => this.buy(kind, id, def.price || 0),
      },
        swatch ? h('div', { class: 'swatch', style: { background: swatch(def) } }) : null,
        h('div', { class: 'tile__name' }, def.name),
        h('div', { class: 'tile__price' }, on ? 'Equipped' : owned || !def.price ? 'Owned' : def.price + ' coins')));
    }
    return h('div', {}, h('h2', {}, title), h('div', { style: { height: '10px' } }), tiles, h('div', { style: { height: '18px' } }));
  }

  render() {
    clear(this.body);
    this.body.append(
      this.section('Outfits', 'outfit', OUTFITS, (d) => `linear-gradient(135deg, #${d.jacket.toString(16).padStart(6, '0')}, #${d.trousers.toString(16).padStart(6, '0')})`),
      this.section('Headwear', 'hat', HATS),
      this.section('Packs', 'pack', PACKS_COSMETIC),
      h('div', {}, h('h2', {}, 'Skin tone'), h('div', { style: { height: '10px' } }),
        h('div', { class: 'tiles' }, ...Array.from({ length: SKIN_TONES }, (_, i) => h('div', {
          class: 'tile' + (this.profile.look.tone === i ? ' is-on' : ''),
          onclick: () => this.equip('tone', i),
        }, h('div', { class: 'tile__name' }, 'Tone ' + (i + 1)))))),
    );
  }
}

/** Adds coins after a run and remembers the best height. */
export function awardRun(reward, peak) {
  const p = loadProfile();
  p.coins += Math.max(0, Math.round(reward));
  p.runs += 1;
  p.best = Math.max(p.best, Math.round(peak || 0));
  saveProfile(p);
  return p;
}
