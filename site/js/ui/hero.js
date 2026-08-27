import { h, icon, clear } from './dom.js';
import { coverCanvas } from '../art.js';
import { isFavorite, toggleFavorite } from '../store.js';
import { categories } from '../manifest.js';

/* Auto-advancing featured hero. Pauses on hover/focus, dots are clickable. */
export function hero(list, { go }) {
  const artHost = h('div', { class: 'hero__art' });
  const body = h('div', { class: 'hero__body' });
  const dots = h('div', { class: 'hero__dots' });
  const root = h('section', { class: 'hero' }, artHost, body, dots);

  let idx = 0, timer = null, paused = false;

  function paint(i, animate = true) {
    idx = (i + list.length) % list.length;
    const g = list[idx];
    clear(artHost).append(coverCanvas(g, 1280, 800));
    clear(body).append(
      h('div', { class: 'eyebrow' }, g.spotlight ? 'Flagship title' : 'Featured'),
      h('h1', { class: 'hero__title' }, g.title),
      h('div', { class: 'hero__meta' },
        h('span', {}, categories().find((c) => c.id === g.category)?.label || g.category), h('i'),
        h('span', {}, g.players || '1 player'), h('i'),
        h('span', {}, g.duration || 'Quick play')),
      h('p', { class: 'hero__blurb' }, g.tagline),
      h('div', { class: 'hero__cta' },
        h('button', { class: 'btn btn--primary', onclick: () => go.to(`play/${g.id}`) }, icon('play'), 'Play now'),
        h('button', { class: 'btn btn--ghost', onclick: () => go.to(`g/${g.id}`) }, 'Details'),
        h('button', {
          class: 'btn btn--ghost btn--icon', 'aria-label': 'Favourite',
          onclick: (e) => {
            const on = toggleFavorite(g.id);
            e.currentTarget.style.color = on ? 'var(--accent)' : '';
            document.dispatchEvent(new CustomEvent('nova:favchange'));
          },
          style: { color: isFavorite(g.id) ? 'var(--accent)' : '' },
        }, icon('heart'))));
    if (animate) { body.classList.remove('view'); void body.offsetWidth; body.classList.add('view'); }
    [...dots.children].forEach((d, j) => d.setAttribute('aria-current', String(j === idx)));
  }

  list.forEach((_, i) => dots.append(h('button', {
    class: 'hero__dot', 'aria-label': `Featured ${i + 1}`,
    onclick: () => { paint(i); restart(); },
  })));

  function restart() {
    clearInterval(timer);
    if (list.length > 1) timer = setInterval(() => { if (!paused) paint(idx + 1); }, 8200);
  }
  root.addEventListener('pointerenter', () => { paused = true; });
  root.addEventListener('pointerleave', () => { paused = false; });

  paint(0, false);
  restart();
  root.destroy = () => clearInterval(timer);
  return root;
}
