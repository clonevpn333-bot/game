/* Hub bootstrap: validate the private key in the URL, build the chrome, route. */
import { h, icon } from './ui/dom.js';
import { parsePath, currentKey, adoptKey, isRetired, restoreKey, hubURL } from './session.js';
import { initStore } from './store.js';
import { loadManifest } from './manifest.js';
import { createRouter } from './router.js';
import { libraryView } from './views/library.js';
import { detailView } from './views/detail.js';
import { playerView } from './views/player.js';
import { openLinkSheet } from './ui/linksheet.js';
import { toast } from './ui/toast.js';

const app = document.getElementById('app');

function retiredScreen(key) {
  document.body.append(h('div', { class: 'empty view', style: { paddingTop: '22vh' } },
    h('div', { class: 'eyebrow' }, 'Retired link'),
    h('h2', { class: 'serif' }, 'This link no longer opens the arcade'),
    h('p', {}, 'It was regenerated on this device. Open your current link, or restore this one.'),
    h('div', { class: 'sheet__row', style: { justifyContent: 'center' } },
      h('a', { class: 'btn btn--primary', href: hubURL(currentKey()) }, 'Go to my arcade'),
      h('button', { class: 'btn btn--ghost', onclick: () => { restoreKey(key); location.reload(); } }, 'Restore this link'))));
}

async function boot() {
  let { key } = parsePath();
  if (!key) {
    key = currentKey();
    history.replaceState({}, '', hubURL(key));
  }
  if (isRetired(key)) { retiredScreen(key); return; }
  adoptKey(key);
  initStore(key);

  await loadManifest();

  const searchInput = h('input', { type: 'search', placeholder: 'Search games', spellcheck: 'false', 'aria-label': 'Search games' });
  let searchHandler = () => {};
  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => searchHandler(searchInput.value), 130);
  });

  const chrome = h('header', { class: 'chrome' },
    h('a', { class: 'brand', href: '#', onclick: (e) => { e.preventDefault(); router.to(''); } },
      h('span', { class: 'brand__mark' }, 'Nova ', h('em', {}, 'Arcade')),
      h('span', { class: 'brand__sub' }, 'private')),
    h('nav', { class: 'navlinks' },
      h('a', { class: 'navlink', href: '#', onclick: (e) => { e.preventDefault(); router.to(''); } }, 'Library'),
      h('a', { class: 'navlink', href: '#', onclick: (e) => { e.preventDefault(); history.pushState({}, '', `?cat=coop#/h/${router.key}`); router.paint(); } }, 'Co-op'),
      h('a', { class: 'navlink', href: '#', onclick: (e) => { e.preventDefault(); openLinkSheet(); } }, 'My link')),
    h('span', { class: 'chrome__spacer' }),
    h('label', { class: 'field' }, icon('search'), searchInput),
    h('button', { class: 'btn btn--ghost btn--icon', 'aria-label': 'Private link', onclick: openLinkSheet }, icon('link')));
  document.body.prepend(chrome);

  addEventListener('scroll', () => chrome.classList.toggle('is-stuck', scrollY > 12), { passive: true });

  const router = createRouter({
    key,
    mount: app,
    render(ctx) {
      ctx.onSearch = (fn) => { searchHandler = fn; };
      const [head, id] = ctx.parts;
      if (head === 'g' && id) return detailView(ctx, id);
      if (head === 'play' && id) return playerView(ctx, id);
      searchInput.value = ctx.query.q || '';
      return libraryView(ctx);
    },
  });

  addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) { e.preventDefault(); searchInput.focus(); }
  });

  router.paint();
  if (!sessionStorage.getItem('nova.greeted')) {
    sessionStorage.setItem('nova.greeted', '1');
    setTimeout(() => toast('Press / to search'), 1400);
  }
}

boot().catch((err) => {
  console.error(err);
  app.append(h('div', { class: 'empty' }, h('h2', { class: 'serif' }, 'The arcade failed to load'),
    h('p', {}, String(err.message || err))));
});
