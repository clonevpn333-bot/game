/**
 * App shell bootstrap (§2.1 / §2.3).
 *
 * The shell is static HTML+CSS that paints before this module parses; all this
 * does is hydrate the grid from games.json, wire the router, and register the
 * service worker. Nothing here blocks first paint.
 */

import * as router from './router.js';
import * as catalog from './catalog.js';
import * as views from './views.js';
import * as storage from './storage.js';
import { detect } from './capabilities.js';

const boot = performance.now();
let deferredInstall = null;

/**
 * Webfonts are an enhancement, never a gate. Loading the stylesheet from the
 * shell means a slow or blocked font host costs nothing at first paint, and the
 * fallback stack carries the page until the faces arrive.
 */
function loadFonts() {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap';
  link.media = 'print';
  link.addEventListener('load', () => { link.media = 'all'; }, { once: true });
  document.head.append(link);
}

async function main() {
  detect();                       // one probe, cached for the session
  loadFonts();
  wireChrome();
  registerServiceWorker();

  try {
    await catalog.load();
  } catch (err) {
    document.getElementById('view').innerHTML = '';
    document.getElementById('view').append(
      views.el('div', { class: 'detail' },
        views.el('h1', { text: 'Library unavailable' }),
        views.el('p', { class: 'sub', text: err.message }),
        views.el('button', { class: 'btn btn--primary', onclick: () => location.reload(), text: 'Retry' }),
      ));
    return;
  }

  router.route('/', async () => { await views.teardownPlayer(); await views.renderLibrary(); });
  router.route('/game/:id', async ({ id }) => { await views.teardownPlayer(); await views.renderDetails(id); });
  router.route('/play/:id', async ({ id }, { query }) => {
    await views.teardownPlayer();
    await views.renderPlayer(id, { fresh: query.fresh === '1' });
  });
  router.route('/links', async () => { await views.teardownPlayer(); await views.renderLinks(); });
  router.route('/diagnostics', async () => { await views.teardownPlayer(); await views.renderDiagnostics(); });
  router.route('*', async () => { await views.teardownPlayer(); views.renderNotFound(); });

  await router.start((path) => {
    document.body.dataset.route = path.split('/')[1] || 'library';
    const search = document.getElementById('search');
    if (search) search.hidden = !(path === '/');
  });

  // Persistent storage keeps saves and cached bundles from being the first
  // thing evicted when the device runs low on disk.
  storage.requestPersistence();

  performance.mark('portal-interactive');
  console.info(`[portal] interactive in ${Math.round(performance.now() - boot)} ms`);
  document.dispatchEvent(new CustomEvent('portal:ready', { detail: { ms: performance.now() - boot } }));
}

function wireChrome() {
  const search = document.getElementById('search');
  let debounce = 0;
  search?.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      if (router.currentPath() === '/') views.renderLibrary(search.value);
    }, 120);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && document.body.dataset.route === 'library') {
      e.preventDefault();
      search?.focus();
      search?.select();
    }
    if (e.key === 'Escape' && document.activeElement === search && search.value) {
      search.value = '';
      views.renderLibrary('');
    }
    // Backspace out of a game only when nothing has focus inside the frame.
    if (e.key === 'Escape' && document.body.dataset.route === 'play' && !document.pointerLockElement) {
      router.navigate('/');
    }
  });

  const net = document.getElementById('net-badge');
  const updateNet = () => {
    net.hidden = navigator.onLine;
    net.textContent = 'Offline — cached games only';
  };
  window.addEventListener('online', updateNet);
  window.addEventListener('offline', updateNet);
  updateNet();

  const install = document.getElementById('install');
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    install.hidden = false;
  });
  install?.addEventListener('click', async () => {
    if (!deferredInstall) return;
    install.hidden = true;
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
  });
  window.addEventListener('appinstalled', () => { install.hidden = true; deferredInstall = null; });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  // A single-file build has no sw.js to point at, and nothing to precache that
  // is not already in the page.
  if (document.getElementById('catalog-data')) return;
  // Registration after load: it must never compete with first paint.
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).then((reg) => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) showUpdateToast(reg);
        });
      });
    }).catch((err) => console.warn('[portal] service worker registration failed:', err));
  });
}

function showUpdateToast(reg) {
  const toast = views.el('div', { class: 'toast', role: 'status' },
    views.el('span', { text: 'A new version of the portal is ready.' }),
    views.el('button', {
      class: 'btn btn--primary btn--sm',
      onclick: () => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
        navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      },
      text: 'Reload',
    }),
    views.el('button', { class: 'btn btn--quiet btn--sm', onclick: () => toast.remove(), text: 'Later' }),
  );
  document.body.append(toast);
}

main().catch((err) => console.error('[portal] boot failed', err));
