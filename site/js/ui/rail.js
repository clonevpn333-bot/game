import { h, icon } from './dom.js';
import { gameCard } from './card.js';

/* Horizontal scrolling rail with keyboard/button paging. */
export function rail(title, list, opts = {}) {
  if (!list.length) return null;
  const track = h('div', { class: 'rail__track stagger' });
  list.forEach((g, i) => {
    const card = gameCard(g, opts);
    card.style.animationDelay = Math.min(i * 45, 400) + 'ms';
    track.append(card);
  });

  const page = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.82, behavior: 'smooth' });
  const prev = h('button', { class: 'btn btn--ghost btn--icon', 'aria-label': 'Scroll left', onclick: () => page(-1) }, icon('arrowL'));
  const next = h('button', { class: 'btn btn--ghost btn--icon', 'aria-label': 'Scroll right', onclick: () => page(1) }, icon('arrowR'));

  const sync = () => {
    prev.disabled = track.scrollLeft < 8;
    next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 8;
  };
  track.addEventListener('scroll', sync, { passive: true });
  requestAnimationFrame(sync);

  return h('section', { class: 'rail' + (opts.variant === 'wide' ? ' rail--wide' : '') },
    h('div', { class: 'rail__head' },
      h('h2', {}, title),
      h('span', { class: 'rail__count' }, String(list.length).padStart(2, '0')),
      h('div', { class: 'rail__nav' }, prev, next)),
    track);
}

export function grid(list, opts = {}) {
  const g = h('div', { class: 'grid stagger' });
  list.forEach((game, i) => {
    const card = gameCard(game, opts);
    card.style.animationDelay = Math.min(i * 35, 350) + 'ms';
    g.append(card);
  });
  return g;
}
