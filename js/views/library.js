import { h, icon } from '../ui/dom.js';
import { rail, grid } from '../ui/rail.js';
import { hero } from '../ui/hero.js';
import { games, featured, categories, search, isNew, gameById } from '../manifest.js';
import { recents, favorites, totalPlays } from '../store.js';

/* The library view: hero + rails, or a filtered grid when searching/filtering. */
export function libraryView(ctx) {
  const root = h('div', { class: 'view' });
  const all = games();

  const filterBar = h('div', { class: 'rail__track', style: { gridAutoColumns: 'max-content', paddingTop: '2px' } });
  const results = h('div', {});

  const state = { cat: ctx.query.cat || 'all', q: ctx.query.q || '' };

  categories().forEach((c) => {
    const chip = h('button', {
      class: 'chip', 'aria-pressed': String(state.cat === c.id),
      onclick: () => { state.cat = c.id; ctx.setQuery({ cat: c.id === 'all' ? null : c.id }); paint(); },
    }, c.label);
    chip.dataset.cat = c.id;
    filterBar.append(chip);
  });

  function paint() {
    [...filterBar.children].forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.cat === state.cat)));
    results.replaceChildren();
    const filtering = state.q.trim() || state.cat !== 'all';

    if (!filtering) {
      const recentGames = recents().map(gameById).filter(Boolean);
      const favGames = favorites().map(gameById).filter(Boolean);
      const fresh = all.filter(isNew);
      const rails = [
        recentGames.length && rail('Continue playing', recentGames, { go: ctx.go, showProgress: true }),
        favGames.length && rail('Your favourites', favGames, { go: ctx.go }),
        fresh.length && rail('New this month', fresh, { go: ctx.go, variant: 'wide' }),
        rail('Everything in the arcade', all, { go: ctx.go }),
      ].filter(Boolean);
      rails.forEach((r) => results.append(r));
      results.append(h('section', { class: 'rail' },
        h('div', { class: 'rail__head' }, h('h2', {}, 'Browse by category')),
        filterBar));
      for (const c of categories().filter((c) => c.id !== 'all')) {
        const list = all.filter((g) => g.category === c.id);
        const r = rail(c.label, list, { go: ctx.go });
        if (r) results.append(r);
      }
    } else {
      let list = state.q.trim() ? search(state.q) : all;
      if (state.cat !== 'all') list = list.filter((g) => g.category === state.cat);
      results.append(h('section', { class: 'rail' },
        h('div', { class: 'rail__head' },
          h('h2', {}, state.q ? `Results for “${state.q}”` : categories().find((c) => c.id === state.cat).label),
          h('span', { class: 'rail__count' }, String(list.length).padStart(2, '0'))),
        filterBar));
      results.append(list.length ? grid(list, { go: ctx.go }) : h('div', { class: 'empty' },
        h('h2', { class: 'serif' }, 'Nothing here yet'),
        h('p', {}, 'Try another word, or clear the filter.')));
    }
  }

  const feat = featured();
  const heroEl = hero(feat.length ? feat : all.slice(0, 3), { go: ctx.go });
  root.append(heroEl, results);

  ctx.onSearch((q) => { state.q = q; paint(); });
  document.addEventListener('nova:favchange', paint);
  root.destroy = () => { heroEl.destroy?.(); document.removeEventListener('nova:favchange', paint); };

  paint();

  root.append(h('footer', { class: 'foot' },
    h('span', {}, `${all.length} games · ${totalPlays()} sessions played`),
    h('span', { class: 'foot__spacer' }),
    h('button', { class: 'btn btn--ghost', onclick: () => ctx.go.to(`play/${all[Math.floor(Math.random() * all.length)].id}`) },
      icon('shuffle'), 'Surprise me')));

  return root;
}
