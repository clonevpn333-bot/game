import { h, icon } from '../ui/dom.js';
import { coverCanvas } from '../art.js';
import { gameById, games } from '../manifest.js';
import { rail } from '../ui/rail.js';
import { isFavorite, toggleFavorite, playCount, lastPlayed } from '../store.js';
import { toast } from '../ui/toast.js';

const ago = (ts) => {
  if (!ts) return 'Never';
  const d = (Date.now() - ts) / 86400000;
  if (d < 1 / 24) return 'Just now';
  if (d < 1) return `${Math.round(d * 24)}h ago`;
  if (d < 30) return `${Math.round(d)}d ago`;
  return new Date(ts).toLocaleDateString();
};

export function detailView(ctx, id) {
  const g = gameById(id);
  if (!g) return h('div', { class: 'view empty' }, h('h2', { class: 'serif' }, 'Game not found'),
    h('p', {}, 'It may have been removed from the manifest.'));

  const favBtn = h('button', {
    class: 'btn' + (isFavorite(g.id) ? ' btn--primary' : ' btn--ghost'),
    onclick: () => {
      const on = toggleFavorite(g.id);
      favBtn.className = 'btn' + (on ? ' btn--primary' : ' btn--ghost');
      toast(on ? 'Added to favourites' : 'Removed from favourites');
      document.dispatchEvent(new CustomEvent('nova:favchange'));
    },
  }, icon('heart'), isFavorite(g.id) ? 'In favourites' : 'Add to favourites');

  const related = games().filter((x) => x.id !== g.id && (x.category === g.category ||
    (x.tags || []).some((t) => (g.tags || []).includes(t))));

  const root = h('div', { class: 'view detail' },
    h('div', { class: 'detail__art' }, coverCanvas(g, 1440, 820)),
    h('div', { class: 'detail__body' },
      h('button', { class: 'btn btn--ghost', onclick: () => ctx.go.to('') }, icon('arrowL'), 'Library'),
      h('div', { class: 'eyebrow', style: { marginTop: '26px' } }, g.category),
      h('h1', { class: 'detail__title' }, g.title),
      h('p', { class: 'hero__blurb' }, g.tagline),
      h('div', { class: 'hero__cta' },
        h('button', { class: 'btn btn--primary', onclick: () => ctx.go.to(`play/${g.id}`) }, icon('play'), 'Play'),
        favBtn,
        h('button', {
          class: 'btn btn--ghost',
          onclick: async () => {
            try { await navigator.clipboard.writeText(ctx.go.url(`g/${g.id}`)); toast('Game link copied'); }
            catch { toast('Copy failed'); }
          },
        }, icon('link'), 'Copy link')),
      h('div', { class: 'detail__grid' },
        h('div', {},
          h('p', { class: 'detail__desc' }, g.description || g.tagline),
          h('div', { class: 'tags' }, (g.tags || []).map((t) => h('span', { class: 'chip' }, t)))),
        h('div', {},
          h('div', { class: 'facts' },
            h('div', { class: 'fact' }, h('b', {}, 'Players'), h('span', {}, g.players || '1 player')),
            h('div', { class: 'fact' }, h('b', {}, 'Session'), h('span', {}, g.duration || '—')),
            h('div', { class: 'fact' }, h('b', {}, 'Controls'), h('span', {}, g.controls || 'Keyboard')),
            h('div', { class: 'fact' }, h('b', {}, 'Added'), h('span', {}, g.added || '—')),
            h('div', { class: 'fact' }, h('b', {}, 'Your plays'), h('span', {}, String(playCount(g.id)))),
            h('div', { class: 'fact' }, h('b', {}, 'Last played'), h('span', {}, ago(lastPlayed(g.id)))))))));

  const rel = rail('More like this', related.slice(0, 12), { go: ctx.go });
  if (rel) root.append(h('div', { style: { paddingTop: '24px' } }, rel));
  return root;
}
