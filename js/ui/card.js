import { h, icon } from './dom.js';
import { coverCanvas } from '../art.js';
import { isFavorite, toggleFavorite, playCount } from '../store.js';
import { isNew } from '../manifest.js';
import { toast } from './toast.js';

/* One game card. `variant`: 'poster' (3:4) or 'wide' (16:10). */
export function gameCard(game, { variant = 'poster', go, showProgress = false } = {}) {
  const wide = variant === 'wide';
  const art = h('div', { class: 'card__art' }, coverCanvas(game, wide ? 640 : 420, wide ? 400 : 560));

  const fav = h('button', {
    class: 'card__fav' + (isFavorite(game.id) ? ' is-on' : ''),
    'aria-label': 'Favourite ' + game.title,
    onclick: (e) => {
      e.preventDefault(); e.stopPropagation();
      const on = toggleFavorite(game.id);
      fav.classList.toggle('is-on', on);
      toast(on ? `${game.title} added to favourites` : `${game.title} removed`);
      document.dispatchEvent(new CustomEvent('nova:favchange'));
    },
  }, icon('heart'));

  const badge = game.spotlight ? h('span', { class: 'card__badge card__badge--new' }, 'Flagship')
    : isNew(game) ? h('span', { class: 'card__badge card__badge--new' }, 'New')
    : game.players?.includes('4') ? h('span', { class: 'card__badge' }, 'Co-op') : null;

  art.append(badge, fav, h('span', { class: 'card__play' }, icon('play'), 'Play'));

  const info = h('div', { class: 'card__info' },
    h('div', { class: 'card__name' }, game.title),
    h('div', { class: 'card__sub' }, game.tagline || game.category));

  if (showProgress) {
    const plays = playCount(game.id);
    info.append(h('div', { class: 'card__bar' },
      h('span', { style: { width: Math.min(100, 12 + plays * 14) + '%' } })));
  }

  return h('a', {
    class: 'card' + (wide ? ' card--wide' : ''),
    href: go.href(`g/${game.id}`),
    onclick: (e) => { e.preventDefault(); go.to(`g/${game.id}`); },
  }, art, info);
}
